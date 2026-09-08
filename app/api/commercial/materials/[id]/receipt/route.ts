import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { readSessionToken, SESSION_COOKIE } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const schema = z.object({
  receiptDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  supplier: z.string().trim().max(180).optional(),
  invoiceNo: z.string().trim().max(120).optional(),
  quantity: z.coerce.number().positive(),
  unitPrice: z.coerce.number().min(0).default(0),
  batchLabel: z.string().trim().max(120).optional(),
  note: z.string().trim().max(500).optional()
});

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = await readSessionToken(request.cookies.get(SESSION_COOKIE)?.value);
  if (!session) return NextResponse.json({ error: "Phiên đăng nhập đã hết hạn." }, { status: 401 });
  if (!["commander", "khkt"].includes(session.role)) return NextResponse.json({ error: "Bạn không có quyền xác nhận vật tư nhập về." }, { status: 403 });
  try {
    const { id } = await context.params;
    const body = schema.parse(await request.json());
    const db = getSupabaseAdmin();
    const { data: budget, error: budgetError } = await db.from("material_budgets").select("*").eq("id", id).maybeSingle();
    if (budgetError) throw budgetError;
    if (!budget) return NextResponse.json({ error: "Không tìm thấy định mức vật tư." }, { status: 404 });

    const { data: existing, error: existingError } = await db.from("material_receipts").select("quantity").eq("material_budget_id", id);
    if (existingError) throw existingError;
    const received = (existing || []).reduce((sum, row) => sum + Number(row.quantity || 0), 0);
    const limit = Number(budget.budget_quantity || 0);
    if (limit <= 0) return NextResponse.json({ error: "Vật tư này chưa có định mức được duyệt. Cần cập nhật định mức trước khi xác nhận nhập." }, { status: 409 });
    if (received + body.quantity > limit + 1e-9) {
      return NextResponse.json({
        error: `DỪNG NHẬP: khối lượng sau lần này sẽ là ${(received + body.quantity).toLocaleString("vi-VN")} ${budget.unit}, vượt định mức ${limit.toLocaleString("vi-VN")} ${budget.unit}.`,
        code: "MATERIAL_BUDGET_EXCEEDED"
      }, { status: 409 });
    }

    const { data, error } = await db.from("material_receipts").insert({
      material_budget_id: id,
      receipt_date: body.receiptDate,
      supplier: body.supplier || null,
      invoice_no: body.invoiceNo || null,
      quantity: body.quantity,
      unit_price: body.unitPrice,
      source_scope: body.batchLabel || null,
      note: body.note || null,
      created_by: session.id
    }).select("*").single();
    if (error) throw error;
    return NextResponse.json({ ok: true, receipt: data, received: received + body.quantity, remaining: limit - received - body.quantity }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Thông tin lần nhập vật tư chưa hợp lệ." }, { status: 400 });
    console.error("material receipt", error);
    return NextResponse.json({ error: "Chưa thể lưu lần nhập vật tư." }, { status: 500 });
  }
}