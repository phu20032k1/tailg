import { NextRequest, NextResponse } from "next/server";
import { readSessionToken, SESSION_COOKIE } from "@/lib/auth";
import { getSupabaseAdmin, STORAGE_BUCKET } from "@/lib/supabase/admin";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif"
]);

function safeFileName(name: string) {
  const cleaned = name
    .normalize("NFKD")
    .replace(/[^\w.-]+/g, "-")
    .replace(/-+/g, "-")
    .slice(-90);
  return cleaned || "photo.jpg";
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await readSessionToken(request.cookies.get(SESSION_COOKIE)?.value);
  if (!session) {
    return NextResponse.json({ ok: false, error: "Phiên đăng nhập đã hết hạn." }, { status: 401 });
  }

  const { id: reportId } = await context.params;
  const db = getSupabaseAdmin();

  const { data: report, error: reportError } = await db
    .from("daily_reports")
    .select("id,leader_id,report_date")
    .eq("id", reportId)
    .maybeSingle();

  if (reportError || !report) {
    return NextResponse.json({ ok: false, error: "Không tìm thấy báo cáo." }, { status: 404 });
  }

  if (session.role === "leader" && report.leader_id !== session.id) {
    return NextResponse.json({ ok: false, error: "Bạn không có quyền tải ảnh cho báo cáo này." }, { status: 403 });
  }

  const form = await request.formData();
  const file = form.get("file");
  const caption = String(form.get("caption") || "").trim().slice(0, 300);

  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, error: "Chưa chọn ảnh." }, { status: 400 });
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      { ok: false, error: "Chỉ nhận JPG, PNG, WEBP, HEIC/HEIF." },
      { status: 400 }
    );
  }
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ ok: false, error: "Ảnh tối đa 10 MB." }, { status: 400 });
  }

  const path = `${report.leader_id}/${report.report_date}/${crypto.randomUUID()}-${safeFileName(file.name)}`;
  const bytes = await file.arrayBuffer();

  const { error: uploadError } = await db.storage.from(STORAGE_BUCKET).upload(path, bytes, {
    contentType: file.type,
    cacheControl: "3600",
    upsert: false
  });

  if (uploadError) {
    console.error("storage upload:", uploadError);
    return NextResponse.json({ ok: false, error: "Không tải được ảnh lên Storage." }, { status: 500 });
  }

  const { data: photo, error: insertError } = await db
    .from("report_photos")
    .insert({
      report_id: report.id,
      storage_path: path,
      caption: caption || null,
      created_by: session.id
    })
    .select("id,storage_path,caption,created_at")
    .single();

  if (insertError) {
    await db.storage.from(STORAGE_BUCKET).remove([path]);
    console.error("photo insert:", insertError);
    return NextResponse.json({ ok: false, error: "Không ghi được thông tin ảnh." }, { status: 500 });
  }

  const { data: signed } = await db.storage.from(STORAGE_BUCKET).createSignedUrl(path, 1800);

  return NextResponse.json(
    { ok: true, photo: { ...photo, signedUrl: signed?.signedUrl || null } },
    { status: 201 }
  );
}
