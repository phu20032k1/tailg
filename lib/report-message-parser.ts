export type ParsedLabor = {
  categoryCode: string;
  label: string;
  crewName?: string;
  headcount: number;
  countsAsWorker: boolean;
};

export type ParsedEquipment = {
  equipmentName: string;
  quantity: number;
  unit: string;
};

export type ParsedTask = {
  kind: "main" | "other";
  areaLabel?: string;
  descriptionVi: string;
};

export type ParsedDailyReport = {
  reportDate?: string;
  teamName?: string;
  labor: ParsedLabor[];
  equipment: ParsedEquipment[];
  tasks: ParsedTask[];
};

function clean(value: string) {
  return value.replace(/\s+/g, " ").replace(/^[-+*•]\s*/, "").trim();
}

function extractDate(raw: string) {
  const match = raw.match(/ngày\s+(\d{1,2})\s*\/\s*(\d{1,2})\s*\/\s*(\d{4})/i);
  if (!match) return undefined;
  const [, d, m, y] = match;
  return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

function addSingle(
  raw: string,
  list: ParsedLabor[],
  pattern: RegExp,
  categoryCode: string,
  label: string,
  countsAsWorker: boolean
) {
  const match = raw.match(pattern);
  if (!match) return;
  list.push({ categoryCode, label, headcount: Number(match[1]), countsAsWorker });
}

function addCrewMatches(
  raw: string,
  list: ParsedLabor[],
  pattern: RegExp,
  categoryCode: string,
  label: string,
  countsAsWorker: boolean
) {
  for (const match of raw.matchAll(pattern)) {
    const crew = clean(match[1] || "").replace(/^tổ\s+/i, "");
    list.push({
      categoryCode,
      label,
      crewName: crew || undefined,
      headcount: Number(match[2]),
      countsAsWorker
    });
  }
}

function parseLabor(raw: string) {
  const section = raw.split(/\b2\s*\/\s*Máy móc/i)[0] || raw;
  const labor: ParsedLabor[] = [];

  addSingle(section, labor, /Kỹ\s*thuật\s*[:.]?\s*(\d+)/i, "technical", "Kỹ thuật", false);
  addSingle(section, labor, /Lái\s*máy\s*[:.]?\s*(\d+)/i, "machine_operator", "Lái máy", false);
  addSingle(section, labor, /Bảo\s*vệ\s*[:.]?\s*(\d+)/i, "security", "Bảo vệ", false);
  addSingle(section, labor, /(?:^|[;+\n])\s*TD\s*[:.]?\s*(\d+)/im, "survey", "TD", false);

  addCrewMatches(
    section,
    labor,
    /Công\s*nhật(?:\s+tổ\s+([^:;\n]+))?\s*[:.]?\s*(\d+)/gi,
    "day_labor",
    "Công nhật",
    true
  );
  addCrewMatches(
    section,
    labor,
    /(?:Tổ\s*thép|Cốt\s*thép)(?:\s+tổ\s+)?([^:;\n\d]*?)\s*[:.]\s*(\d+)/gi,
    "rebar",
    "Cốt thép",
    true
  );
  addCrewMatches(
    section,
    labor,
    /(?:Tổ\s*cốp\s*pha|Ván\s*khuôn)(?!\s*\+)(?:\s+tổ\s+)?([^:;\n\d]*?)\s*[:.]\s*(\d+)/gi,
    "formwork",
    "Cốp pha / ván khuôn",
    true
  );

  for (const match of section.matchAll(/Ván\s*khuôn\s*\+\s*cốt\s*thép(?:\s+tổ\s+)?([^:;\n]*?)\s*[:.]\s*(\d+)/gi)) {
    labor.push({
      categoryCode: "formwork",
      label: "Ván khuôn + cốt thép",
      crewName: clean(match[1] || "") || undefined,
      headcount: Number(match[2]),
      countsAsWorker: true
    });
  }

  return labor.filter((item) => Number.isFinite(item.headcount));
}

function parseEquipment(raw: string) {
  const between = raw.match(/2\s*\/\s*Máy móc\s*:?(.*?)(?:\n\s*3\s*\/|\n\s*3\s*\.)/is)?.[1] || "";
  const names = [
    ["Máy xúc", /Máy\s*xúc\s*[:.]?\s*0*(\d+)/i, "máy"],
    ["Máy ủi", /Máy\s*ủi\s*[:.]?\s*0*(\d+)/i, "máy"],
    ["Máy lu", /Máy\s*lu\s*[:.]?\s*0*(\d+)/i, "máy"],
    ["Xe chuyển tải", /Xe\s*chuyển\s*tải\s*[:.]?\s*0*(\d+)/i, "xe"],
    ["Cẩu lốp", /Cẩu\s*lốp\s*[:.]?\s*0*(\d+)/i, "cẩu"],
    ["Máy ép cừ", /Máy\s*ép\s*cừ\s*[:.]?\s*0*(\d+)/i, "máy"],
    ["Ô tô", /(?:ô\s*tô|oto)\s*[:.]?\s*0*(\d+)/i, "xe"]
  ] as const;

  return names.flatMap(([equipmentName, pattern, unit]) => {
    const match = between.match(pattern);
    return match ? [{ equipmentName, quantity: Number(match[1]), unit }] : [];
  });
}

function parseTasks(raw: string) {
  const mainMatch = raw.match(/3\s*\/\s*(?:Kế hoạch công việc|Nội dung công việc)\s*:?(.*?)(?:\n\s*4\s*\/|$)/is);
  const otherMatch = raw.match(/4\s*\/\s*(?:Các công việc khác|Công việc khác)\s*:?(.*)$/is);
  const tasks: ParsedTask[] = [];

  function parseSection(text: string, kind: "main" | "other") {
    let areaLabel: string | undefined;
    for (const sourceLine of text.split(/\r?\n/)) {
      const line = clean(sourceLine);
      if (!line) continue;
      if (/^(?:Xưởng|Nhà|Khu|Bể|Hạ tầng|Tầng|\*)/i.test(line) && /:$/.test(sourceLine.trim())) {
        areaLabel = clean(line.replace(/:$/, ""));
        continue;
      }
      if (sourceLine.trim().startsWith("*") && line.length < 70) {
        areaLabel = line.replace(/:$/, "");
        continue;
      }
      tasks.push({ kind, areaLabel, descriptionVi: line.replace(/:$/, "") });
    }
  }

  if (mainMatch?.[1]) parseSection(mainMatch[1], "main");
  if (otherMatch?.[1]) parseSection(otherMatch[1], "other");
  return tasks;
}

export function parseDailyReportMessage(raw: string): ParsedDailyReport {
  const teamName = raw.match(/Đội\s*:\s*@?([^\n\r]+)/i)?.[1]?.trim();
  return {
    reportDate: extractDate(raw),
    teamName,
    labor: parseLabor(raw),
    equipment: parseEquipment(raw),
    tasks: parseTasks(raw)
  };
}
