import "server-only";
import type { SessionUser } from "@/lib/types";
import { getFoundations, getReportRange, getUsers, getZones } from "@/lib/data";
import { areaRank, teamRank } from "@/lib/project-order";

function uniqueText(values: Array<string | null | undefined>) {
  return [...new Set(values.map((value) => (value || "").trim()).filter(Boolean))];
}

export async function getDailyManagementReport(user: SessionUser, date: string) {
  const [reports, users, zones, foundations] = await Promise.all([
    getReportRange(user, date, date),
    getUsers(),
    getZones(),
    getFoundations(user)
  ]);

  const leaders = users
    .filter((item) => item.role === "leader")
    .sort((a, b) => teamRank(a.full_name) - teamRank(b.full_name));

  const teamRows = leaders.map((leader, index) => {
    const teamReports = reports
      .filter((report) => report.leader_id === leader.id)
      .sort((a, b) => String(b.updated_at || "").localeCompare(String(a.updated_at || "")));
    const report = teamReports[0];
    const teamZones = zones
      .filter((zone) => zone.owner_id === leader.id)
      .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0));
    const teamFoundations = foundations.filter((item) => item.owner_id === leader.id);
    const completedFoundations = teamFoundations.filter((item) => item.status === "completed" || Number(item.progress || 0) >= 100).length;

    const labor = [...(report?.labor || [])].sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0));
    const equipment = [...(report?.equipment || [])]
      .filter((item) => Number(item.quantity || 0) > 0)
      .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0));
    const tasks = [...(report?.tasks || [])].sort((a, b) => {
      const areaDiff = areaRank(a.area_label) - areaRank(b.area_label);
      return areaDiff || Number(a.sort_order || 0) - Number(b.sort_order || 0);
    });
    const workItems = [...(report?.workItems || [])].sort((a, b) => areaRank(a.zone?.name) - areaRank(b.zone?.name));
    const photos = (report?.photos || []).filter((photo) => Boolean(photo.signedUrl));

    return {
      stt: index + 1,
      leader,
      report,
      reported: Boolean(report),
      zones: teamZones,
      zoneLabel: teamZones.map((zone) => zone.name).join(" · "),
      workers: Number(report?.workers || 0),
      technical: Number(report?.technical_staff || 0),
      totalPeople: Number(report?.workers || 0) + Number(report?.technical_staff || 0),
      labor,
      equipment,
      tasks,
      workItems,
      photos,
      issueText: report?.issue_text || "",
      weatherMorning: report?.weather_morning || "",
      weatherNoon: report?.weather_noon || "",
      weatherAfternoon: report?.weather_afternoon || "",
      weatherEvening: report?.weather_evening || "",
      foundationCount: teamFoundations.length,
      completedFoundations,
      foundationProgress: teamFoundations.length
        ? teamFoundations.reduce((sum, item) => sum + Number(item.progress || 0), 0) / teamFoundations.length
        : 0
    };
  });

  const reported = teamRows.filter((team) => team.reported);
  const totalWorkers = reported.reduce((sum, team) => sum + team.workers, 0);
  const totalTechnical = reported.reduce((sum, team) => sum + team.technical, 0);
  const totalPeople = totalWorkers + totalTechnical;
  const totalTasks = reported.reduce((sum, team) => sum + team.tasks.length, 0);
  const totalEquipment = reported.reduce((sum, team) => sum + team.equipment.reduce((n, item) => n + Number(item.quantity || 0), 0), 0);
  const totalPhotos = reported.reduce((sum, team) => sum + team.photos.length, 0);
  const totalFoundationUpdates = reported.reduce((sum, team) => sum + team.workItems.length, 0);

  const laborTotals = new Map<string, { label: string; headcount: number }>();
  for (const team of reported) {
    for (const item of team.labor) {
      const current = laborTotals.get(item.category_code) || { label: item.label, headcount: 0 };
      current.headcount += Number(item.headcount || 0);
      laborTotals.set(item.category_code, current);
    }
  }

  const equipmentTotals = new Map<string, { name: string; quantity: number; unit: string }>();
  for (const team of reported) {
    for (const item of team.equipment) {
      const key = `${item.equipment_name}|${item.unit}`;
      const current = equipmentTotals.get(key) || { name: item.equipment_name, quantity: 0, unit: item.unit };
      current.quantity += Number(item.quantity || 0);
      equipmentTotals.set(key, current);
    }
  }

  const workSummary = reported.flatMap((team) => team.tasks.map((task) => ({
    team: team.leader.full_name,
    area: task.area_label || team.zoneLabel || "Công trường",
    kind: task.kind,
    descriptionVi: task.description_vi,
    descriptionZh: task.description_zh || ""
  }))).sort((a, b) => areaRank(a.area) - areaRank(b.area) || teamRank(a.team) - teamRank(b.team));

  const updatedAt = reported
    .map((team) => team.report?.updated_at || team.report?.submitted_at || "")
    .filter(Boolean)
    .sort()
    .at(-1) || null;

  return {
    date,
    teamRows,
    workSummary,
    summary: {
      teamsReported: reported.length,
      totalWorkers,
      totalTechnical,
      totalPeople,
      totalTasks,
      totalEquipment,
      totalPhotos,
      totalFoundationUpdates,
      weatherMorning: uniqueText(reported.map((team) => team.weatherMorning)).join(" / ") || "Chưa ghi nhận",
      weatherNoon: uniqueText(reported.map((team) => team.weatherNoon)).join(" / ") || "Chưa ghi nhận",
      weatherAfternoon: uniqueText(reported.map((team) => team.weatherAfternoon)).join(" / ") || "Chưa ghi nhận",
      weatherEvening: uniqueText(reported.map((team) => team.weatherEvening)).join(" / ") || "Chưa ghi nhận",
      laborTotals: [...laborTotals.values()],
      equipmentTotals: [...equipmentTotals.values()].sort((a, b) => a.name.localeCompare(b.name, "vi")),
      updatedAt
    }
  };
}
