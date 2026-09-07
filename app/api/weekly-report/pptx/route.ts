import { NextRequest, NextResponse } from "next/server";
import PptxGenJS from "pptxgenjs";
import { readSessionToken, SESSION_COOKIE } from "@/lib/auth";
import { getReportRange } from "@/lib/data";
import { getSupabaseAdmin, STORAGE_BUCKET } from "@/lib/supabase/admin";

const C = {
  bg: "EDF5FB",
  red: "E31B23",
  cyan: "00A6D6",
  navy: "163A5F",
  text: "243746",
  muted: "607D8B",
  white: "FFFFFF",
  green: "3D9B62",
  pale: "F8FBFD"
};

function formatDate(date: string) {
  const [y, m, d] = date.split("-");
  return `${d}/${m}/${y}`;
}

function baseSlide(pptx: PptxGenJS, title: string, subtitle?: string) {
  const slide = pptx.addSlide();
  slide.background = { color: C.bg };
  slide.addText("TAILG", { x: 0.45, y: 0.22, w: 1.1, h: 0.3, fontSize: 12, bold: true, color: C.red });
  slide.addText("LICOGI18.3", { x: 11.75, y: 0.22, w: 1.05, h: 0.3, fontSize: 10, bold: true, color: C.red, align: "right" });
  slide.addText(title, { x: 2.0, y: 0.18, w: 9.3, h: 0.34, fontSize: 14, bold: true, color: C.cyan, align: "center", margin: 0 });
  if (subtitle) slide.addText(subtitle, { x: 2.0, y: 0.48, w: 9.3, h: 0.25, fontSize: 9, color: C.cyan, align: "center", margin: 0 });
  slide.addShape(pptx.ShapeType.line, { x: 0.45, y: 0.78, w: 12.4, h: 0, line: { color: C.red, width: 1.3 } });
  return slide;
}

function sectionSlide(pptx: PptxGenJS, vi: string, zh: string) {
  const slide = baseSlide(pptx, "CUỘC HỌP CẬP NHẬT TIẾN ĐỘ DỰ ÁN TAILG", "TAILG 项目进展更新会议");
  slide.addText(vi, { x: 1.2, y: 2.75, w: 10.9, h: 0.55, fontSize: 25, bold: true, color: C.red, align: "center" });
  slide.addText(zh, { x: 1.2, y: 3.35, w: 10.9, h: 0.45, fontSize: 20, bold: true, color: C.red, align: "center" });
}

async function storageImageData(path: string) {
  const db = getSupabaseAdmin();
  const { data, error } = await db.storage.from(STORAGE_BUCKET).download(path);
  if (error || !data) return null;
  const mime = data.type || (path.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg");
  if (!mime.includes("jpeg") && !mime.includes("png") && !mime.includes("webp")) return null;
  const bytes = Buffer.from(await data.arrayBuffer()).toString("base64");
  return `data:${mime};base64,${bytes}`;
}

export async function GET(request: NextRequest) {
  const session = await readSessionToken(request.cookies.get(SESSION_COOKIE)?.value);
  if (!session) return NextResponse.json({ ok: false, error: "Phiên đăng nhập đã hết hạn." }, { status: 401 });
  if (session.role !== "commander") return NextResponse.json({ ok: false, error: "Chỉ Chỉ huy trưởng được xuất báo cáo tuần." }, { status: 403 });

  const params = request.nextUrl.searchParams;
  const to = params.get("to") || new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(new Date());
  const fromDate = new Date(`${to}T00:00:00+07:00`);
  fromDate.setDate(fromDate.getDate() - 6);
  const from = params.get("from") || new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(fromDate);
  const reports = await getReportRange(session, from, to);
  const db = getSupabaseAdmin();
  const { data: assets } = await db
    .from("weekly_report_assets")
    .select("id,title,storage_path,asset_type,sort_order")
    .eq("week_start", from)
    .eq("week_end", to)
    .order("sort_order")
    .order("created_at");

  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.author = "LICOGI 18.3";
  pptx.company = "Công ty Cổ phần Đầu tư và Xây dựng số 18.3";
  pptx.subject = "TAILG weekly construction progress report";
  pptx.title = `TAILG Weekly Report ${from} - ${to}`;
  pptx.lang = "vi-VN";
  pptx.theme = {
    headFontFace: "Arial",
    bodyFontFace: "Arial",
    lang: "vi-VN"
  };

  // Cover
  {
    const slide = pptx.addSlide();
    slide.background = { color: C.bg };
    slide.addShape(pptx.ShapeType.line, { x: 0.55, y: 0.82, w: 12.2, h: 0, line: { color: C.red, width: 1.4 } });
    slide.addText("DỰ ÁN NHÀ MÁY SẢN XUẤT KHOA HỌC VÀ CÔNG NGHỆ TAILG VIỆT NAM", { x: 0.7, y: 0.25, w: 11.9, h: 0.3, fontSize: 10, bold: true, color: C.cyan, align: "center" });
    slide.addText("CUỘC HỌP CẬP NHẬT TIẾN ĐỘ DỰ ÁN", { x: 1.2, y: 1.18, w: 10.9, h: 0.6, fontSize: 25, bold: true, color: C.red, align: "center" });
    slide.addText("项目进展更新会议", { x: 1.2, y: 1.8, w: 10.9, h: 0.5, fontSize: 20, bold: true, color: C.red, align: "center" });
    slide.addText("Chủ đầu tư: Công ty TNHH Khoa học và Công nghệ TAILG (Việt Nam)", { x: 0.75, y: 2.55, w: 5.8, h: 0.4, fontSize: 11, color: C.text });
    slide.addText("Nhà thầu thi công: Công ty Cổ phần Đầu tư và Xây dựng số 18.3 (LICOGI18.3)", { x: 6.75, y: 2.55, w: 5.8, h: 0.55, fontSize: 11, color: C.text, align: "right" });
    slide.addShape(pptx.ShapeType.roundRect, { x: 1.35, y: 3.55, w: 10.65, h: 1.35, rectRadius: 0.08, fill: { color: C.white, transparency: 5 }, line: { color: "C7DCEB" } });
    slide.addText(`BÁO CÁO TUẦN ${formatDate(from)} → ${formatDate(to)}`, { x: 1.65, y: 3.93, w: 10.05, h: 0.5, fontSize: 20, bold: true, color: C.navy, align: "center" });
    slide.addText(`Ngày lập: ${formatDate(to)}`, { x: 4.5, y: 5.65, w: 4.3, h: 0.35, fontSize: 11, color: C.text, align: "center" });
  }

  // Agenda
  {
    const slide = baseSlide(pptx, "NỘI DUNG CUỘC HỌP", "会议内容");
    const items = [
      "I. CẬP NHẬT TIẾN ĐỘ TẠI CÔNG TRƯỜNG / 现场进度更新",
      "II. KẾ HOẠCH VÀ TIẾN ĐỘ CÔNG VIỆC TUẦN TỚI / 下周工作计划及进展",
      "III. CÔNG TÁC AN TOÀN / 安全工作",
      "IV. CÁC VẤN ĐỀ KHÁC / 其他事项"
    ];
    slide.addText(items.map((text) => ({ text, options: { bullet: { indent: 18 } } })), { x: 1.1, y: 1.55, w: 11.0, h: 3.6, fontSize: 16, color: C.red, breakLine: true, paraSpaceAfterPt: 16 });
  }

  sectionSlide(pptx, "I. CẬP NHẬT TIẾN ĐỘ TẠI CÔNG TRƯỜNG", "现场进度更新");

  // Manpower summary
  {
    const slide = baseSlide(pptx, "1. Nhân lực và máy móc / 人力与机械");
    const leaders = [...new Map(reports.map((report) => [report.leader_id, report.leader])).values()].filter(Boolean);
    const latestDate = reports.map((report) => report.report_date).sort().at(-1);
    const latest = reports.filter((report) => report.report_date === latestDate);
    const rows: (string | number)[][] = [["Đội", "Công nhân", "Kỹ thuật", "Lái máy", "Bảo vệ", "Thiết bị"]];
    for (const leader of leaders) {
      if (!leader) continue;
      const report = latest.find((item) => item.leader_id === leader.id);
      const labor = report?.labor || [];
      const machineOperators = labor.filter((item) => item.category_code === "machine_operator").reduce((sum, item) => sum + item.headcount, 0);
      const security = labor.filter((item) => item.category_code === "security").reduce((sum, item) => sum + item.headcount, 0);
      const equipment = report?.equipment.filter((item) => item.quantity > 0).map((item) => `${item.equipment_name}: ${item.quantity}`).join(", ") || "-";
      rows.push([leader.full_name, report?.workers || 0, report?.technical_staff || 0, machineOperators, security, equipment]);
    }
    slide.addTable(rows, {
      x: 0.65, y: 1.2, w: 12.05, h: 4.8,
      border: { color: "B8CDD9", width: 0.8 },
      fill: C.white,
      color: C.text,
      fontSize: 10,
      margin: 0.08,
      rowH: 0.55,
      bold: false,
      autoFit: false,
      colW: [2.15, 1.05, 0.95, 0.95, 0.85, 6.1]
    });
    slide.addText(`Ngày chốt gần nhất: ${latestDate ? formatDate(latestDate) : "Chưa có dữ liệu"}`, { x: 0.75, y: 6.25, w: 4.2, h: 0.25, fontSize: 9, color: C.muted });
  }

  // Main works + photos, two slides max
  const mainTasks = reports.flatMap((report) => report.tasks.filter((task) => task.kind === "main").map((task) => ({ ...task, leader: report.leader, reportDate: report.report_date })));
  const workPhotos = reports.flatMap((report) => report.photos.filter((photo) => photo.photo_type === "work")).slice(0, 8);
  const photoData = (await Promise.all(workPhotos.map((photo) => storageImageData(photo.storage_path)))).filter(Boolean) as string[];
  for (let page = 0; page < Math.max(1, Math.ceil(Math.max(mainTasks.length, photoData.length) / 8)); page++) {
    const slide = baseSlide(pptx, `2.${page + 1}. Công tác chính / 主要工作`);
    const pageTasks = mainTasks.slice(page * 8, page * 8 + 8);
    slide.addText(pageTasks.length ? pageTasks.map((task) => ({ text: `${task.area_label ? `${task.area_label}: ` : ""}${task.description_vi}${task.leader?.full_name ? ` · ${task.leader.full_name}` : ""}`, options: { bullet: { indent: 16 } } })) : [{ text: "Chưa có dữ liệu công việc.", options: {} }], { x: 0.65, y: 1.15, w: 5.65, h: 5.65, fontSize: 11.5, color: C.text, breakLine: true, paraSpaceAfterPt: 8, valign: "top" });
    const imgs = photoData.slice(page * 4, page * 4 + 4);
    imgs.forEach((data, index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);
      slide.addImage({ data, x: 6.6 + col * 3.05, y: 1.25 + row * 2.55, w: 2.82, h: 2.18 });
    });
    if (!imgs.length) slide.addText("Ảnh thi công sẽ tự lấy từ báo cáo ngày sau khi các đội upload ảnh.", { x: 6.75, y: 2.8, w: 5.4, h: 0.9, fontSize: 14, color: C.muted, align: "center" });
  }

  // Plan/cropped assets
  for (const asset of assets || []) {
    if (asset.asset_type !== "plan") continue;
    const data = await storageImageData(asset.storage_path);
    if (!data) continue;
    const slide = baseSlide(pptx, `2.x. ${asset.title}`);
    slide.addText("Mặt bằng được lưu từ PDF nguồn và ảnh crop dùng trực tiếp trong báo cáo.", { x: 0.8, y: 1.0, w: 11.7, h: 0.3, fontSize: 9.5, color: C.muted, align: "center" });
    slide.addImage({ data, x: 0.85, y: 1.4, w: 11.65, h: 5.45 });
  }

  sectionSlide(pptx, "II. KẾ HOẠCH VÀ TIẾN ĐỘ CÔNG VIỆC TUẦN TỚI", "下周工作计划及进展");

  // Draft next-week plan from latest report date
  {
    const slide = baseSlide(pptx, "II. Kế hoạch và tiến độ công việc tuần tới", "下周工作计划及进展");
    const latestDate = reports.map((report) => report.report_date).sort().at(-1);
    const latestTasks = reports.filter((report) => report.report_date === latestDate).flatMap((report) => report.tasks.filter((task) => task.kind === "main").map((task) => ({ ...task, leader: report.leader })));
    const unique = [...new Map(latestTasks.map((task) => [`${task.area_label}|${task.description_vi}`, task])).values()].slice(0, 14);
    slide.addText(unique.length ? unique.map((task) => ({ text: `${task.area_label ? `${task.area_label}: ` : ""}${task.description_vi}`, options: { bullet: { indent: 16 } } })) : [{ text: "Chưa có dữ liệu để tạo bản nháp kế hoạch.", options: {} }], { x: 0.9, y: 1.35, w: 11.5, h: 4.9, fontSize: 13, color: C.text, breakLine: true, paraSpaceAfterPt: 10 });
    slide.addShape(pptx.ShapeType.roundRect, { x: 0.9, y: 6.25, w: 11.5, h: 0.48, fill: { color: "FFF4D6" }, line: { color: "E7C86E" } });
    slide.addText("BẢN NHÁP TỰ ĐỘNG: Chỉ huy trưởng rà soát/chỉnh nội dung trước khi gửi Chủ đầu tư.", { x: 1.05, y: 6.35, w: 11.2, h: 0.22, fontSize: 9.5, bold: true, color: "8A6500", align: "center" });
  }

  sectionSlide(pptx, "III. CÔNG TÁC AN TOÀN", "安全工作");
  {
    const slide = baseSlide(pptx, "III. Công tác an toàn / 安全工作");
    slide.addText("Phần này để Ban điều hành bổ sung nội dung an toàn và ảnh chuyên đề trước khi phát hành chính thức.", { x: 1.1, y: 2.35, w: 11.0, h: 1.0, fontSize: 18, color: C.text, align: "center", valign: "mid" });
  }

  sectionSlide(pptx, "IV. CÁC VẤN ĐỀ KHÁC", "其他事项");
  {
    const slide = baseSlide(pptx, "IV. Các vấn đề khác / 其他事项");
    const issues = reports.flatMap((report) => [
      ...(report.issue_text ? [`${report.leader?.full_name || "Đội"}: ${report.issue_text}`] : []),
      ...report.tasks.filter((task) => task.kind === "other").map((task) => `${report.leader?.full_name || "Đội"}: ${task.description_vi}`)
    ]).slice(0, 16);
    slide.addText(issues.length ? issues.map((text) => ({ text, options: { bullet: { indent: 16 } } })) : [{ text: "Không có nội dung khác được ghi nhận trong khoảng báo cáo.", options: {} }], { x: 0.95, y: 1.4, w: 11.4, h: 4.9, fontSize: 12.5, color: C.text, breakLine: true, paraSpaceAfterPt: 9 });
  }

  {
    const slide = pptx.addSlide();
    slide.background = { color: "F2EFE7" };
    slide.addText("LICOGI18.3", { x: 5.0, y: 1.45, w: 3.3, h: 0.4, fontSize: 17, bold: true, color: C.red, align: "center" });
    slide.addText("XIN CẢM ƠN SỰ QUAN TÂM CỦA QUÝ VỊ !", { x: 1.3, y: 3.0, w: 10.7, h: 0.5, fontSize: 21, bold: true, color: "4F3A76", align: "center" });
    slide.addText("感谢您的关注", { x: 1.3, y: 3.55, w: 10.7, h: 0.4, fontSize: 17, color: "4F3A76", align: "center" });
    slide.addText(`${formatDate(from)} → ${formatDate(to)}`, { x: 4.5, y: 5.3, w: 4.3, h: 0.3, fontSize: 10, color: C.text, align: "center" });
  }

  const output = await pptx.write({ outputType: "nodebuffer" });
  const buffer = Buffer.isBuffer(output) ? output : Buffer.from(output as ArrayBuffer);
  return new NextResponse(buffer, {
    headers: {
      "content-type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "content-disposition": `attachment; filename="TAILG-weekly-${from}-${to}.pptx"`
    }
  });
}
