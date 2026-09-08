import "server-only";
import { getSupabaseAdmin, STORAGE_BUCKET } from "@/lib/supabase/admin";
import { teamRank } from "@/lib/project-order";
import type {
  EquipmentEntryRow,
  Foundation,
  LaborEntryRow,
  PhotoRow,
  ProgressItem,
  ReportRow,
  ReportTaskRow,
  Role,
  SessionUser,
  WorkItemRow,
  Zone
} from "@/lib/types";

type UserRow = {
  id: string;
  username: string;
  full_name: string;
  role: Role;
};

export async function getUsers() {
  const db = getSupabaseAdmin();
  const { data, error } = await db.from("app_users").select("id,username,full_name,role").eq("active", true);
  if (error) throw error;
  return ((data || []) as UserRow[]).sort((a, b) => {
    if (a.role !== b.role) {
      if (a.role === "commander") return -1;
      if (b.role === "commander") return 1;
      if (a.role === "leader" && b.role !== "leader") return -1;
      if (b.role === "leader" && a.role !== "leader") return 1;
    }
    if (a.role === "leader" && b.role === "leader") {
      const rank = teamRank(a.full_name) - teamRank(b.full_name);
      if (rank !== 0) return rank;
    }
    return a.full_name.localeCompare(b.full_name, "vi");
  });
}

export async function getZones() {
  const db = getSupabaseAdmin();
  const { data, error } = await db.from("zones").select("id,name,group_name,scope_label,owner_id,baseline_progress,sort_order").order("sort_order");
  if (error) throw error;
  return (data || []) as Zone[];
}

export async function getMilestones() {
  const db = getSupabaseAdmin();
  const { data, error } = await db.from("project_milestones").select("id,label,start_date,finish_date,note,sort_order").order("sort_order");
  if (error) throw error;
  return data || [];
}

export async function getFoundations(user: SessionUser) {
  const db = getSupabaseAdmin();
  let query = db.from("foundations").select("id,code,zone_id,owner_id,current_stage,progress,status,first_work_date,last_work_date").order("code");
  if (user.role === "leader") query = query.eq("owner_id", user.id);
  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as Foundation[];
}

export async function getProgressItems(user: SessionUser, stage?: string) {
  const db = getSupabaseAdmin();
  let query = db.from("progress_items")
    .select("id,code,item_type,zone_id,owner_id,work_stage,planned_start,planned_finish,actual_start,actual_finish,progress,status,map_x,map_y,note,sort_order,created_at,updated_at")
    .order("sort_order")
    .order("code");
  if (user.role === "leader") query = query.eq("owner_id", user.id);
  if (stage) query = query.eq("work_stage", stage);
  const { data, error } = await query;
  if (error) {
    if (error.message?.includes("progress_items")) return [] as ProgressItem[];
    throw error;
  }
  return (data || []) as ProgressItem[];
}

export async function getProgressMap(stage: string) {
  const db = getSupabaseAdmin();
  const { data, error } = await db.from("progress_maps").select("id,work_stage,title,storage_path,created_at,updated_at").eq("work_stage", stage).maybeSingle();
  if (error) {
    if (error.message?.includes("progress_maps")) return null;
    throw error;
  }
  if (!data) return null;
  return { ...data, signedUrl: await signedPhotoUrl(data.storage_path, 60 * 60) };
}

export async function getFormMeta(user: SessionUser) {
  const [zones, users, foundations] = await Promise.all([getZones(), getUsers(), getFoundations(user)]);
  return {
    zones: user.role === "commander" ? zones : zones.filter((zone) => zone.owner_id === user.id),
    leaders: user.role === "commander" ? users.filter((item) => item.role === "leader") : [],
    foundations
  };
}

async function listReports(user: SessionUser, limit = 50, from?: string, to?: string) {
  const db = getSupabaseAdmin();
  function applyFilters(query: any) {
    let next = query;
    if (user.role === "leader") next = next.eq("leader_id", user.id);
    if (from) next = next.gte("report_date", from);
    if (to) next = next.lte("report_date", to);
    return next;
  }
  let query: any = db.from("daily_reports")
    .select("id,report_date,leader_id,workers,technical_staff,issue_text,raw_message,submitted_at,weather_morning,weather_noon,weather_afternoon,weather_evening,weather_payload,created_at,updated_at")
    .order("report_date", { ascending: false })
    .order("updated_at", { ascending: false })
    .limit(limit);
  query = applyFilters(query);
  const primary = await query;
  if (!primary.error) return (primary.data || []) as ReportRow[];
  const missingExtendedColumns = primary.error.message?.includes("raw_message") || primary.error.message?.includes("submitted_at") || primary.error.message?.includes("weather_morning") || primary.error.message?.includes("weather_noon") || primary.error.code === "42703";
  if (!missingExtendedColumns) throw primary.error;
  let fallback: any = db.from("daily_reports").select("id,report_date,leader_id,workers,technical_staff,issue_text,created_at,updated_at").order("report_date", { ascending: false }).order("updated_at", { ascending: false }).limit(limit);
  fallback = applyFilters(fallback);
  const legacy = await fallback;
  if (legacy.error) throw legacy.error;
  return (legacy.data || []).map((report: any) => ({
    ...report,
    raw_message: null,
    submitted_at: report.updated_at || report.created_at,
    weather_morning: null,
    weather_noon: null,
    weather_afternoon: null,
    weather_evening: null,
    weather_payload: null
  })) as ReportRow[];
}

async function listWorkItems(reportIds: string[]) {
  if (!reportIds.length) return [] as WorkItemRow[];
  const db = getSupabaseAdmin();
  const { data, error } = await db.from("work_items").select("id,report_id,zone_id,stage,quantity,unit,progress,foundation_codes,note,created_at").in("report_id", reportIds).order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []) as WorkItemRow[];
}

async function listLabor(reportIds: string[]) {
  if (!reportIds.length) return [] as LaborEntryRow[];
  const db = getSupabaseAdmin();
  const { data, error } = await db.from("report_labor_entries").select("id,report_id,category_code,label,crew_name,headcount,counts_as_worker,sort_order").in("report_id", reportIds).order("sort_order");
  if (error) { if (error.message?.includes("report_labor_entries")) return [] as LaborEntryRow[]; throw error; }
  return (data || []) as LaborEntryRow[];
}

async function listEquipment(reportIds: string[]) {
  if (!reportIds.length) return [] as EquipmentEntryRow[];
  const db = getSupabaseAdmin();
  const { data, error } = await db.from("report_equipment_entries").select("id,report_id,equipment_name,quantity,unit,note,sort_order").in("report_id", reportIds).order("sort_order");
  if (error) { if (error.message?.includes("report_equipment_entries")) return [] as EquipmentEntryRow[]; throw error; }
  return (data || []) as EquipmentEntryRow[];
}

async function listTasks(reportIds: string[]) {
  if (!reportIds.length) return [] as ReportTaskRow[];
  const db = getSupabaseAdmin();
  const { data, error } = await db.from("report_tasks").select("id,report_id,kind,area_label,description_vi,description_zh,sort_order").in("report_id", reportIds).order("sort_order");
  if (error) { if (error.message?.includes("report_tasks")) return [] as ReportTaskRow[]; throw error; }
  return (data || []) as ReportTaskRow[];
}

async function listPhotos(reportIds: string[]) {
  if (!reportIds.length) return [] as PhotoRow[];
  const db = getSupabaseAdmin();
  const { data, error } = await db.from("report_photos").select("id,report_id,storage_path,caption,area_label,photo_type,created_at").in("report_id", reportIds).order("created_at", { ascending: false });
  if (error) {
    if (error.message?.includes("area_label") || error.message?.includes("photo_type")) {
      const fallback = await db.from("report_photos").select("id,report_id,storage_path,caption,created_at").in("report_id", reportIds).order("created_at", { ascending: false });
      if (fallback.error) throw fallback.error;
      return (fallback.data || []).map((photo) => ({ ...photo, area_label: null, photo_type: "work" })) as PhotoRow[];
    }
    throw error;
  }
  return (data || []) as PhotoRow[];
}

export async function signedPhotoUrl(path: string, expiresIn = 60 * 30) {
  const db = getSupabaseAdmin();
  const { data, error } = await db.storage.from(STORAGE_BUCKET).createSignedUrl(path, expiresIn);
  if (error) return null;
  return data.signedUrl;
}

async function enrichReports(reports: ReportRow[]) {
  const [users, zones] = await Promise.all([getUsers(), getZones()]);
  const reportIds = reports.map((report) => report.id);
  const [items, labor, equipment, tasks, photos] = await Promise.all([listWorkItems(reportIds), listLabor(reportIds), listEquipment(reportIds), listTasks(reportIds), listPhotos(reportIds)]);
  const userMap = new Map(users.map((item) => [item.id, item]));
  const zoneMap = new Map(zones.map((zone) => [zone.id, zone]));
  const photoEntries = await Promise.all(photos.slice(0, 160).map(async (photo) => ({ ...photo, signedUrl: await signedPhotoUrl(photo.storage_path) })));
  return reports.map((report) => ({
    ...report,
    leader: userMap.get(report.leader_id),
    workItems: items.filter((item) => item.report_id === report.id).map((item) => ({ ...item, zone: zoneMap.get(item.zone_id) })),
    labor: labor.filter((item) => item.report_id === report.id),
    equipment: equipment.filter((item) => item.report_id === report.id),
    tasks: tasks.filter((item) => item.report_id === report.id),
    photos: photoEntries.filter((photo) => photo.report_id === report.id)
  }));
}

export async function getReportHistory(user: SessionUser, limit = 40) { return enrichReports(await listReports(user, limit)); }
export async function getReportRange(user: SessionUser, from: string, to: string) { return enrichReports(await listReports(user, 500, from, to)); }

export async function getDashboardData(user: SessionUser) {
  const [reports, foundations, users, zones, milestones] = await Promise.all([listReports(user, 14), getFoundations(user), getUsers(), getZones(), getMilestones()]);
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(new Date());
  const todayReports = reports.filter((report) => report.report_date === today);
  const workersToday = todayReports.reduce((sum, report) => sum + Number(report.workers || 0), 0);
  const technicalToday = todayReports.reduce((sum, report) => sum + Number(report.technical_staff || 0), 0);
  const visibleZones = user.role === "commander" ? zones : zones.filter((zone) => zone.owner_id === user.id);
  const zoneProgress = visibleZones.map((zone) => {
    const values = foundations.filter((foundation) => foundation.zone_id === zone.id).map((foundation) => Number(foundation.progress || 0));
    const progress = values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : Number(zone.baseline_progress || 0);
    return { ...zone, progress };
  });
  const averageProgress = zoneProgress.length ? zoneProgress.reduce((sum, zone) => sum + zone.progress, 0) / zoneProgress.length : 0;
  const reportsWithDetails = await getReportHistory(user, 8);
  return { today, workersToday, technicalToday, teamsReported: new Set(todayReports.map((report) => report.leader_id)).size, foundationCount: foundations.length, averageProgress, users, zones: zoneProgress, recentReports: reportsWithDetails, milestones };
}

export async function getTeamSummary() {
  const [users, zones] = await Promise.all([getUsers(), getZones()]);
  const db = getSupabaseAdmin();
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(new Date());
  const [{ data: reports, error: reportError }, { data: foundations, error: foundationError }] = await Promise.all([
    db.from("daily_reports").select("leader_id,workers,technical_staff,report_date").eq("report_date", today),
    db.from("foundations").select("owner_id,progress")
  ]);
  if (reportError) throw reportError;
  if (foundationError) throw foundationError;
  return users.filter((item) => item.role === "leader").map((leader) => {
    const teamFoundations = (foundations || []).filter((foundation) => foundation.owner_id === leader.id);
    const progress = teamFoundations.length ? teamFoundations.reduce((sum, foundation) => sum + Number(foundation.progress || 0), 0) / teamFoundations.length : 0;
    const todayReport = (reports || []).find((report) => report.leader_id === leader.id);
    return { ...leader, zones: zones.filter((zone) => zone.owner_id === leader.id), workers: Number(todayReport?.workers || 0), technicalStaff: Number(todayReport?.technical_staff || 0), reported: Boolean(todayReport), foundationCount: teamFoundations.length, progress };
  });
}
