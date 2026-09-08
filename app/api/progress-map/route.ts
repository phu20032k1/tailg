import { NextRequest, NextResponse } from "next/server";
import { readSessionToken, SESSION_COOKIE } from "@/lib/auth";
import { ensureStorageBucket, getSupabaseAdmin, STORAGE_BUCKET } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  const session = await readSessionToken(request.cookies.get(SESSION_COOKIE)?.value);
  if (!session) return NextResponse.json({ error: "Phiên đăng nhập đã hết hạn." }, { status: 401 });
  if (session.role !== "commander") return NextResponse.json({ error: "Chỉ huy trưởng mới được cập nhật mặt bằng." }, { status: 403 });
  try {
    const form = await request.formData();
    const file = form.get("file");
    const stage = String(form.get("stage") || "").trim();
    const title = String(form.get("title") || stage).trim();
    if (!(file instanceof File) || !stage) return NextResponse.json({ error: "Thiếu ảnh mặt bằng hoặc giai đoạn." }, { status: 400 });
    if (!file.type.startsWith("image/")) return NextResponse.json({ error: "Mặt bằng phải là file ảnh." }, { status: 400 });
    if (file.size > 20 * 1024 * 1024) return NextResponse.json({ error: "Ảnh mặt bằng tối đa 20 MB." }, { status: 400 });
    await ensureStorageBucket();
    const db = getSupabaseAdmin();
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const safeStage = stage.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase();
    const path = `progress-maps/${safeStage}-${Date.now()}.${ext}`;
    const bytes = new Uint8Array(await file.arrayBuffer());
    const { error: uploadError } = await db.storage.from(STORAGE_BUCKET).upload(path, bytes, { contentType: file.type, upsert: false });
    if (uploadError) throw uploadError;
    const { data: old } = await db.from("progress_maps").select("storage_path").eq("work_stage", stage).maybeSingle();
    const { error: upsertError } = await db.from("progress_maps").upsert({ work_stage: stage, title: title || stage, storage_path: path, created_by: session.id, updated_at: new Date().toISOString() }, { onConflict: "work_stage" });
    if (upsertError) throw upsertError;
    if (old?.storage_path && old.storage_path !== path) await db.storage.from(STORAGE_BUCKET).remove([old.storage_path]);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Chưa thể lưu mặt bằng." }, { status: 500 });
  }
}
