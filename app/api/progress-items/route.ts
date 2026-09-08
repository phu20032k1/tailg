import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { readSessionToken, SESSION_COOKIE } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const schema = z.object({
  code: z.string().trim().min(1).max(80),
  itemType: z.enum(["foundation", "column", "slab", "floor", "other"]),
  zoneId: z.string().trim().min(1).max(100),
  ownerId: z.string().uuid(),
  workStage: z.string().trim().min(1).max(160),
  plannedStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
  plannedFinish: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
  actualStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
  actualFinish: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
  progress: z.coerce.number().min(0).max(100).default(0),
  mapX: z.coerce.number().min(0).max(100).optional().nullable(),
  mapY: z.coerce.number().min(0).max(100).optional().nullable(),
  note: z.string().trim().max(500).optional().default("")
});

export async function POST(request: NextRequest) {
  const session = await readSessionToken(request.cookies.get(SESSION_COOKIE)?.value);
  if (!session) return NextResponse.json({ error: "Phiên đăng nhập đã hết hạn." }, { status: 401 });
  if (session.role !== "commander") return NextResponse.json({ error: "Chỉ huy trưởng mới được cập nhật danh mục tiến độ." }, { status: 403 });
  try {
    const body = schema.parse(await request.json());
    const db = getSupabaseAdmin();
    const { data: zone, error: zoneError } = await db.from("zones").select("id,owner_id").eq("id", body.zoneId).maybeSingle();
    if (zoneError) throw zoneError;
    if (!zone) return NextResponse.json({ error: "Khu vực không tồn tại." }, { status: 400 });
    const status = body.progress >= 100 ? "completed" : body.progress > 0 ? "in_progress" : "not_started";
    const { data, error } = await db.from("progress_items").insert({
      code: body.code.toUpperCase(), item_type: body.itemType, zone_id: body.zoneId, owner_id: body.ownerId,
      work_stage: body.workStage, planned_start: body.plannedStart || null, planned_finish: body.plannedFinish || null,
      actual_start: body.actualStart || null, actual_finish: body.actualFinish || null,
      progress: body.progress, status, map_x: body.mapX ?? null, map_y: body.mapY ?? null, note: body.note || null
    }).select("id").single();
    if (error) {
      if (error.code === "23505") return NextResponse.json({ error: "Ký hiệu này đã tồn tại trong cùng khu vực và giai đoạn." }, { status: 409 });
      throw error;
    }
    return NextResponse.json({ ok: true, id: data.id }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Dữ liệu tiến độ chưa hợp lệ.", details: error.issues }, { status: 400 });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Chưa thể thêm hạng mục tiến độ." }, { status: 500 });
  }
}
