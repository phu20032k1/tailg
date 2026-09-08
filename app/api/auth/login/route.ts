import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { createSessionToken, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { Role, SessionUser } from "@/lib/types";

const schema = z.object({
  username: z.string().trim().min(2).max(40),
  pin: z.string().trim().min(4).max(40)
});

const ALLOWED_ROLES = new Set<Role>(["commander", "leader", "khkt", "director", "finance"]);

type LoginRow = {
  id: string;
  username: string;
  full_name: string;
  role: Role;
  pin_hash?: string;
};

export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());
    const db = getSupabaseAdmin();
    const username = body.username.toLowerCase();

    const { data, error } = await db
      .from("app_users")
      .select("id,username,full_name,role,pin_hash")
      .eq("username", username)
      .eq("active", true)
      .maybeSingle();

    if (error) {
      console.error("login user lookup:", error.message);
      return NextResponse.json({ ok: false, code: "ACCOUNT_TABLE_ERROR", error: "Hệ thống đăng nhập đang bận. Vui lòng thử lại sau." }, { status: 503 });
    }

    let row = data as LoginRow | null;
    let validPin = false;
    let rpcAvailable = true;

    if (row?.pin_hash) {
      try { validPin = await bcrypt.compare(body.pin, row.pin_hash); } catch (error) { console.error("PIN bcrypt verify:", error); }
    }

    if (!validPin) {
      const { data: rpcRows, error: rpcError } = await db.rpc("authenticate_user", { p_username: username, p_pin: body.pin });
      if (!rpcError && Array.isArray(rpcRows) && rpcRows.length > 0) {
        const rpcUser = rpcRows[0] as LoginRow;
        row = { id: rpcUser.id, username: rpcUser.username, full_name: rpcUser.full_name, role: rpcUser.role };
        validPin = true;
      } else if (rpcError) {
        rpcAvailable = false;
        console.error("authenticate_user fallback:", rpcError.message);
      }
    }

    if (!row) return NextResponse.json({ ok: false, code: "ACCOUNT_NOT_SEEDED", error: "Tài khoản chưa được kích hoạt. Vui lòng liên hệ người quản lý." }, { status: 503 });
    if (!ALLOWED_ROLES.has(row.role)) return NextResponse.json({ ok: false, code: "ACCOUNT_ROLE_INVALID", error: "Tài khoản chưa được phân quyền hợp lệ." }, { status: 403 });
    if (!validPin) return NextResponse.json({ ok: false, code: rpcAvailable ? "INVALID_PIN" : "INVALID_PIN_OR_AUTH_RPC_MISSING", error: rpcAvailable ? "Mã PIN không đúng. Vui lòng kiểm tra lại." : "Chưa thể xác thực tài khoản lúc này. Vui lòng thử lại." }, { status: 401 });

    const user: SessionUser = { id: String(row.id), username: String(row.username), fullName: String(row.full_name), role: row.role };
    const token = await createSessionToken(user);
    const response = NextResponse.json({ ok: true, user });
    response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions);
    return response;
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ ok: false, code: "INVALID_LOGIN_INPUT", error: "Thông tin đăng nhập không hợp lệ." }, { status: 400 });
    const message = error instanceof Error ? error.message : "Unknown login error";
    console.error("login route:", message);
    return NextResponse.json({ ok: false, code: "LOGIN_INTERNAL_ERROR", error: "Không đăng nhập được lúc này. Vui lòng thử lại sau." }, { status: 500 });
  }
}