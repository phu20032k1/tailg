import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { readSessionToken, SESSION_COOKIE } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const schema = z.object({ label: z.string().trim().min(1).max(80) });

function slug(label: string) {
  const base = label.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 40) || "cot";
  return `${base}_${Date.now().toString(36)}`;
}

export async function POST(request: NextRequest) {
  const session = await readSessionToken(request.cookies.get(SESSION_COOKIE)?.value);
  if (!session) return NextResponse.json({ error: "Phiên đăng nhập đã hết hạn." }, { status: 401 });
  if (!["commander", "khkt"].includes(session.role)) return NextResponse.json({ error: "Bạn không có quyền thêm cột tiến độ." }, { status: 403 });
  try {
    const body = schema.parse(await request.json());
    const db = getSupabaseAdmin();
    const { data, error } = await db.from("progress_custom_columns").insert({ column_key: slug(body.label), label: body.label, created_by: session.id }).select("*").single();
    if (error) throw error;
    return NextResponse.json({ ok: true, column: data }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Tên cột chưa hợp lệ." }, { status: 400 });
    console.error("progress column", error);
    return NextResponse.json({ error: "Chưa thể thêm cột." }, { status: 500 });
  }
}
