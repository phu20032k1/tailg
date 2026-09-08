import { NextRequest, NextResponse } from "next/server";
import PptxGenJS from "pptxgenjs";
import { readSessionToken, SESSION_COOKIE } from "@/lib/auth";
import { getProgressItems, getReportRange } from "@/lib/data";
import { areaRank, teamRank } from "@/lib/project-order";
import { getSupabaseAdmin, STORAGE_BUCKET } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const C = {
  bg: "EDF5FB",
  red: "E31B23",
  cyan: "00A6D6",
  navy: "163A5F",
  text: "243746",
  muted: "607D8B",
  white: "FFFFFF",
  green: "2E7D52",
  amber: "A66B00"
};

function formatDate(date: string | null | undefined) {
  if (!date) return "-";
  const [y, m, d] = date.split("-");
  return `${d}/${m}/${y}`;
}

function baseSlide(pptx: PptxGenJS, title: string, subtitle?: string) {
  const slide = pptx.addSlide();
  slide.background = { color: C.bg };
  slide.addText("TAILG", { x: 0.45, y: 0.22, w: 1.1, h: 0.3, fontSize: 12, bold: true, color: C.red });
  slide.addText("LICOGI18.3", { x: 11.7, y: 0.22, w: 1.1, h: 0.3, fontSize: 10, bold: true, color: C.red, align: "right" });
  slide.addText(title, { x: 1.8, y: 0.16, w: 9.7, h: 0.36, fontSize: 14, bold: true, color: C.cyan, align: "center", margin: 0 });
  if (subtitle) slide.addText(subtitle, { x: 1.8, y: 0.48, w: 9.7, h: 0.25, fontSize: 9, color: C.cyan, align: "center", margin: 0 });
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

function scheduleLabel(item: { planned_finish: string | null; actual_finish: string | null; progress: number }, today: string) {
  if (!item.planned_finish) return "Chưa có mốc";
  if (item.actual_finish) {
    if (item.actual_finish < item.planned_finish) return "Nhanh";
    if (item.actual_finish === item.planned_finish) return "Đúng kế hoạch";
    return "Chậm";
  }
  if (Number(item.progress) >= 100) return "Hoàn thành";
  return today > item.planned_finish ? "Chậm" : "Đang theo kế hoạch";
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
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(new Date());

  const [reports, progressItems] = await Promise.all([
    getReportRange(session, from, to),
    getProgressItems(session)
  ]);
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
  pptx.theme = { headFontFace: "Arial", bodyFontFace: "Arial" };

  {
    const slide = pptx.addSlide();
    slide.background = { color: C.bg };
    slide.addShape(pptx.ShapeType.line, { x: 0.55, y: 0.82, w: 12.2, h: 0, line: { color: C.red, width: 1.4 } });
    slide.addText("DỰ ÁN NHÀ MÁY SẢN XUẤT KHOA HỌC VÀ CÔNG NGHỆ TAILG VIỆT NAM", { x: 0.7, y: 0.25, w: 11.9, h: 0.3, fontSize: 10, bold: true, color: C.cyan, align: "center" });
    slide.addText("CUỘC HỌP CẬP NHẬT TIẾN ĐỘ DỰ ÁN", { x: 1.2, y: 1.18, w: 10.9, h: 0.6, fontSize: 25, bold: true, color: C.red, align: "center" });
    slide.addText("项目进展更新会议", { x: 1.2, y: 1.8, w: 10.9, h: 0.5, fontSize: 20, bold: true, color: C.red, align: "center" });
    slide.addShape(pptx.ShapeType.roundRect, { x: 1.35, y: 3.25, w: 10.65, h: 1.55, fill: { color: C.white, transparency: 5 }, line: { color: "C7DCEB" } });
    slide.addText(`BÁO CÁO TUẦN ${formatDate(from)} → ${formatDate(to)}`, { x: 1.65, y: 3.72, w: 10.05, h: 0.5, fontSize: 20, bold: true, color: C.navy, align: "center" });
    slide.addText(`Ngày lập: ${formatDate(to)}`, { x: 4.5, y: 5.65, w: 4.3, h: 0.35, fontSize: 11, color: C.text, align: "center" });
  }

  {
    const slide = baseSlide(pptx, "NỘI DUNG CUỘC HỌP", "会议内容");
    const items = [
      "I. CẬP NHẬT TIẾN ĐỘ TẠI CÔNG TRƯỜNG / 现场进度更新",
      "II. KẾ HOẠCH VÀ TIẾN ĐỘ CAM KẾT / 计划与承诺进度",
      "III. CÔNG TÁC AN TOÀN / 安全工作",
      "IV. CÁC VẤN ĐỀ KHÁC / 其他事项"
    ];
    slide.addText(items.map((text) => ({ text, options: { bullet: { indent: 18 } } })), { x: 1.1, y: 1.55, w: 11.0, h: 3.6, fontSize: 16, color: C.red, breakLine: true, paraSpaceAfter: 16 });
  }

  sectionSlide(pptx, "I. CẬP NHẬT TIẾN ĐỘ TẠI CÔNG TRƯỜNG", "现场进度更新");

  {
    const slide = baseSlide(pptx, "1. Nhân lực và máy móc / 人力与机械");
    const leaders = [...new Map(reports.map((report) => [report.leader_id, report.leader])).values()]
      .filter(Boolean)
      .sort((a, b) => teamRank(a?.full_name) - teamRank(b?.full_name));
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
    slide.addTable(rows.map((row) => row.map((value) => ({ text: String(value) }))), {
      x: 0.65, y: 1.2, w: 12.05, h: 4.8,
      border: { color: "B8CDD9", pt: 0.8 }, fill: { color: C.white }, color: C.text,
      fontSize: 10, margin: 0.08, rowH: 0.55, bold: false,
      colW: [2.15, 1.05, 0.95, 0.95, 0.85, 6.1]
    });
    slide.addText(`Ngày chốt gần nhất: ${latestDate ? formatDate(latestDate) : "Chưa có dữ liệu"}`, { x: 0.75, y: 6.25, w: 4.2, h: 0.25, fontSize: 9, color: C.muted });
  }

  {
    const slide = baseSlide(pptx, "2. Thời tiết trong tuần / 每周天气");
    const dates = [...new Set(reports.map((report) => report.report_date))].sort();
    const rows: (string | number)[][] = [["Ngày", "Buổi sáng", "Buổi chiều"]];
    for (const date of dates) {
      const day = reports.filter((report) => report.report_date === date);
      const morning = [...new Set(day.map((report) => report.weather_morning).filter(Boolean))].join(" / ") || "Chưa ghi nhận";
      const afternoon = [...new Set(day.map((report) => report.weather_afternoon).filter(Boolean))].join(" / ") || "Chưa ghi nhận";
      rows.push([formatDate(date), morning, afternoon]);
    }
    if (rows.length === 1) rows.push(["-", "Chưa có dữ liệu", "Chưa có dữ liệu"]);
    slide.addTable(rows.map((row) => row.map((value) => ({ text: String(value) }))), {
      x: 1.25, y: 1.25, w: 10.8, h: 4.9,
      border: { color: "B8CDD9", pt: 0.8 }, fill: { color: C.white }, color: C.text,
      fontSize: 12, margin: 0.1, rowH: 0.58, colW: [2.2, 4.3, 4.3]
    });
  }

  const mainTasks = reports
    .flatMap((report) => report.tasks.filter((task) => task.kind === "main").map((task) => ({ ...task, leader: report.leader, reportDate: report.report_date })))
    .sort((a, b) => areaRank(a.area_label) - areaRank(b.area_label) || teamRank(a.leader?.full_name) - teamRank(b.leader?.full_name) || a.reportDate.localeCompare(b.reportDate));
  const workPhotos = reports.flatMap((report) => report.photos.filter((photo) => photo.photo_type === "work")).slice(0, 12);
  const photoData = (await Promise.all(workPhotos.map((photo) => storageImageData(photo.storage_path)))).filter(Boolean) as string[];
  const pages = Math.max(1, Math.ceil(Math.max(mainTasks.length, photoData.length) / 8));
  for (let page = 0; page < pages; page++) {
    const slide = baseSlide(pptx, `3.${page + 1}. Công tác chính / 主要工作`);
    const pageTasks = mainTasks.slice(page * 8, page * 8 + 8);
    slide.addText(pageTasks.length ? pageTasks.map((task) => ({ text: `${task.area_label ? `${task.area_label}: ` : ""}${task.description_vi}${task.leader?.full_name ? ` · ${task.leader.full_name}` : ""}`, options: { bullet: { indent: 16 } } })) : [{ text: "Chưa có dữ liệu công việc.", options: {} }], { x: 0.65, y: 1.15, w: 5.65, h: 5.65, fontSize: 11.5, color: C.text, breakLine: true, paraSpaceAfter: 8, valign: "top" });
    const imgs = photoData.slice(page * 4, page * 4 + 4);
    imgs.forEach((data, index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);
      slide.addImage({ data, x: 6.6 + col * 3.05, y: 1.25 + row * 2.55, w: 2.82, h: 2.18 });
    });
    if (!imgs.length) slide.addText("Chưa có ảnh thi công trong khoảng báo cáo.", { x: 6.75, y: 2.8, w: 5.4, h: 0.9, fontSize: 14, color: C.muted, align: "center" });
  }

  for (const asset of assets || []) {
    if (asset.asset_type !== "plan") continue;
    const data = await storageImageData(asset.storage_path);
    if (!data) continue;
    const slide = baseSlide(pptx, `4. ${asset.title}`);
    slide.addImage({ data, x: 0.85, y: 1.2, w: 11.65, h: 5.7 });
  }

  sectionSlide(pptx, "II. KẾ HOẠCH VÀ TIẾN ĐỘ CAM KẾT", "计划与承诺进度");

  {
    const slide = baseSlide(pptx, "5. So sánh ngày cam kết và hoàn thành thực tế");
    const ordered = [...progressItems].sort((a, b) => areaRank(a.work_stage) - areaRank(b.work_stage) || a.code.localeCompare(b.code, "vi"));
    const selected = ordered.slice(0, 18);
    const rows: (string | number)[][] = [["Ký hiệu", "Giai đoạn", "HT cam kết", "HT thực tế", "%", "Đánh giá"]];
    for (const item of selected) {
      rows.push([item.code, item.work_stage, formatDate(item.planned_finish), formatDate(item.actual_finish), `${Number(item.progress).toFixed(0)}%`, scheduleLabel(item, today)]);
    }
    if (rows.length === 1) rows.push(["-", "Chưa có dữ liệu", "-", "-", "0%", "-"]);
    slide.addTable(rows.map((row) => row.map((value) => ({ text: String(value) }))), {
      x: 0.55, y: 1.05, w: 12.2, h: 5.8,
      border: { color: "B8CDD9", pt: 0.7 }, fill: { color: C.white }, color: C.text,
      fontSize: 8.7, margin: 0.06, rowH: 0.31,
      colW: [1.25, 3.0, 1.65, 1.65, 0.75, 3.9]
    });
  }

  {
    const slide = baseSlide(pptx, "6. Kế hoạch công việc tiếp theo", "下阶段工作计划");
    const latestDate = reports.map((report) => report.report_date).sort().at(-1);
    const latestTasks = reports
      .filter((report) => report.report_date === latestDate)
      .flatMap((report) => report.tasks.filter((task) => task.kind === "main").map((task) => ({ ...task, leader: report.leader })))
      .sort((a, b) => areaRank(a.area_label) - areaRank(b.area_label) || teamRank(a.leader?.full_name) - teamRank(b.leader?.full_name));
    slide.addText(latestTasks.length ? latestTasks.slice(0, 16).map((task) => ({ text: `${task.area_label ? `${task.area_label}: ` : ""}${task.description_vi}${task.leader?.full_name ? ` · ${task.leader.full_name}` : ""}`, options: { bullet: { indent: 18 } } })) : [{ text: "Chưa có dữ liệu để lập kế hoạch tuần tới.", options: {} }], { x: 0.9, y: 1.3, w: 11.5, h: 5.3, fontSize: 13, color: C.text, breakLine: true, paraSpaceAfter: 8, valign: "top" });
  }

  sectionSlide(pptx, "III. CÔNG TÁC AN TOÀN", "安全工作");
  {
    const slide = baseSlide(pptx, "III. Công tác an toàn / 安全工作");
    slide.addText("Nội dung an toàn được cập nhật theo báo cáo hiện trường và tài liệu cuộc họp tuần.", { x: 1.2, y: 2.4, w: 10.9, h: 0.8, fontSize: 18, color: C.navy, align: "center" });
  }

  {
    const slide = baseSlide(pptx, "KẾT THÚC / 谢谢");
    slide.addText("CẢM ƠN / 谢谢", { x: 1.5, y: 2.75, w: 10.3, h: 0.75, fontSize: 30, bold: true, color: C.red, align: "center" });
  }

  const output = await pptx.write({ outputType: "nodebuffer" });
  return new NextResponse(output as Buffer, {
    status: 200,
    headers: {
      "content-type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "content-disposition": `attachment; filename="TAILG-weekly-${from}-${to}.pptx"`
    }
  });
}
