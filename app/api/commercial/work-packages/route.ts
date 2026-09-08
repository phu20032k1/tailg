import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { readSessionToken, SESSION_COOKIE } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const schema = z.object({
  code: z.string().trim().min(2).max(80),
  title: z.string().trim().min(2).max(240),
  areaLabel: z.string().trim().max(180).optional(),
  ownerType: z.enum(["team", "subcontractor", "ban"]),
  ownerName: z.string().trim().min(2).max(180),
  plannedQuantity: z.coerce.number().positive(),
  unit: z.string().trim().min(1).max(30),
  weightPercent: z.coerce.number().min(0).max(100).default(0),
  plannedStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  plannedFinish: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
});

export async function POST(request: NextRequest) {
  const session = await readSessionToken(request.cookies.get(SESSION_COOKIE)?.value);
  if (!session) return NextResponse.json({ error: "Phiên đăng nhập đã hết hạn." }, { status: 401 });
  if (!["commander", "khkt"].includes(session.role)) return NextResponse.json({ error: "Bạn không có quyền giao đầu mục tiến độ." }, { status: 403 });
  try {
    const body = schema.parse(await request.json());
    const db = getSupabaseAdmin();
    const { data, error } = await db.from("work_packages").insert({
      code: body.code.toUpperCase(),
      title: body.title,
      area_label: body.areaLabel || null,
      owner_type: body.ownerType,
      owner_name: body.ownerName,
      planned_quantity: body.plannedQuantity,
      unit: body.unit,
      weight_percent: body.weightPercent,
      planned_start: body.plannedStart || null,
      planned_finish: body.plannedFinish || null,
      current_quantity: 0,
      status: "not_started"
    }).select("*").single();
    if (error?.code === "23505") return NextResponse.json({ error: "Mã đầu mục đã tồn tại." }, { status: 409 });
    if (error) throw error;
    return NextResponse.json({ ok: true, workPackage: data }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Thông tin đầu mục tiến độ chưa hợp lệ." }, { status: 400 });
    console.error("work package", error);
    return NextResponse.json({ error: "Chưa thể tạo đầu mục tiến độ." }, { status: 500 });
  }
}