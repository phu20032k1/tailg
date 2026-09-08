import { NextRequest, NextResponse } from "next/server";
import { readSessionToken, SESSION_COOKIE } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { DOCUMENT_BUCKET } from "@/lib/commercial";

const MAX_FILE_SIZE = 20 * 1024 * 1024;
const ALLOWED = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
  "image/webp"
]);

function safeName(name: string) {
  return name.normalize("NFKD").replace(/[^\w.-]+/g, "-").replace(/-+/g, "-").slice(-120) || "hoso";
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = await readSessionToken(request.cookies.get(SESSION_COOKIE)?.value);
  if (!session) return NextResponse.json({ error: "Phiên đăng nhập đã hết hạn." }, { status: 401 });
  if (!["commander", "khkt", "director", "finance"].includes(session.role)) return NextResponse.json({ error: "Bạn không có quyền tải hồ sơ thanh toán." }, { status: 403 });
  const { id } = await context.params;
  const db = getSupabaseAdmin();
  const { data: payment } = await db.from("payment_requests").select("id,request_code").eq("id", id).maybeSingle();
  if (!payment) return NextResponse.json({ error: "Không tìm thấy hồ sơ thanh toán." }, { status: 404 });

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Chưa chọn file hồ sơ." }, { status: 400 });
  if (!ALLOWED.has(file.type)) return NextResponse.json({ error: "Chỉ nhận PDF, Excel, Word, JPG, PNG hoặc WEBP." }, { status: 400 });
  if (file.size > MAX_FILE_SIZE) return NextResponse.json({ error: "Mỗi file hồ sơ tối đa 20 MB." }, { status: 400 });

  const path = `payment-requests/${id}/${crypto.randomUUID()}-${safeName(file.name)}`;
  const bytes = await file.arrayBuffer();
  const { error: uploadError } = await db.storage.from(DOCUMENT_BUCKET).upload(path, bytes, { contentType: file.type, cacheControl: "3600", upsert: false });
  if (uploadError) {
    console.error("payment document upload", uploadError);
    return NextResponse.json({ error: "Không tải được hồ sơ lên hệ thống." }, { status: 500 });
  }

  const { data: doc, error } = await db.from("payment_documents").insert({
    request_id: id,
    file_name: file.name,
    storage_path: path,
    mime_type: file.type,
    file_size: file.size,
    uploaded_by: session.id
  }).select("*").single();
  if (error) {
    await db.storage.from(DOCUMENT_BUCKET).remove([path]);
    throw error;
  }
  return NextResponse.json({ ok: true, document: doc }, { status: 201 });
}