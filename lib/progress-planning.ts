import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getWorkPackages } from "@/lib/commercial";
import type { SessionUser } from "@/lib/types";

export async function getProgressPlanningData(user: SessionUser) {
  const db = getSupabaseAdmin();
  const [packages, usersRes, assigneesRes, columnsRes] = await Promise.all([
    getWorkPackages(user),
    db.from("app_users").select("id,username,full_name,role,active").eq("active", true).order("full_name"),
    db.from("work_package_assignees").select("work_package_id,user_id"),
    db.from("progress_custom_columns").select("*").eq("active", true).order("sort_order").order("created_at")
  ]);
  for (const result of [usersRes, assigneesRes, columnsRes]) if (result.error) throw result.error;
  const users = usersRes.data || [];
  const userMap = new Map(users.map((row:any)=>[row.id,row]));
  const assignees = assigneesRes.data || [];
  const enriched = (packages as any[]).map((item:any)=>({
    ...item,
    assignees: assignees.filter((row:any)=>row.work_package_id===item.id).map((row:any)=>userMap.get(row.user_id)).filter(Boolean)
  }));
  return { packages: enriched, users, columns: columnsRes.data || [] };
}

export async function getDeadlineAlerts(user: SessionUser) {
  const db = getSupabaseAdmin();
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(new Date());
  const { data: assigned, error } = await db.from("work_package_assignees").select("work_package_id,work_packages(id,code,title,planned_finish,planned_quantity,current_quantity,status)").eq("user_id", user.id);
  if (error) return [];
  return (assigned || []).map((row:any)=>row.work_packages).filter((item:any)=>item && item.planned_finish && item.planned_finish <= today && Number(item.current_quantity || 0) < Number(item.planned_quantity || 0));
}
