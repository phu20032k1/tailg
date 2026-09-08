import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { SessionUser } from "@/lib/types";

export const MATERIAL_REQUEST_STATUS: Record<string,string> = {
  commander_review: "Chờ Ban điều hành xác nhận",
  khkt_review: "Chờ Phòng KTKT kiểm tra",
  approved: "Đã được KTKT duyệt",
  received: "Đã nhập thực tế",
  returned_to_team: "Ban trả lại đội",
  returned_to_commander: "KTKT trả lại Ban",
  cancelled: "Đã hủy"
};

export async function getMaterialManagementData(user: SessionUser) {
  const db = getSupabaseAdmin();
  const [usersRes,budgetsRes,requestsRes,eventsRes] = await Promise.all([
    db.from("app_users").select("id,username,full_name,role,active").eq("active",true),
    db.from("material_budgets").select("*,material_receipts(*)").eq("active",true).order("material_name").order("stage_label"),
    db.from("material_requests").select("*").order("request_date",{ascending:false}).order("created_at",{ascending:false}),
    db.from("material_request_events").select("*").order("created_at")
  ]);
  for (const result of [usersRes,budgetsRes,requestsRes,eventsRes]) if (result.error) throw result.error;

  const users = usersRes.data || [];
  const userMap = new Map(users.map((row:any)=>[row.id,row]));
  const rawBudgets = budgetsRes.data || [];
  const rawRequests = requestsRes.data || [];
  const rawEvents = eventsRes.data || [];

  const childAllocation = new Map<string,number>();
  for (const row of rawBudgets) {
    if (!row.parent_budget_id) continue;
    childAllocation.set(row.parent_budget_id,(childAllocation.get(row.parent_budget_id)||0)+Number(row.budget_quantity||0));
  }

  const materialsAll = rawBudgets.map((item:any)=>{
    const receipts=[...(item.material_receipts||[])].sort((a:any,b:any)=>String(a.receipt_date).localeCompare(String(b.receipt_date)));
    const received=receipts.reduce((sum:number,row:any)=>sum+Number(row.quantity||0),0);
    const budget=Number(item.budget_quantity||0);
    const ownRequests=rawRequests.filter((row:any)=>row.material_budget_id===item.id && !["cancelled"].includes(row.status));
    const requested=ownRequests.reduce((sum:number,row:any)=>sum+Number(row.quantity_approved ?? row.quantity_requested ?? 0),0);
    const pending=ownRequests.filter((row:any)=>["commander_review","khkt_review","returned_to_commander"].includes(row.status)).reduce((sum:number,row:any)=>sum+Number(row.quantity_approved ?? row.quantity_requested ?? 0),0);
    return {
      ...item,
      receipts,
      received,
      requested,
      pending,
      remaining:budget-received,
      overBudget:budget>0&&received>budget,
      percent:budget>0?(received/budget)*100:0,
      allocatedToChildren:childAllocation.get(item.id)||0,
      allocationRemaining:budget-(childAllocation.get(item.id)||0),
      team:userMap.get(item.owner_team_id)||null,
      parent:rawBudgets.find((row:any)=>row.id===item.parent_budget_id)||null
    };
  });

  const visibleBudgetIds = new Set<string>();
  if (user.role === "leader") {
    for (const item of materialsAll) if (item.owner_team_id===user.id) {
      visibleBudgetIds.add(item.id);
      let parentId=item.parent_budget_id;
      while(parentId){
        visibleBudgetIds.add(parentId);
        const parent=materialsAll.find((row:any)=>row.id===parentId);
        parentId=parent?.parent_budget_id||null;
      }
    }
  } else {
    for (const item of materialsAll) visibleBudgetIds.add(item.id);
  }
  const materials=materialsAll.filter((item:any)=>visibleBudgetIds.has(item.id));

  const materialRequests = rawRequests
    .filter((row:any)=>user.role!=="leader" || row.team_id===user.id)
    .map((row:any)=>({
      ...row,
      team:userMap.get(row.team_id)||null,
      budget:materialsAll.find((item:any)=>item.id===row.material_budget_id)||null,
      events:rawEvents.filter((event:any)=>event.request_id===row.id).map((event:any)=>({...event,actor:userMap.get(event.actor_id)||null}))
    }));

  return {
    users,
    leaders:users.filter((row:any)=>row.role==="leader"),
    materials,
    materialRequests,
    summary:{
      budgets:materials.filter((row:any)=>row.allocation_level==="team").length,
      pending:materialRequests.filter((row:any)=>["commander_review","khkt_review","returned_to_commander"].includes(row.status)).length,
      approved:materialRequests.filter((row:any)=>["approved","received"].includes(row.status)).length,
      warnings:materials.filter((row:any)=>row.percent>=90||row.overBudget||row.allocationRemaining<0).length
    }
  };
}
