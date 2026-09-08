import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { readSessionToken, SESSION_COOKIE } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const schema = z.object({
  contractId: z.string().uuid(),
  description: z.string().trim().min(2).max(500),
  invoiceAmount: z.coerce.number().min(0).default(0),
  amountRequested: z.coerce.number().min(0).default(0),
  amountReceived: z.coerce.number().min(0).default(0),
  receivedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
});

export async function POST(request: NextRequest) {
  const session = await readSessionToken(request.cookies.get(SESSION_COOKIE)?.value);
  if (!session) return NextResponse.json({ error: "Phiên đăng nhập đã hết hạn." }, { status: 401 });
  if (!["commander", "finance"].includes(session.role)) return NextResponse.json({ error: "Chỉ Ban điều hành hoặc Phòng Tài chính - Kế toán được ghi nhận tiền về." }, { status: 403 });
  try {
    const body = schema.parse(await request.json());
    const db = getSupabaseAdmin();
    const stamp = body.receivedDate.replace(/-/g, "");
    const code = `CDT-${stamp}-${crypto.randomUUID().slice(0, 5).toUpperCase()}`;
    const receivedAt = `${body.receivedDate}T12:00:00+07:00`;
    const { data, error } = await db.from("payment_requests").insert({
      request_code: code,
      request_type: "owner_receivable",
      contract_id: body.contractId,
      contractor_name: "Chủ đầu tư dự án TAILG",
      description: body.description,
      invoice_amount: body.invoiceAmount,
      amount_requested: body.amountRequested,
      amount_paid: body.amountReceived,
      status: "paid",
      submitted_by: session.id,
      submitted_at: receivedAt,
      finance_paid_by: session.id,
      finance_paid_at: receivedAt
    }).select("*").single();
    if (error) throw error;
    await db.from("payment_approval_events").insert({ request_id: data.id, actor_id: session.id, action: "owner_receipt_recorded", note: body.description });
    return NextResponse.json({ ok: true, receipt: data }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Thông tin thanh toán chủ đầu tư chưa hợp lệ." }, { status: 400 });
    console.error("owner receipt", error);
    return NextResponse.json({ error: "Chưa thể ghi nhận thanh toán chủ đầu tư." }, { status: 500 });
  }
}