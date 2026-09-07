import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { readSessionToken, SESSION_COOKIE } from "@/lib/auth";
import { getReportRange, getUsers } from "@/lib/data";

function dateList(from: string, to: string) {
  const dates: string[] = [];
  const cursor = new Date(`${from}T00:00:00+07:00`);
  const end = new Date(`${to}T00:00:00+07:00`);
  while (cursor <= end && dates.length < 31) {
    dates.push(new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

function laborBy(report: Awaited<ReturnType<typeof getReportRange>>[number] | undefined, code: string) {
  return report?.labor.filter((item) => item.category_code === code).reduce((sum, item) => sum + Number(item.headcount || 0), 0) || 0;
}

export async function GET(request: NextRequest) {
  const session = await readSessionToken(request.cookies.get(SESSION_COOKIE)?.value);
  if (!session) return NextResponse.json({ ok: false, error: "Phiên đăng nhập đã hết hạn." }, { status: 401 });

  const params = request.nextUrl.searchParams;
  const to = params.get("to") || new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(new Date());
  const fallbackFrom = new Date(`${to}T00:00:00+07:00`);
  fallbackFrom.setDate(fallbackFrom.getDate() - 6);
  const from = params.get("from") || new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(fallbackFrom);
  const dates = dateList(from, to);
  const [reports, users] = await Promise.all([getReportRange(session, from, to), getUsers()]);
  const leaders = users.filter((item) => item.role === "leader" && (session.role === "commander" || item.id === session.id));

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "TAILG Site Control";
  const sheet = workbook.addWorksheet("Tổng hợp nhân lực", { views: [{ state: "frozen", xSplit: 2, ySplit: 3 }] });

  sheet.mergeCells(1, 1, 1, 2 + dates.length);
  const title = sheet.getCell(1, 1);
  title.value = "BẢNG TỔNG HỢP CÔNG NHÂN TẠI DỰ ÁN";
  title.font = { bold: true, size: 16 };
  title.alignment = { horizontal: "center" };

  sheet.getRow(2).values = ["Tên đội thi công", "Ngày tháng", ...dates.map((date) => new Date(`${date}T00:00:00+07:00`))];
  sheet.getRow(2).font = { bold: true };
  sheet.getRow(2).alignment = { horizontal: "center", vertical: "middle" };
  for (let column = 3; column <= 2 + dates.length; column++) sheet.getCell(2, column).numFmt = "dd/mm";

  const metrics = [
    { key: "technical", label: "Kỹ thuật" },
    { key: "formwork", label: "Cốp pha" },
    { key: "rebar", label: "Cốt thép" },
    { key: "day_labor", label: "Công nhật" },
    { key: "workers", label: "Tổng cộng" }
  ];

  function valueFor(leaderId: string | null, date: string, metric: string) {
    const dayReports = reports.filter((report) => report.report_date === date && (!leaderId || report.leader_id === leaderId));
    if (metric === "technical") return dayReports.reduce((sum, report) => sum + report.technical_staff, 0);
    if (metric === "workers") return dayReports.reduce((sum, report) => sum + report.workers, 0);
    return dayReports.reduce((sum, report) => sum + laborBy(report, metric), 0);
  }

  let row = 3;
  for (const [teamId, teamName] of [[null, "TOÀN DỰ ÁN"] as const, ...leaders.map((leader) => [leader.id, leader.full_name] as const)]) {
    const start = row;
    metrics.forEach((metric) => {
      sheet.getRow(row).values = [row === start ? teamName : null, metric.label, ...dates.map((date) => valueFor(teamId, date, metric.key))];
      if (metric.key === "workers") sheet.getRow(row).font = { bold: true };
      row += 1;
    });
    sheet.mergeCells(start, 1, row - 1, 1);
    sheet.getCell(start, 1).alignment = { vertical: "middle", horizontal: "center", wrapText: true };
  }

  sheet.getColumn(1).width = 24;
  sheet.getColumn(2).width = 16;
  for (let column = 3; column <= 2 + dates.length; column++) sheet.getColumn(column).width = 11;

  const border = { style: "thin" as const, color: { argb: "FFB7C7D6" } };
  sheet.eachRow({ includeEmpty: false }, (excelRow) => {
    excelRow.eachCell({ includeEmpty: true }, (cell) => {
      cell.border = { top: border, left: border, bottom: border, right: border };
      cell.alignment = { ...cell.alignment, vertical: "middle", horizontal: cell.col <= 2 ? "left" : "center", wrapText: true };
    });
  });
  sheet.getRow(2).eachCell((cell) => { cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDDEBF7" } }; });

  const buffer = await workbook.xlsx.writeBuffer();
  return new NextResponse(buffer as ArrayBuffer, {
    status: 200,
    headers: {
      "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "content-disposition": `attachment; filename="TAILG-nhan-luc-${from}-${to}.xlsx"`
    }
  });
}
