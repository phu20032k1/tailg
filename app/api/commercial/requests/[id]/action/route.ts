import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { readSessionToken, SESSION_COOKIE } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const schema = z.object({
  action: z.enum(["submit", "khkt_approve", "director_approve", "mark_paid", "return", "cancel"]),
  note: z.string().trim().max(800).optional(),
  amountPaid: z.coerce.number().min(0).optional()
});

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = await readSessionToken(request.cookies.get(SESSION_COOKIE)?.value);
  if (!session) return NextResponse.json({ error: "Phiên đăng nhập đã hết hạn." }, { status: 401 });
  try {
    const { id } = await context.params;
    const body = schema.parse(await request.json());
    const db = getSupabaseAdmin();
    const { data: row, error } = await db.from("payment_requests").select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    if (!row) return NextResponse.json({ error: "Không tìm thấy hồ sơ thanh toán." }, { status: 404 });

    const now = new Date().toISOString();
    const patch: Record<string, unknown> = { updated_at: now };
    let eventAction = body.action;

    if (body.action === "submit") {
      if (session.role !== "commander" || !["draft", "returned"].includes(row.status)) return NextResponse.json({ error: "Hồ sơ không ở trạng thái có thể gửi Phòng KTKT." }, { status: 403 });
      patch.status = "khkt_review"; patch.submitted_by = session.id; patch.submitted_at = now; patch.returned_reason = null; patch.returned_at = null; patch.returned_by = null;
    } else if (body.action === "khkt_approve") {
      if (session.role !== "khkt" || row.status !== "khkt_review") return NextResponse.json({ error: "Chỉ Phòng KTKT được kiểm tra hồ sơ ở bước này." }, { status: 403 });
      patch.status = "director_review"; patch.khkt_reviewed_by = session.id; patch.khkt_reviewed_at = now;
    } else if (body.action === "director_approve") {
      if (session.role !== "director" || row.status !== "director_review") return NextResponse.json({ error: "Chỉ Ban Giám đốc được duyệt hồ sơ ở bước này." }, { status: 403 });
      patch.status = "finance_payment"; patch.director_approved_by = session.id; patch.director_approved_at = now;
    } else if (body.action === "mark_paid") {
      if (session.role !== "finance" || row.status !== "finance_payment") return NextResponse.json({ error: "Chỉ Phòng Tài chính - Kế toán được xác nhận thanh toán." }, { status: 403 });
      patch.status = "paid"; patch.finance_paid_by = session.id; patch.finance_paid_at = now; patch.amount_paid = body.amountPaid ?? Number(row.amount_requested || 0);
    } else if (body.action === "return") {
      const allowed = (session.role === "khkt" && row.status === "khkt_review") || (session.role === "director" && row.status === "director_review") || (session.role === "finance" && row.status === "finance_payment");
      if (!allowed) return NextResponse.json({ error: "Bạn không thể trả lại hồ sơ ở trạng thái hiện tại." }, { status: 403 });
      if (!body.note) return NextResponse.json({ error: "Vui lòng ghi rõ lý do trả lại hồ sơ." }, { status: 400 });
      patch.status = "returned"; patch.returned_by = session.id; patch.returned_at = now; patch.returned_reason = body.note;
    } else if (body.action === "cancel") {
      if (session.role !== "commander" || !["draft", "returned"].includes(row.status)) return NextResponse.json({ error: "Chỉ Ban điều hành được hủy hồ sơ chưa trình duyệt." }, { status: 403 });
      patch.status = "cancelled";
    }

    const { data: updated, error: updateError } = await db.from("payment_requests").update(patch).eq("id", id).select("*").single();
    if (updateError) throw updateError;
    await db.from("payment_approval_events").insert({ request_id: id, actor_id: session.id, action: eventAction, note: body.note || null });
    return NextResponse.json({ ok: true, request: updated });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Yêu cầu duyệt chưa hợp lệ." }, { status: 400 });
    console.error("payment action", error);
    return NextResponse.json({ error: "Chưa thể cập nhật hồ sơ thanh toán." }, { status: 500 });
  }
}