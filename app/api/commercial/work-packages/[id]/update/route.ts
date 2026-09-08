import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { readSessionToken, SESSION_COOKIE } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const schema = z.object({
  updateDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dailyQuantity: z.coerce.number().min(0),
  cumulativeQuantity: z.coerce.number().min(0),
  note: z.string().trim().max(600).optional()
});

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = await readSessionToken(request.cookies.get(SESSION_COOKIE)?.value);
  if (!session) return NextResponse.json({ error: "Phiên đăng nhập đã hết hạn." }, { status: 401 });
  try {
    const { id } = await context.params;
    const body = schema.parse(await request.json());
    const db = getSupabaseAdmin();
    const { data: item, error: itemError } = await db.from("work_packages").select("*").eq("id", id).maybeSingle();
    if (itemError) throw itemError;
    if (!item) return NextResponse.json({ error: "Không tìm thấy đầu mục tiến độ." }, { status: 404 });

    const leaderOwns = session.role === "leader" && item.owner_type === "team" && item.owner_name === session.fullName;
    if (!["commander", "khkt"].includes(session.role) && !leaderOwns) return NextResponse.json({ error: "Bạn không có quyền cập nhật đầu mục này." }, { status: 403 });
    const planned = Number(item.planned_quantity || 0);
    if (body.cumulativeQuantity > planned + 1e-9) return NextResponse.json({ error: `Khối lượng lũy kế không thể vượt khối lượng giao ${planned.toLocaleString("vi-VN")} ${item.unit}.` }, { status: 409 });

    const { data, error } = await db.from("work_package_updates").upsert({
      work_package_id: id,
      update_date: body.updateDate,
      daily_quantity: body.dailyQuantity,
      cumulative_quantity: body.cumulativeQuantity,
      note: body.note || null,
      updated_by: session.id
    }, { onConflict: "work_package_id,update_date" }).select("*").single();
    if (error) throw error;

    const status = body.cumulativeQuantity >= planned ? "completed" : body.cumulativeQuantity > 0 ? "in_progress" : "not_started";
    await db.from("work_packages").update({ current_quantity: body.cumulativeQuantity, status, updated_at: new Date().toISOString() }).eq("id", id);
    return NextResponse.json({ ok: true, update: data });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Thông tin tiến độ ngày chưa hợp lệ." }, { status: 400 });
    console.error("work package update", error);
    return NextResponse.json({ error: "Chưa thể cập nhật tiến độ đầu mục." }, { status: 500 });
  }
}