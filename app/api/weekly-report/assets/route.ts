import { NextRequest, NextResponse } from "next/server";
import { readSessionToken, SESSION_COOKIE } from "@/lib/auth";
import { getSupabaseAdmin, STORAGE_BUCKET } from "@/lib/supabase/admin";

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);
const MAX_IMAGE = 10 * 1024 * 1024;
const MAX_PDF = 30 * 1024 * 1024;

function safeFileName(name: string) {
  return name.normalize("NFKD").replace(/[^\w.-]+/g, "-").replace(/-+/g, "-").slice(-90) || "file";
}

export async function POST(request: NextRequest) {
  const session = await readSessionToken(request.cookies.get(SESSION_COOKIE)?.value);
  if (!session) return NextResponse.json({ ok: false, error: "Phiên đăng nhập đã hết hạn." }, { status: 401 });
  if (session.role !== "commander") return NextResponse.json({ ok: false, error: "Chỉ Chỉ huy trưởng được quản lý tài liệu báo cáo tuần." }, { status: 403 });

  const form = await request.formData();
  const weekStart = String(form.get("weekStart") || "");
  const weekEnd = String(form.get("weekEnd") || "");
  const title = String(form.get("title") || "Mặt bằng tiến độ").trim().slice(0, 200);
  const assetType = String(form.get("assetType") || "plan");
  const image = form.get("image");
  const pdf = form.get("pdf");

  if (!/^\d{4}-\d{2}-\d{2}$/.test(weekStart) || !/^\d{4}-\d{2}-\d{2}$/.test(weekEnd)) {
    return NextResponse.json({ ok: false, error: "Khoảng tuần không hợp lệ." }, { status: 400 });
  }
  if (!(image instanceof File) || !IMAGE_TYPES.has(image.type) || image.size > MAX_IMAGE) {
    return NextResponse.json({ ok: false, error: "Cần ảnh crop JPG/PNG/WEBP/HEIC tối đa 10 MB." }, { status: 400 });
  }
  if (pdf instanceof File && (pdf.type !== "application/pdf" || pdf.size > MAX_PDF)) {
    return NextResponse.json({ ok: false, error: "PDF nguồn tối đa 30 MB." }, { status: 400 });
  }

  const db = getSupabaseAdmin();
  const prefix = `weekly/${weekStart}-${weekEnd}/${crypto.randomUUID()}`;
  const imagePath = `${prefix}-${safeFileName(image.name)}`;
  const imageBytes = await image.arrayBuffer();
  const { error: imageError } = await db.storage.from(STORAGE_BUCKET).upload(imagePath, imageBytes, { contentType: image.type, upsert: false });
  if (imageError) return NextResponse.json({ ok: false, error: "Không tải được ảnh mặt bằng." }, { status: 500 });

  let pdfPath: string | null = null;
  if (pdf instanceof File && pdf.size) {
    pdfPath = `${prefix}-${safeFileName(pdf.name)}`;
    const { error: pdfError } = await db.storage.from(STORAGE_BUCKET).upload(pdfPath, await pdf.arrayBuffer(), { contentType: pdf.type, upsert: false });
    if (pdfError) {
      await db.storage.from(STORAGE_BUCKET).remove([imagePath]);
      return NextResponse.json({ ok: false, error: "Không tải được PDF nguồn." }, { status: 500 });
    }
  }

  const { data, error } = await db.from("weekly_report_assets").insert({
    week_start: weekStart,
    week_end: weekEnd,
    asset_type: ["plan", "cover", "safety", "other"].includes(assetType) ? assetType : "plan",
    title,
    storage_path: imagePath,
    source_pdf_path: pdfPath,
    created_by: session.id
  }).select("id,title,storage_path,source_pdf_path,asset_type,created_at").single();

  if (error) {
    await db.storage.from(STORAGE_BUCKET).remove([imagePath, ...(pdfPath ? [pdfPath] : [])]);
    console.error(error);
    return NextResponse.json({ ok: false, error: "Không lưu được tài liệu báo cáo tuần." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, asset: data }, { status: 201 });
}
