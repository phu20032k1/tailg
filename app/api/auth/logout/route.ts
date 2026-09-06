import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth";

function clear(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0
  });
  return response;
}

export async function POST(request: Request) {
  return clear(NextResponse.redirect(new URL("/login", request.url), 303));
}

export async function GET(request: Request) {
  return clear(NextResponse.redirect(new URL("/login", request.url), 303));
}
