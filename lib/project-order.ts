export const TEAM_NAME_ORDER = [
  "Bùi Văn Đức",
  "Nguyễn Văn Tuần",
  "Tăng Văn Toán",
  "Trần Văn Toãn",
  "Nguyễn Ánh Quang",
  "Nguyễn Duy Thọ"
];

export const WORK_STAGE_ORDER = [
  "Móng / đổ bê tông móng",
  "Cột tầng 1",
  "Sàn tầng 2",
  "Cột tầng 2",
  "Sàn tầng 3",
  "Cột tầng 3",
  "Sàn nền"
];

export function teamRank(name?: string | null) {
  if (!name) return 999;
  const index = TEAM_NAME_ORDER.findIndex((item) => name.includes(item));
  return index >= 0 ? index : 999;
}

export function areaRank(area?: string | null) {
  const text = (area || "").toLocaleLowerCase("vi");
  if (text.includes("xưởng 1") || text.includes("xuong 1")) return 10;
  if (text.includes("xưởng 2") || text.includes("xuong 2")) return 20;
  if (text.includes("xưởng 3") || text.includes("xuong 3")) return 30;
  if (text.includes("nhà xe") || text.includes("nha xe")) return 40;
  if (text.includes("nhà ăn") || text.includes("nha an")) return 50;
  if (text.includes("bể ngầm") || text.includes("be ngam")) return 60;
  if (text.includes("xlnt") || text.includes("xử lý nước thải")) return 70;
  if (text.includes("hạ tầng") || text.includes("ha tang")) return 80;
  return 999;
}

export function stageRank(stage?: string | null) {
  if (!stage) return 999;
  const index = WORK_STAGE_ORDER.findIndex((item) => item === stage);
  return index >= 0 ? index : 999;
}
