import { NextResponse } from "next/server";
import { z } from "zod";
import { createSessionToken, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { SessionUser } from "@/lib/types";

const schema = z.object({
  username: z.string().trim().min(2).max(40),
  pin: z.string().trim().min(4).max(40)
});

export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());
    const db = getSupabaseAdmin();

    const { data, error } = await db.rpc("authenticate_user", {
      p_username: body.username,
      p_pin: body.pin
    });

    if (error) {
      console.error("authenticate_user:", error.message);
      return NextResponse.json(
        { ok: false, error: "Không thể đăng nhập lúc này." },
        { status: 500 }
      );
    }

    const row = Array.isArray(data) ? data[0] : null;
    if (!row) {
      return NextResponse.json(
        { ok: false, error: "Tài khoản hoặc PIN không đúng." },
        { status: 401 }
      );
    }

    const user: SessionUser = {
      id: String(row.id),
      username: String(row.username),
      fullName: String(row.full_name),
      role: row.role === "commander" ? "commander" : "leader"
    };

    const token = await createSessionToken(user);
    const response = NextResponse.json({ ok: true, user });
    response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions);
    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { ok: false, error: "Thông tin đăng nhập không hợp lệ." },
        { status: 400 }
      );
    }

    console.error(error);
    return NextResponse.json(
      { ok: false, error: "Lỗi hệ thống." },
      { status: 500 }
    );
  }
}
