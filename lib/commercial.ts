import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { SessionUser } from "@/lib/types";
import { PAYMENT_STATUS_LABELS } from "@/lib/commercial-shared";

export { PAYMENT_STATUS_LABELS } from "@/lib/commercial-shared";
export const DOCUMENT_BUCKET = "project-documents";

export function canSeeCommercial(user: SessionUser) {
  return ["commander", "khkt", "director", "finance"].includes(user.role);
}

export function canCreatePayment(user: SessionUser) {
  return user.role === "commander";
}

function normalizePackages(rows: any[]) {
  return rows.map((item: any) => {
    const updates = [...(item.work_package_updates || [])].sort((a: any, b: any) => String(b.update_date).localeCompare(String(a.update_date)));
    const latest = updates[0] || null;
    const current = latest ? Number(latest.cumulative_quantity || 0) : Number(item.current_quantity || 0);
    const planned = Number(item.planned_quantity || 0);
    const percent = planned > 0 ? Math.min(100, (current / planned) * 100) : 0;
    const finish = item.planned_finish ? new Date(`${item.planned_finish}T23:59:59+07:00`) : null;
    const overdue = Boolean(finish && finish.getTime() < Date.now() && percent < 100);
    return { ...item, updates, latest, current, percent, overdue };
  });
}

export async function getWorkPackages(user?: SessionUser) {
  const db = getSupabaseAdmin();
  let query = db.from("work_packages").select("*,work_package_updates(*)").order("sort_order").order("code");
  if (user?.role === "leader") query = query.eq("owner_type", "team").eq("owner_name", user.fullName);
  const { data, error } = await query;
  if (error) throw error;
  return normalizePackages(data || []);
}

export async function getCommercialData() {
  const db = getSupabaseAdmin();
  const [contractsRes, scheduleRes, requestsRes, docsRes, eventsRes, materialsRes, costsRes, packagesRes, usersRes] = await Promise.all([
    db.from("commercial_contracts").select("*").eq("active", true).order("contract_kind").order("counterparty"),
    db.from("owner_payment_schedule").select("*").order("planned_date").order("sort_order"),
    db.from("payment_requests").select("*,commercial_contracts(id,contract_no,counterparty,scope,after_tax_value)").order("updated_at", { ascending: false }),
    db.from("payment_documents").select("*").order("created_at"),
    db.from("payment_approval_events").select("*").order("created_at"),
    db.from("material_budgets").select("*,material_receipts(*)").order("material_name"),
    db.from("cost_entries").select("*").order("cost_date", { ascending: false }).order("created_at", { ascending: false }),
    db.from("work_packages").select("*,work_package_updates(*)").order("sort_order").order("code"),
    db.from("app_users").select("id,username,full_name,role,active").eq("active", true)
  ]);

  for (const result of [contractsRes, scheduleRes, requestsRes, docsRes, eventsRes, materialsRes, costsRes, packagesRes, usersRes]) {
    if (result.error) throw result.error;
  }

  const documents = await Promise.all((docsRes.data || []).map(async (doc: any) => {
    const { data } = await db.storage.from(DOCUMENT_BUCKET).createSignedUrl(doc.storage_path, 60 * 30);
    return { ...doc, signedUrl: data?.signedUrl || null };
  }));

  const users = usersRes.data || [];
  const userName = (id?: string | null) => users.find((item: any) => item.id === id)?.full_name || null;

  const requests = (requestsRes.data || []).map((request: any) => ({
    ...request,
    documents: documents.filter((doc: any) => doc.request_id === request.id),
    events: (eventsRes.data || []).filter((event: any) => event.request_id === request.id).map((event: any) => ({ ...event, actor_name: userName(event.actor_id) }))
  }));

  const materials = (materialsRes.data || []).map((item: any) => {
    const receipts = [...(item.material_receipts || [])].sort((a: any, b: any) => String(a.receipt_date).localeCompare(String(b.receipt_date)));
    const received = receipts.reduce((sum: number, row: any) => sum + Number(row.quantity || 0), 0);
    const budget = Number(item.budget_quantity || 0);
    const remaining = budget - received;
    return { ...item, receipts, received, remaining, overBudget: budget > 0 && received > budget, percent: budget > 0 ? (received / budget) * 100 : 0 };
  });

  const packages = normalizePackages(packagesRes.data || []);
  const ownerContract = (contractsRes.data || []).find((item: any) => item.contract_kind === "owner") || null;
  const subcontractRequests = requests.filter((item: any) => item.request_type === "subcontractor");
  const totalPaid = subcontractRequests.filter((item: any) => item.status === "paid").reduce((sum: number, item: any) => sum + Number(item.amount_paid || 0), 0);
  const pendingPayment = subcontractRequests.filter((item: any) => !["paid", "cancelled"].includes(item.status)).reduce((sum: number, item: any) => sum + Number(item.amount_requested || 0), 0);
  const totalCosts = (costsRes.data || []).reduce((sum: number, item: any) => sum + Number(item.amount || 0), 0);
  const materialWarnings = materials.filter((item: any) => item.overBudget || item.percent >= 90).length;

  return {
    contracts: contractsRes.data || [],
    ownerContract,
    schedule: scheduleRes.data || [],
    requests,
    materials,
    costs: costsRes.data || [],
    packages,
    users,
    summary: {
      ownerContractValue: Number(ownerContract?.after_tax_value || 0),
      totalPaid,
      pendingPayment,
      totalCosts,
      materialWarnings,
      activeRequests: subcontractRequests.filter((item: any) => !["paid", "cancelled"].includes(item.status)).length
    }
  };
}
