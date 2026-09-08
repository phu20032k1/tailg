import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { readSessionToken, SESSION_COOKIE } from "@/lib/auth";
import { getDailyManagementReport } from "@/lib/management-report";
import { formatDate, todayISO } from "@/lib/format";

function safeDate(value: string | null) {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : todayISO();
}

const border = { style: "thin" as const, color: { argb: "FFD6E0E7" } };
const headerFill = { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: "FFDCEAF5" } };
const sectionFill = { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: "FFF1F6FA" } };

function applyTableStyle(sheet: ExcelJS.Worksheet) {
  sheet.eachRow({ includeEmpty: false }, (row) => {
    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.border = { top: border, left: border, bottom: border, right: border };
      cell.alignment = { vertical: "middle", wrapText: true };
    });
  });
}

export async function GET(request: NextRequest) {
  const session = await readSessionToken(request.cookies.get(SESSION_COOKIE)?.value);
  if (!session) return NextResponse.json({ ok: false, error: "Phiên đăng nhập đã hết hạn." }, { status: 401 });
  if (session.role !== "commander") return NextResponse.json({ ok: false, error: "Chỉ Chỉ huy trưởng được tải file tổng hợp Ban điều hành." }, { status: 403 });

  const date = safeDate(request.nextUrl.searchParams.get("date"));
  const data = await getDailyManagementReport(session, date);
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "TAILG - Ban điều hành";
  workbook.created = new Date();

  const summary = workbook.addWorksheet("Tổng hợp ngày", { views: [{ state: "frozen", ySplit: 8 }] });
  summary.mergeCells("A1:K1");
  summary.getCell("A1").value = `BÁO CÁO TỔNG HỢP THI CÔNG NGÀY ${formatDate(date)}`;
  summary.getCell("A1").font = { bold: true, size: 16 };
  summary.getCell("A1").alignment = { horizontal: "center", vertical: "middle" };
  summary.getRow(1).height = 28;
  summary.mergeCells("A2:K2");
  summary.getCell("A2").value = "Dự án: Nhà máy TAILG Việt Nam - Ban điều hành dự án";
  summary.getCell("A2").alignment = { horizontal: "center" };

  summary.getRow(4).values = ["Đội báo cáo", `${data.summary.teamsReported}/6`, "Công nhân", data.summary.totalWorkers, "Kỹ thuật", data.summary.totalTechnical, "Tổng nhân lực", data.summary.totalPeople, "Ảnh", data.summary.totalPhotos, ""];
  summary.getRow(5).values = ["Thời tiết sáng", data.summary.weatherMorning, "Thời tiết trưa", data.summary.weatherNoon, "Thời tiết chiều", data.summary.weatherAfternoon, "Thời tiết tối", data.summary.weatherEvening, "Công việc", data.summary.totalTasks, ""];
  summary.getRow(6).values = ["Cập nhật móng", data.summary.totalFoundationUpdates, "Thiết bị", data.summary.totalEquipment, "", "", "", "", "", "", ""];
  for (const rowNumber of [4, 5, 6]) {
    summary.getRow(rowNumber).font = { bold: true };
    summary.getRow(rowNumber).eachCell((cell, col) => { if (col % 2 === 1) cell.fill = sectionFill; });
  }

  summary.getRow(8).values = ["STT", "Đội trưởng", "Phạm vi", "Trạng thái", "Công nhân", "Kỹ thuật", "Tổng NL", "Số CV", "Nội dung công việc", "Ảnh", "Vướng mắc"];
  summary.getRow(8).font = { bold: true };
  summary.getRow(8).fill = headerFill;
  let row = 9;
  for (const team of data.teamRows) {
    const workText = team.tasks.map((task, index) => `${index + 1}. ${task.area_label || "Công trường"}: ${task.description_vi}`).join("\n");
    summary.getRow(row).values = [
      team.stt,
      team.leader.full_name,
      team.zoneLabel || "Chưa gán khu vực",
      team.reported ? "Đã báo cáo" : "Chưa báo cáo",
      team.workers,
      team.technical,
      team.totalPeople,
      team.tasks.length,
      workText,
      team.photos.length,
      team.issueText || ""
    ];
    row += 1;
  }
  summary.columns = [
    { width: 7 }, { width: 23 }, { width: 32 }, { width: 16 }, { width: 12 }, { width: 11 }, { width: 12 }, { width: 9 }, { width: 58 }, { width: 9 }, { width: 35 }
  ];
  applyTableStyle(summary);

  const workSheet = workbook.addWorksheet("Tổng hợp công việc", { views: [{ state: "frozen", ySplit: 4 }] });
  workSheet.mergeCells("A1:G1");
  workSheet.getCell("A1").value = `TỔNG HỢP CÔNG VIỆC 6 ĐỘI - ${formatDate(date)}`;
  workSheet.getCell("A1").font = { bold: true, size: 15 };
  workSheet.getCell("A1").alignment = { horizontal: "center" };
  workSheet.getRow(3).values = ["STT", "Đội trưởng", "Khu vực", "Loại công việc", "Nội dung tiếng Việt", "Nội dung tiếng Trung", "Ngày báo cáo"];
  workSheet.getRow(3).font = { bold: true };
  workSheet.getRow(3).fill = headerFill;
  let workRow = 4;
  data.workSummary.forEach((task, index) => {
    workSheet.getRow(workRow).values = [index + 1, task.team, task.area, task.kind === "main" ? "Công việc chính" : "Công việc khác", task.descriptionVi, task.descriptionZh || "", formatDate(date)];
    workRow += 1;
  });
  if (!data.workSummary.length) {
    workSheet.getRow(workRow).values = ["", "", "", "", "Chưa có công việc được nhập trong ngày."];
  }
  workSheet.columns = [{ width: 7 }, { width: 24 }, { width: 26 }, { width: 18 }, { width: 62 }, { width: 52 }, { width: 15 }];
  applyTableStyle(workSheet);

  const detail = workbook.addWorksheet("Chi tiết từng đội", { views: [{ state: "frozen", ySplit: 2 }] });
  detail.mergeCells("A1:H1");
  detail.getCell("A1").value = `CHI TIẾT BÁO CÁO 6 ĐỘI - ${formatDate(date)}`;
  detail.getCell("A1").font = { bold: true, size: 15 };
  detail.getCell("A1").alignment = { horizontal: "center" };
  detail.columns = [{ width: 18 }, { width: 28 }, { width: 24 }, { width: 16 }, { width: 16 }, { width: 18 }, { width: 48 }, { width: 35 }];

  let cursor = 3;
  for (const team of data.teamRows) {
    detail.mergeCells(cursor, 1, cursor, 8);
    const title = detail.getCell(cursor, 1);
    title.value = `${team.stt}. ${team.leader.full_name} - ${team.reported ? "ĐÃ BÁO CÁO" : "CHƯA BÁO CÁO"}`;
    title.font = { bold: true, size: 13 };
    title.fill = headerFill;
    cursor += 1;

    detail.getRow(cursor).values = ["Phạm vi", team.zoneLabel || "Chưa gán khu vực", "Công nhân", team.workers, "Kỹ thuật", team.technical, "Tổng nhân lực", team.totalPeople];
    cursor += 1;
    detail.getRow(cursor).values = ["Thời tiết sáng", team.weatherMorning || "Chưa ghi nhận", "Thời tiết trưa", team.weatherNoon || "Chưa ghi nhận", "Thời tiết chiều", team.weatherAfternoon || "Chưa ghi nhận", "Thời tiết tối", team.weatherEvening || "Chưa ghi nhận"];
    cursor += 1;
    detail.getRow(cursor).values = ["Móng phụ trách", team.foundationCount, "Móng hoàn thành", team.completedFoundations, "", "", "", ""];
    cursor += 1;

    if (!team.reported) {
      detail.mergeCells(cursor, 1, cursor, 8);
      detail.getCell(cursor, 1).value = "Chưa nhận được báo cáo trong ngày.";
      cursor += 2;
      continue;
    }

    detail.mergeCells(cursor, 1, cursor, 8);
    detail.getCell(cursor, 1).value = "NHÂN LỰC CHI TIẾT";
    detail.getCell(cursor, 1).font = { bold: true };
    detail.getCell(cursor, 1).fill = sectionFill;
    cursor += 1;
    detail.getRow(cursor).values = ["Nhóm", "Tổ / phụ trách", "Số lượng", "Tính công nhân", "", "", "", ""];
    detail.getRow(cursor).font = { bold: true };
    cursor += 1;
    for (const item of team.labor) {
      detail.getRow(cursor).values = [item.label, item.crew_name || "-", item.headcount, item.counts_as_worker ? "Có" : "Không"];
      cursor += 1;
    }

    detail.mergeCells(cursor, 1, cursor, 8);
    detail.getCell(cursor, 1).value = "MÁY MÓC THIẾT BỊ";
    detail.getCell(cursor, 1).font = { bold: true };
    detail.getCell(cursor, 1).fill = sectionFill;
    cursor += 1;
    if (team.equipment.length) {
      detail.getRow(cursor).values = ["Thiết bị", "Số lượng", "Đơn vị", "", "", "", "", ""];
      detail.getRow(cursor).font = { bold: true };
      cursor += 1;
      for (const item of team.equipment) {
        detail.getRow(cursor).values = [item.equipment_name, item.quantity, item.unit];
        cursor += 1;
      }
    } else {
      detail.getCell(cursor, 1).value = "Không có thiết bị được ghi nhận.";
      cursor += 1;
    }

    detail.mergeCells(cursor, 1, cursor, 8);
    detail.getCell(cursor, 1).value = "CÔNG VIỆC TRONG NGÀY";
    detail.getCell(cursor, 1).font = { bold: true };
    detail.getCell(cursor, 1).fill = sectionFill;
    cursor += 1;
    detail.getRow(cursor).values = ["STT", "Khu vực", "Loại", "Nội dung tiếng Việt", "", "", "Tiếng Trung", ""];
    detail.getRow(cursor).font = { bold: true };
    cursor += 1;
    for (const [index, task] of team.tasks.entries()) {
      detail.getRow(cursor).values = [index + 1, task.area_label || "Khu vực thi công", task.kind === "main" ? "Chính" : "Khác", task.description_vi, "", "", task.description_zh || "", ""];
      cursor += 1;
    }

    if (team.workItems.length) {
      detail.mergeCells(cursor, 1, cursor, 8);
      detail.getCell(cursor, 1).value = "CẬP NHẬT MÓNG / KHỐI LƯỢNG";
      detail.getCell(cursor, 1).font = { bold: true };
      detail.getCell(cursor, 1).fill = sectionFill;
      cursor += 1;
      detail.getRow(cursor).values = ["Mã", "Khu vực", "Công việc", "Tiến độ", "", "", "", ""];
      detail.getRow(cursor).font = { bold: true };
      cursor += 1;
      for (const item of team.workItems) {
        detail.getRow(cursor).values = [item.foundation_codes?.join(", ") || "-", item.zone?.name || "-", item.stage, `${Number(item.progress || 0)}%`];
        cursor += 1;
      }
    }

    if (team.issueText) {
      detail.mergeCells(cursor, 1, cursor, 8);
      detail.getCell(cursor, 1).value = `Vướng mắc / ghi chú: ${team.issueText}`;
      cursor += 1;
    }
    if (team.report?.raw_message) {
      detail.mergeCells(cursor, 1, cursor + 2, 8);
      detail.getCell(cursor, 1).value = `Nội dung báo cáo gốc:\n${team.report.raw_message}`;
      detail.getCell(cursor, 1).alignment = { vertical: "top", wrapText: true };
      cursor += 3;
    }
    cursor += 1;
  }
  applyTableStyle(detail);

  const buffer = await workbook.xlsx.writeBuffer();
  return new NextResponse(buffer as ArrayBuffer, {
    status: 200,
    headers: {
      "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "content-disposition": `attachment; filename="TAILG-ban-dieu-hanh-${date}.xlsx"`
    }
  });
}
