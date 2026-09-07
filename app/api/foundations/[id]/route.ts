import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    if (user.role !== "commander") return NextResponse.json({ error: "Bạn không có quyền sửa móng." }, { status: 403 });
    const { id } = await context.params;
    const body = await request.json();
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.code !== undefined) patch.code = String(body.code).trim().toUpperCase();
    if (body.zoneId !== undefined) patch.zone_id = body.zoneId;
    if (body.ownerId !== undefined) patch.owner_id = body.ownerId;
    if (body.progress !== undefined) patch.progress = Math.max(0, Math.min(100, Number(body.progress)));
    if (body.stage !== undefined) patch.current_stage = String(body.stage).trim() || "Chưa cập nhật";
    if (body.status !== undefined) patch.status = body.status;
    const db = getSupabaseAdmin();
    const { error } = await db.from("foundations").update(patch).eq("id", id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Chưa thể cập nhật móng." }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    if (user.role !== "commander") return NextResponse.json({ error: "Bạn không có quyền xóa móng." }, { status: 403 });
    const { id } = await context.params;
    const db = getSupabaseAdmin();
    const { error } = await db.from("foundations").delete().eq("id", id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Chưa thể xóa móng." }, { status: 500 });
  }
}
