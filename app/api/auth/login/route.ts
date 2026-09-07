import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { createSessionToken, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { SessionUser } from "@/lib/types";

const schema = z.object({
  username: z.string().trim().min(2).max(40),
  pin: z.string().trim().min(4).max(40)
});

type LoginRow = {
  id: string;
  username: string;
  full_name: string;
  role: "commander" | "leader";
  pin_hash: string;
};

export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());
    const db = getSupabaseAdmin();
    const username = body.username.toLowerCase();

    // Verify the bcrypt hash in the Next.js server instead of calling the
    // authenticate_user() pgcrypto RPC. This makes production login independent
    // from the Supabase extension search_path and avoids crypt(text,text) errors.
    const { data, error } = await db
      .from("app_users")
      .select("id,username,full_name,role,pin_hash")
      .eq("username", username)
      .eq("active", true)
      .maybeSingle();

    if (error) {
      console.error("login user lookup:", error.message);
      return NextResponse.json(
        { ok: false, error: "Không kết nối được dữ liệu tài khoản. Kiểm tra Supabase trên Vercel." },
        { status: 500 }
      );
    }

    const row = data as LoginRow | null;
    if (!row) {
      return NextResponse.json(
        { ok: false, error: "Tài khoản hoặc PIN không đúng." },
        { status: 401 }
      );
    }

    let validPin = false;
    try {
      validPin = await bcrypt.compare(body.pin, row.pin_hash);
    } catch (error) {
      console.error("PIN hash verify:", error);
    }

    if (!validPin) {
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

    const message = error instanceof Error ? error.message : "Unknown login error";
    console.error("login route:", message);

    if (message.includes("Missing SUPABASE_URL") || message.includes("SUPABASE_SECRET_KEY")) {
      return NextResponse.json(
        { ok: false, error: "Vercel đang thiếu SUPABASE_URL hoặc SUPABASE_SECRET_KEY." },
        { status: 500 }
      );
    }

    if (message.includes("SESSION_SECRET")) {
      return NextResponse.json(
        { ok: false, error: "Vercel đang thiếu SESSION_SECRET hợp lệ (ít nhất 32 ký tự)." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { ok: false, error: "Lỗi hệ thống khi đăng nhập." },
      { status: 500 }
    );
  }
}
