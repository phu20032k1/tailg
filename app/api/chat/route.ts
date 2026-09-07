import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { readSessionToken, SESSION_COOKIE } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

async function sessionFrom(request: NextRequest) {
  return readSessionToken(request.cookies.get(SESSION_COOKIE)?.value);
}

export async function GET(request: NextRequest) {
  const session = await sessionFrom(request);
  if (!session) return NextResponse.json({ error: "Phiên đăng nhập đã hết hạn." }, { status: 401 });
  const db = getSupabaseAdmin();
  const peerId = request.nextUrl.searchParams.get("peer");

  if (!peerId) {
    const [{ data: users, error: userError }, { data: unread, error: unreadError }, { data: latest, error: latestError }] = await Promise.all([
      db.from("app_users").select("id,full_name,role").eq("active", true).neq("id", session.id).order("full_name"),
      db.from("chat_messages").select("sender_id").eq("recipient_id", session.id).is("read_at", null),
      db.from("chat_messages").select("id,sender_id,recipient_id,message,created_at").or(`sender_id.eq.${session.id},recipient_id.eq.${session.id}`).order("created_at", { ascending: false }).limit(100)
    ]);
    if (userError) throw userError;
    if (unreadError) throw unreadError;
    if (latestError) throw latestError;

    const unreadMap = new Map<string, number>();
    for (const row of unread || []) unreadMap.set(row.sender_id, (unreadMap.get(row.sender_id) || 0) + 1);
    const latestMap = new Map<string, { message: string; created_at: string }>();
    for (const row of latest || []) {
      const otherId = row.sender_id === session.id ? row.recipient_id : row.sender_id;
      if (!latestMap.has(otherId)) latestMap.set(otherId, { message: row.message, created_at: row.created_at });
    }

    return NextResponse.json({
      users: (users || []).map((user) => ({ ...user, unread: unreadMap.get(user.id) || 0, latest: latestMap.get(user.id) || null })),
      totalUnread: [...unreadMap.values()].reduce((sum, value) => sum + value, 0)
    });
  }

  const { data: peer, error: peerError } = await db.from("app_users").select("id,full_name,role").eq("id", peerId).eq("active", true).maybeSingle();
  if (peerError) throw peerError;
  if (!peer) return NextResponse.json({ error: "Không tìm thấy người nhận." }, { status: 404 });

  const { data, error } = await db
    .from("chat_messages")
    .select("id,sender_id,recipient_id,message,read_at,created_at")
    .or(`and(sender_id.eq.${session.id},recipient_id.eq.${peerId}),and(sender_id.eq.${peerId},recipient_id.eq.${session.id})`)
    .order("created_at", { ascending: true })
    .limit(120);
  if (error) throw error;
  return NextResponse.json({ peer, messages: data || [] });
}

const sendSchema = z.object({ recipientId: z.string().uuid(), message: z.string().trim().min(1).max(2000) });

export async function POST(request: NextRequest) {
  const session = await sessionFrom(request);
  if (!session) return NextResponse.json({ error: "Phiên đăng nhập đã hết hạn." }, { status: 401 });
  try {
    const body = sendSchema.parse(await request.json());
    if (body.recipientId === session.id) return NextResponse.json({ error: "Không thể tự nhắn cho chính mình." }, { status: 400 });
    const db = getSupabaseAdmin();
    const { data: recipient, error: recipientError } = await db.from("app_users").select("id").eq("id", body.recipientId).eq("active", true).maybeSingle();
    if (recipientError) throw recipientError;
    if (!recipient) return NextResponse.json({ error: "Người nhận không tồn tại." }, { status: 404 });
    const { data, error } = await db.from("chat_messages").insert({ sender_id: session.id, recipient_id: body.recipientId, message: body.message }).select("id,sender_id,recipient_id,message,read_at,created_at").single();
    if (error) throw error;
    return NextResponse.json({ ok: true, message: data }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Nội dung tin nhắn chưa hợp lệ." }, { status: 400 });
    console.error("chat send", error);
    return NextResponse.json({ error: "Chưa gửi được tin nhắn." }, { status: 500 });
  }
}

const readSchema = z.object({ peerId: z.string().uuid() });

export async function PATCH(request: NextRequest) {
  const session = await sessionFrom(request);
  if (!session) return NextResponse.json({ error: "Phiên đăng nhập đã hết hạn." }, { status: 401 });
  try {
    const body = readSchema.parse(await request.json());
    const db = getSupabaseAdmin();
    const { error } = await db.from("chat_messages").update({ read_at: new Date().toISOString() }).eq("sender_id", body.peerId).eq("recipient_id", session.id).is("read_at", null);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Yêu cầu chưa hợp lệ." }, { status: 400 });
    console.error("chat read", error);
    return NextResponse.json({ error: "Chưa cập nhật được trạng thái tin nhắn." }, { status: 500 });
  }
}
