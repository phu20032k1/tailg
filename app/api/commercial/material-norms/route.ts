import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { readSessionToken, SESSION_COOKIE } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const schema = z.object({
  workCode: z.string().trim().min(1).max(80),
  workName: z.string().trim().min(2).max(200),
  workUnit: z.string().trim().min(1).max(30),
  materialName: z.string().trim().min(1).max(160),
  materialSpec: z.string().trim().max(120).optional(),
  materialUnit: z.string().trim().min(1).max(30),
  consumptionRate: z.coerce.number().positive(),
  wastePercent: z.coerce.number().min(0).max(100).default(0),
  sourceLabel: z.string().trim().max(200).optional(),
  note: z.string().trim().max(500).optional()
});

export async function POST(request: NextRequest) {
  const session = await readSessionToken(request.cookies.get(SESSION_COOKIE)?.value);
  if (!session) return NextResponse.json({ error: "Phiên đăng nhập đã hết hạn." }, { status: 401 });
  if (!["commander", "khkt"].includes(session.role)) return NextResponse.json({ error: "Chỉ Ban điều hành / Phòng KTKT được khai báo định mức." }, { status: 403 });
  try {
    const body = schema.parse(await request.json());
    const db = getSupabaseAdmin();
    const { data, error } = await db.from("material_norms").insert({
      work_code: body.workCode.toUpperCase(), work_name: body.workName, work_unit: body.workUnit,
      material_name: body.materialName, material_spec: body.materialSpec || null, material_unit: body.materialUnit,
      consumption_rate: body.consumptionRate, waste_percent: body.wastePercent,
      source_label: body.sourceLabel || null, note: body.note || null, created_by: session.id
    }).select("*").single();
    if (error) throw error;
    return NextResponse.json({ ok: true, norm: data }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Thông tin định mức chưa hợp lệ." }, { status: 400 });
    console.error("material norm", error);
    return NextResponse.json({ error: "Chưa thể lưu định mức vật tư." }, { status: 500 });
  }
}
