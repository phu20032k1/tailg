import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { readSessionToken, SESSION_COOKIE } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const schema = z.object({
  username: z.string().trim().min(3).max(40).regex(/^[a-z0-9-]+$/),
  fullName: z.string().trim().min(3).max(160),
  role: z.enum(["khkt", "director", "finance"]),
  pin: z.string().trim().min(6).max(40)
});

export async function POST(request: NextRequest) {
  const session = await readSessionToken(request.cookies.get(SESSION_COOKIE)?.value);
  if (!session) return NextResponse.json({ error: "Phiên đăng nhập đã hết hạn." }, { status: 401 });
  if (session.role !== "commander") return NextResponse.json({ error: "Chỉ Chỉ huy trưởng được quản lý tài khoản phòng ban." }, { status: 403 });
  try {
    const body = schema.parse(await request.json());
    const db = getSupabaseAdmin();
    const pinHash = await bcrypt.hash(body.pin, 12);
    const payload = {
      username: body.username.toLowerCase(),
      full_name: body.fullName,
      role: body.role,
      pin_hash: pinHash,
      active: true,
      updated_at: new Date().toISOString()
    };
    const { data: existing, error: lookupError } = await db.from("app_users").select("id").eq("username", payload.username).maybeSingle();
    if (lookupError) throw lookupError;
    const result = existing
      ? await db.from("app_users").update(payload).eq("id", existing.id).select("id,username,full_name,role,active").single()
      : await db.from("app_users").insert(payload).select("id,username,full_name,role,active").single();
    if (result.error) throw result.error;
    return NextResponse.json({ ok: true, account: result.data });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Thông tin tài khoản hoặc mã PIN chưa hợp lệ." }, { status: 400 });
    console.error("department account setup", error);
    return NextResponse.json({ error: "Chưa thể lưu tài khoản phòng ban." }, { status: 500 });
  }
}