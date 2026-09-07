import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

function codesFromInput(input: string) {
  return [...new Set(input.split(/[\n,;]+/).map((v) => v.trim().toUpperCase()).filter(Boolean))];
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    if (user.role !== "commander") return NextResponse.json({ error: "Bạn không có quyền thêm móng." }, { status: 403 });
    const body = await request.json();
    const codes = codesFromInput(String(body.codes || ""));
    const zoneId = String(body.zoneId || "");
    const ownerId = String(body.ownerId || "");
    if (!codes.length || !zoneId || !ownerId) return NextResponse.json({ error: "Vui lòng nhập mã móng, khu vực và đội phụ trách." }, { status: 400 });
    const db = getSupabaseAdmin();
    const rows = codes.map((code) => ({ code, zone_id: zoneId, owner_id: ownerId, current_stage: "Chưa thi công", progress: 0, status: "not_started" }));
    const { data, error } = await db.from("foundations").insert(rows).select("id,code");
    if (error) {
      if (error.code === "23505") return NextResponse.json({ error: "Có mã móng đã tồn tại. Vui lòng kiểm tra lại." }, { status: 409 });
      throw error;
    }
    return NextResponse.json({ ok: true, count: data?.length || 0 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Chưa thể thêm móng." }, { status: 500 });
  }
}
