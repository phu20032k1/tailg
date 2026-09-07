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
      return NextResponse.json(
        {
          ok: false,
          code: "ACCOUNT_TABLE_ERROR",
          error: "Không đọc được bảng app_users trên Supabase. Mở /api/health để xem lỗi cấu hình."
        },
        { status: 503 }
      );
    }

    let row = data as LoginRow | null;
    let validPin = false;
    let rpcAvailable = true;

    // pgcrypto Blowfish hashes produced by seed.sql are bcrypt-compatible, so
    // verify locally first to avoid an unnecessary database round-trip.
    if (row?.pin_hash) {
      try {
        validPin = await bcrypt.compare(body.pin, row.pin_hash);
      } catch (error) {
        console.error("PIN bcrypt verify:", error);
      }
    }

    // Keep compatibility with existing Supabase projects that authenticate via
    // the security-definer RPC. This also verifies older pgcrypto hash variants.
    if (!validPin) {
      const { data: rpcRows, error: rpcError } = await db.rpc("authenticate_user", {
        p_username: username,
        p_pin: body.pin
      });

      if (!rpcError && Array.isArray(rpcRows) && rpcRows.length > 0) {
        const rpcUser = rpcRows[0] as LoginRow;
        row = {
          id: rpcUser.id,
          username: rpcUser.username,
          full_name: rpcUser.full_name,
          role: rpcUser.role
        };
        validPin = true;
      } else if (rpcError) {
        rpcAvailable = false;
        console.error("authenticate_user fallback:", rpcError.message);
      }
    }

    if (!row) {
      return NextResponse.json(
        {
          ok: false,
          code: "ACCOUNT_NOT_SEEDED",
          error: "Tài khoản chưa có trong Supabase. Cần chạy lại schema.sql → seed.sql → functions.sql."
        },
        { status: 503 }
      );
    }

    if (!validPin) {
      return NextResponse.json(
        {
          ok: false,
          code: rpcAvailable ? "INVALID_PIN" : "INVALID_PIN_OR_AUTH_RPC_MISSING",
          error: rpcAvailable
            ? "Mã PIN không đúng với dữ liệu đang lưu trong Supabase."
            : "PIN chưa xác thực được và hàm authenticate_user chưa sẵn sàng. Kiểm tra /api/health."
        },
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
        { ok: false, code: "INVALID_LOGIN_INPUT", error: "Thông tin đăng nhập không hợp lệ." },
        { status: 400 }
      );
    }

    const message = error instanceof Error ? error.message : "Unknown login error";
    console.error("login route:", message);

    if (message.includes("Missing SUPABASE_URL") || message.includes("SUPABASE_SECRET_KEY")) {
      return NextResponse.json(
        {
          ok: false,
          code: "SUPABASE_ENV_MISSING",
          error: "Vercel đang thiếu SUPABASE_URL hoặc Supabase Secret/Service Role key."
        },
        { status: 500 }
      );
    }

    if (message.includes("session signing secret") || message.includes("SESSION_SECRET")) {
      return NextResponse.json(
        {
          ok: false,
          code: "SESSION_SECRET_MISSING",
          error: "Vercel đang thiếu khóa ký phiên đăng nhập phía server."
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { ok: false, code: "LOGIN_INTERNAL_ERROR", error: "Lỗi hệ thống khi đăng nhập." },
      { status: 500 }
    );
  }
}
