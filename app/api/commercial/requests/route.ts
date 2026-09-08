import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { readSessionToken, SESSION_COOKIE } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const schema = z.object({
  contractId: z.string().uuid().nullable().optional(),
  contractorName: z.string().trim().max(200).optional(),
  description: z.string().trim().min(3).max(1200),
  invoiceAmount: z.coerce.number().min(0).default(0),
  amountRequested: z.coerce.number().positive()
});

function requestCode() {
  const now = new Date();
  const stamp = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })
    .format(now).replace(/\D/g, "");
  return `TT-${stamp}-${crypto.randomUUID().slice(0, 4).toUpperCase()}`;
}

export async function POST(request: NextRequest) {
  const session = await readSessionToken(request.cookies.get(SESSION_COOKIE)?.value);
  if (!session) return NextResponse.json({ error: "Phiên đăng nhập đã hết hạn." }, { status: 401 });
  if (session.role !== "commander") return NextResponse.json({ error: "Chỉ Ban điều hành được khởi tạo đề nghị thanh toán." }, { status: 403 });
  try {
    const body = schema.parse(await request.json());
    const db = getSupabaseAdmin();
    const { data, error } = await db.from("payment_requests").insert({
      request_code: requestCode(),
      request_type: "subcontractor",
      contract_id: body.contractId || null,
      contractor_name: body.contractorName || null,
      description: body.description,
      invoice_amount: body.invoiceAmount,
      amount_requested: body.amountRequested,
      status: "draft",
      submitted_by: session.id
    }).select("*").single();
    if (error) throw error;
    await db.from("payment_approval_events").insert({ request_id: data.id, actor_id: session.id, action: "created", note: "Ban điều hành khởi tạo hồ sơ" });
    return NextResponse.json({ ok: true, request: data }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Thông tin đề nghị thanh toán chưa hợp lệ." }, { status: 400 });
    console.error("create payment request", error);
    return NextResponse.json({ error: "Chưa thể tạo đề nghị thanh toán." }, { status: 500 });
  }
}