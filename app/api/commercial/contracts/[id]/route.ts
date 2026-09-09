import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { readSessionToken, SESSION_COOKIE } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const schema = z.object({
  companyGroup: z.string().trim().max(200).optional().nullable(),
  contractNo: z.string().trim().max(200).optional().nullable(),
  scope: z.string().trim().max(500).optional().nullable(),
  afterTaxValue: z.coerce.number().min(0),
  boqBudgetValue: z.coerce.number().min(0),
  contractQuantity: z.coerce.number().min(0),
  quantityUnit: z.string().trim().max(50).optional().nullable(),
  budgetNote: z.string().trim().max(1000).optional().nullable()
});

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = await readSessionToken(request.cookies.get(SESSION_COOKIE)?.value);
  if (!session) return NextResponse.json({ error: "Phiên đăng nhập đã hết hạn." }, { status: 401 });
  if (!["commander", "khkt"].includes(session.role)) return NextResponse.json({ error: "Chỉ Ban điều hành hoặc Phòng KTKT được sửa khai báo hợp đồng." }, { status: 403 });

  try {
    const { id } = await context.params;
    const body = schema.parse(await request.json());
    const db = getSupabaseAdmin();
    const { data: current, error: currentError } = await db.from("commercial_contracts").select("id,contract_kind").eq("id", id).maybeSingle();
    if (currentError) throw currentError;
    if (!current || current.contract_kind !== "subcontract") return NextResponse.json({ error: "Không tìm thấy hợp đồng nhà thầu phụ." }, { status: 404 });

    const clean = (value?: string | null) => value?.trim() ? value.trim() : null;
    const { data, error } = await db.from("commercial_contracts").update({
      company_group: clean(body.companyGroup),
      contract_no: clean(body.contractNo),
      scope: clean(body.scope),
      after_tax_value: body.afterTaxValue,
      boq_budget_value: body.boqBudgetValue,
      contract_quantity: body.contractQuantity,
      quantity_unit: clean(body.quantityUnit),
      budget_note: clean(body.budgetNote),
      updated_at: new Date().toISOString()
    }).eq("id", id).select("*").single();
    if (error) throw error;
    return NextResponse.json({ ok: true, contract: data });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Dữ liệu hợp đồng chưa hợp lệ." }, { status: 400 });
    console.error("update subcontract contract", error);
    return NextResponse.json({ error: "Chưa thể cập nhật khai báo hợp đồng." }, { status: 500 });
  }
}
