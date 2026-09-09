import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { readSessionToken, SESSION_COOKIE } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const schema = z.object({
  code: z.string().trim().min(1).max(80),
  title: z.string().trim().min(2).max(220),
  areaLabel: z.string().trim().max(180).optional(),
  workCode: z.string().trim().min(1).max(80),
  quantity: z.coerce.number().nonnegative(),
  unit: z.string().trim().min(1).max(30),
  note: z.string().trim().max(500).optional()
});

export async function POST(request: NextRequest) {
  const session = await readSessionToken(request.cookies.get(SESSION_COOKIE)?.value);
  if (!session) return NextResponse.json({ error: "Phiên đăng nhập đã hết hạn." }, { status: 401 });
  if (!["commander", "khkt"].includes(session.role)) return NextResponse.json({ error: "Chỉ Ban điều hành / Phòng KTKT được nhập khối lượng thiết kế." }, { status: 403 });
  try {
    const body = schema.parse(await request.json());
    const db = getSupabaseAdmin();
    const { data, error } = await db.from("design_work_items").upsert({
      code: body.code.toUpperCase(), title: body.title, area_label: body.areaLabel || null,
      work_code: body.workCode.toUpperCase(), quantity: body.quantity, unit: body.unit,
      note: body.note || null, created_by: session.id, updated_at: new Date().toISOString()
    }, { onConflict: "code" }).select("*").single();
    if (error) throw error;
    return NextResponse.json({ ok: true, work: data }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Khối lượng thiết kế chưa hợp lệ." }, { status: 400 });
    console.error("design work", error);
    return NextResponse.json({ error: "Chưa thể lưu khối lượng thiết kế." }, { status: 500 });
  }
}
