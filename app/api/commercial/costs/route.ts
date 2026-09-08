import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { readSessionToken, SESSION_COOKIE } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const schema = z.object({
  costDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  ownerType: z.enum(["ban", "team", "subcontractor", "project"]),
  ownerName: z.string().trim().min(2).max(180),
  category: z.enum(["material", "machine", "other", "labor"]),
  supplier: z.string().trim().max(180).optional(),
  invoiceNo: z.string().trim().max(120).optional(),
  description: z.string().trim().max(600).optional(),
  quantity: z.coerce.number().min(0).optional(),
  unit: z.string().trim().max(30).optional(),
  unitPrice: z.coerce.number().min(0).optional(),
  amount: z.coerce.number().min(0)
});

export async function POST(request: NextRequest) {
  const session = await readSessionToken(request.cookies.get(SESSION_COOKIE)?.value);
  if (!session) return NextResponse.json({ error: "Phiên đăng nhập đã hết hạn." }, { status: 401 });
  if (!["commander", "khkt", "finance"].includes(session.role)) return NextResponse.json({ error: "Bạn không có quyền cập nhật chi phí." }, { status: 403 });
  try {
    const body = schema.parse(await request.json());
    const db = getSupabaseAdmin();
    const { data, error } = await db.from("cost_entries").insert({
      cost_date: body.costDate,
      owner_type: body.ownerType,
      owner_name: body.ownerName,
      category: body.category,
      supplier: body.supplier || null,
      invoice_no: body.invoiceNo || null,
      description: body.description || null,
      quantity: body.quantity ?? null,
      unit: body.unit || null,
      unit_price: body.unitPrice ?? null,
      amount: body.amount,
      source_label: "Hệ thống TAILG",
      created_by: session.id
    }).select("*").single();
    if (error) throw error;
    return NextResponse.json({ ok: true, cost: data }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Thông tin chi phí chưa hợp lệ." }, { status: 400 });
    console.error("cost entry", error);
    return NextResponse.json({ error: "Chưa thể lưu chi phí." }, { status: 500 });
  }
}