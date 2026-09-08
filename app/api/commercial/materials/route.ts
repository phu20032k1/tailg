import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { readSessionToken, SESSION_COOKIE } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const schema = z.object({
  materialName: z.string().trim().min(2).max(160),
  unit: z.string().trim().min(1).max(30),
  budgetQuantity: z.coerce.number().min(0),
  areaLabel: z.string().trim().max(160).optional(),
  contractorName: z.string().trim().max(180).optional(),
  note: z.string().trim().max(500).optional()
});

export async function POST(request: NextRequest) {
  const session = await readSessionToken(request.cookies.get(SESSION_COOKIE)?.value);
  if (!session) return NextResponse.json({ error: "Phiên đăng nhập đã hết hạn." }, { status: 401 });
  if (!["commander", "khkt"].includes(session.role)) return NextResponse.json({ error: "Bạn không có quyền khai báo định mức vật tư." }, { status: 403 });
  try {
    const body = schema.parse(await request.json());
    const db = getSupabaseAdmin();
    const payload = {
      material_name: body.materialName,
      unit: body.unit,
      budget_quantity: body.budgetQuantity,
      area_label: body.areaLabel || "Toàn dự án",
      contractor_name: body.contractorName || "",
      note: body.note || null,
      source_label: "Hệ thống TAILG",
      updated_at: new Date().toISOString()
    };
    const { data, error } = await db.from("material_budgets").upsert(payload, { onConflict: "material_name,unit,area_label,contractor_name" }).select("*").single();
    if (error) throw error;
    return NextResponse.json({ ok: true, material: data }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Thông tin định mức chưa hợp lệ." }, { status: 400 });
    console.error("material budget", error);
    return NextResponse.json({ error: "Chưa thể lưu định mức vật tư." }, { status: 500 });
  }
}