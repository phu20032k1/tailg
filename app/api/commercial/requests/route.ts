import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { readSessionToken, SESSION_COOKIE } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const schema = z.object({
  contractId: z.string().uuid().nullable().optional(),
  workPackageId: z.string().uuid().nullable().optional(),
  quantityClaimed: z.coerce.number().positive().nullable().optional(),
  contractorName: z.string().trim().max(200).optional(),
  description: z.string().trim().min(3).max(1200),
  invoiceAmount: z.coerce.number().min(0).default(0),
  amountRequested: z.coerce.number().positive()
});

function requestCode() {
  const now = new Date();
  const stamp = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).format(now).replace(/\D/g, "");
  return `TT-${stamp}-${crypto.randomUUID().slice(0, 4).toUpperCase()}`;
}

export async function POST(request: NextRequest) {
  const session = await readSessionToken(request.cookies.get(SESSION_COOKIE)?.value);
  if (!session) return NextResponse.json({ error: "Phiên đăng nhập đã hết hạn." }, { status: 401 });
  if (session.role !== "commander") return NextResponse.json({ error: "Chỉ Ban điều hành được khởi tạo đề nghị thanh toán." }, { status: 403 });
  try {
    const body = schema.parse(await request.json());
    const db = getSupabaseAdmin();
    let workPackage: any = null;
    if (body.workPackageId) {
      const { data, error } = await db.from("work_packages").select("id,code,title,owner_type,owner_name,planned_quantity,unit").eq("id", body.workPackageId).maybeSingle();
      if (error) throw error;
      if (!data || data.owner_type !== "subcontractor") return NextResponse.json({ error: "Đầu việc nhà thầu phụ không hợp lệ." }, { status: 400 });
      if (!body.quantityClaimed) return NextResponse.json({ error: "Vui lòng nhập khối lượng đề nghị thanh toán của đầu việc." }, { status: 400 });
      workPackage = data;
      const { data: oldRows, error: oldError } = await db.from("payment_requests").select("quantity_claimed,status").eq("work_package_id", data.id).neq("status", "cancelled");
      if (oldError) throw oldError;
      const claimed = (oldRows || []).reduce((sum: number, row: any) => sum + Number(row.quantity_claimed || 0), 0);
      const planned = Number(data.planned_quantity || 0);
      if (planned > 0 && claimed + Number(body.quantityClaimed) > planned + 0.000001) {
        return NextResponse.json({ error: `DỪNG: khối lượng thanh toán vượt khối lượng giao. Đầu việc ${data.code} được giao ${planned.toLocaleString("vi-VN")} ${data.unit}, đã lập hồ sơ ${claimed.toLocaleString("vi-VN")} ${data.unit}, đề nghị thêm ${Number(body.quantityClaimed).toLocaleString("vi-VN")} ${data.unit}.` }, { status: 409 });
      }
    }

    const { data, error } = await db.from("payment_requests").insert({
      request_code: requestCode(), request_type: "subcontractor", contract_id: body.contractId || null,
      work_package_id: workPackage?.id || null, quantity_claimed: workPackage ? Number(body.quantityClaimed) : null, quantity_unit: workPackage?.unit || null,
      contractor_name: body.contractorName || workPackage?.owner_name || null, description: body.description,
      invoice_amount: body.invoiceAmount, amount_requested: body.amountRequested, status: "draft", submitted_by: session.id
    }).select("*").single();
    if (error) throw error;
    await db.from("payment_approval_events").insert({ request_id: data.id, actor_id: session.id, action: "created", note: workPackage ? `Ban điều hành khởi tạo hồ sơ · ${workPackage.code} · ${Number(body.quantityClaimed).toLocaleString("vi-VN")} ${workPackage.unit}` : "Ban điều hành khởi tạo hồ sơ" });
    return NextResponse.json({ ok: true, request: data }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Thông tin đề nghị thanh toán chưa hợp lệ." }, { status: 400 });
    console.error("create payment request", error);
    return NextResponse.json({ error: "Chưa thể tạo đề nghị thanh toán." }, { status: 500 });
  }
}
