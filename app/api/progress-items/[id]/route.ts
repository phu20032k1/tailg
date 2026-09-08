import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { readSessionToken, SESSION_COOKIE } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const patchSchema = z.object({
  code: z.string().trim().min(1).max(80).optional(),
  itemType: z.enum(["foundation", "column", "slab", "floor", "other"]).optional(),
  zoneId: z.string().trim().min(1).max(100).optional(),
  ownerId: z.string().uuid().optional(),
  workStage: z.string().trim().min(1).max(160).optional(),
  plannedStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
  plannedFinish: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
  actualStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
  actualFinish: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
  progress: z.coerce.number().min(0).max(100).optional(),
  mapX: z.coerce.number().min(0).max(100).optional().nullable(),
  mapY: z.coerce.number().min(0).max(100).optional().nullable(),
  note: z.string().trim().max(500).optional()
});

async function commander(request: NextRequest) {
  const session = await readSessionToken(request.cookies.get(SESSION_COOKIE)?.value);
  if (!session) return { error: NextResponse.json({ error: "Phiên đăng nhập đã hết hạn." }, { status: 401 }) };
  if (session.role !== "commander") return { error: NextResponse.json({ error: "Chỉ huy trưởng mới được cập nhật tiến độ." }, { status: 403 }) };
  return { session };
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await commander(request); if (auth.error) return auth.error;
  try {
    const { id } = await context.params;
    const body = patchSchema.parse(await request.json());
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.code !== undefined) patch.code = body.code.toUpperCase();
    if (body.itemType !== undefined) patch.item_type = body.itemType;
    if (body.zoneId !== undefined) patch.zone_id = body.zoneId;
    if (body.ownerId !== undefined) patch.owner_id = body.ownerId;
    if (body.workStage !== undefined) patch.work_stage = body.workStage;
    if (body.plannedStart !== undefined) patch.planned_start = body.plannedStart || null;
    if (body.plannedFinish !== undefined) patch.planned_finish = body.plannedFinish || null;
    if (body.actualStart !== undefined) patch.actual_start = body.actualStart || null;
    if (body.actualFinish !== undefined) patch.actual_finish = body.actualFinish || null;
    if (body.progress !== undefined) {
      patch.progress = body.progress;
      patch.status = body.progress >= 100 ? "completed" : body.progress > 0 ? "in_progress" : "not_started";
    }
    if (body.mapX !== undefined) patch.map_x = body.mapX;
    if (body.mapY !== undefined) patch.map_y = body.mapY;
    if (body.note !== undefined) patch.note = body.note || null;
    const db = getSupabaseAdmin();
    const { error } = await db.from("progress_items").update(patch).eq("id", id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Dữ liệu tiến độ chưa hợp lệ.", details: error.issues }, { status: 400 });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Chưa thể cập nhật tiến độ." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await commander(request); if (auth.error) return auth.error;
  try {
    const { id } = await context.params;
    const db = getSupabaseAdmin();
    const { error } = await db.from("progress_items").delete().eq("id", id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Chưa thể xóa hạng mục tiến độ." }, { status: 500 });
  }
}
