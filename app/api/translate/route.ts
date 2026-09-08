import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { readSessionToken, SESSION_COOKIE } from "@/lib/auth";

export const runtime = "nodejs";

const schema = z.object({ text: z.string().trim().min(1).max(2000) });

export async function POST(request: NextRequest) {
  const session = await readSessionToken(request.cookies.get(SESSION_COOKIE)?.value);
  if (!session) return NextResponse.json({ ok: false, error: "Phiên đăng nhập đã hết hạn." }, { status: 401 });

  try {
    const { text } = schema.parse(await request.json());
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);
    const url = new URL("https://translate.googleapis.com/translate_a/single");
    url.searchParams.set("client", "gtx");
    url.searchParams.set("sl", "vi");
    url.searchParams.set("tl", "zh-CN");
    url.searchParams.set("dt", "t");
    url.searchParams.set("q", text);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: { "user-agent": "TAILG-Site-Control/1.0" },
      cache: "no-store"
    });
    clearTimeout(timeout);
    if (!response.ok) throw new Error("translation_unavailable");

    const data = await response.json();
    const translated = Array.isArray(data?.[0])
      ? data[0].map((part: unknown) => Array.isArray(part) ? String(part[0] || "") : "").join("").trim()
      : "";
    if (!translated) throw new Error("translation_empty");
    return NextResponse.json({ ok: true, translatedText: translated });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ ok: false, error: "Nội dung cần dịch chưa hợp lệ." }, { status: 400 });
    console.error("translate vi-zh:", error);
    return NextResponse.json({ ok: false, error: "Chưa thể dịch tự động. Bạn vẫn có thể nhập tiếng Trung thủ công." }, { status: 502 });
  }
}
