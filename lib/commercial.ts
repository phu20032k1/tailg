import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { SessionUser } from "@/lib/types";
import { PAYMENT_STATUS_LABELS } from "@/lib/commercial-shared";

export { PAYMENT_STATUS_LABELS } from "@/lib/commercial-shared";
export const DOCUMENT_BUCKET = "project-documents";

export function canSeeCommercial(user: SessionUser) { return ["commander", "khkt", "director", "finance", "leader"].includes(user.role); }
export function canCreatePayment(user: SessionUser) { return user.role === "commander"; }

function normalizePackages(rows: any[], paymentRequests: any[] = []) {
  return rows.map((item: any) => {
    const updates = [...(item.work_package_updates || [])].sort((a: any, b: any) => String(b.update_date).localeCompare(String(a.update_date)));
    const latest = updates[0] || null;
    const current = latest ? Number(latest.cumulative_quantity || 0) : Number(item.current_quantity || 0);
    const planned = Number(item.planned_quantity || 0);
    const percent = planned > 0 ? Math.min(100, (current / planned) * 100) : 0;
    const finish = item.planned_finish ? new Date(`${item.planned_finish}T23:59:59+07:00`) : null;
    const overdue = Boolean(finish && finish.getTime() < Date.now() && percent < 100);
    const quantityRequests = paymentRequests.filter((row:any)=>row.work_package_id===item.id && row.status!=="cancelled");
    const claimedQuantity = quantityRequests.reduce((sum:number,row:any)=>sum+Number(row.quantity_claimed||0),0);
    const paidQuantity = quantityRequests.filter((row:any)=>row.status==="paid").reduce((sum:number,row:any)=>sum+Number(row.quantity_claimed||0),0);
    return { ...item, updates, latest, current, percent, overdue, claimedQuantity, paidQuantity, claimRemaining: planned - claimedQuantity, claimOver: planned > 0 && claimedQuantity > planned };
  });
}

function subcontractDashboard(contracts: any[], requests: any[]) {
  const subcontractContracts = contracts.filter((item:any)=>item.contract_kind === "subcontract");
  const rows = subcontractContracts.map((contract:any) => {
    const related = requests.filter((row:any)=>row.request_type === "subcontractor" && row.contract_id === contract.id && row.status !== "cancelled");
    const contractValue = Number(contract.after_tax_value || 0);
    const certifiedValue = related.reduce((sum:number,row:any)=>sum + Number(row.certified_amount || 0), 0);
    const paidValue = related.reduce((sum:number,row:any)=>sum + Number(row.amount_paid || 0), 0);
    const requestedValue = related.reduce((sum:number,row:any)=>sum + Number(row.amount_requested || 0), 0);
    const boqBudgetValue = Number(contract.boq_budget_value || 0);
    const efficiencyValue = boqBudgetValue > 0 ? boqBudgetValue - contractValue : null;
    const efficiencyPercent = boqBudgetValue > 0 ? ((boqBudgetValue - contractValue) / boqBudgetValue) * 100 : null;
    return {
      ...contract,
      groupName: String(contract.company_group || contract.counterparty || "NHÀ THẦU KHÁC").trim(),
      contractValue,
      certifiedValue,
      paidValue,
      requestedValue,
      remainingValue: Math.max(0, contractValue - paidValue),
      remainingToCertify: Math.max(0, contractValue - certifiedValue),
      boqBudgetValue,
      efficiencyValue,
      efficiencyPercent,
      certifiedPercent: contractValue > 0 ? Math.min(100, (certifiedValue / contractValue) * 100) : 0,
      paidPercent: contractValue > 0 ? Math.min(100, (paidValue / contractValue) * 100) : 0,
      contractQuantity: Number(contract.contract_quantity || 0),
      quantityUnit: contract.quantity_unit || null,
      requestCount: related.length
    };
  });

  const groups = new Map<string, any[]>();
  for (const row of rows) {
    const list = groups.get(row.groupName) || [];
    list.push(row);
    groups.set(row.groupName, list);
  }

  const companies = [...groups.entries()].map(([name, companyContracts]) => {
    const total = (key:string) => companyContracts.reduce((sum:number,row:any)=>sum + Number(row[key] || 0), 0);
    const contractValue = total("contractValue");
    const certifiedValue = total("certifiedValue");
    const paidValue = total("paidValue");
    const boqBudgetValue = total("boqBudgetValue");
    const efficiencyValue = boqBudgetValue > 0 ? boqBudgetValue - contractValue : null;
    return {
      name,
      contracts: companyContracts,
      contractCount: companyContracts.length,
      contractValue,
      certifiedValue,
      paidValue,
      remainingValue: Math.max(0, contractValue - paidValue),
      boqBudgetValue,
      efficiencyValue,
      efficiencyPercent: boqBudgetValue > 0 ? ((boqBudgetValue - contractValue) / boqBudgetValue) * 100 : null,
      certifiedPercent: contractValue > 0 ? Math.min(100, (certifiedValue / contractValue) * 100) : 0,
      paidPercent: contractValue > 0 ? Math.min(100, (paidValue / contractValue) * 100) : 0
    };
  }).sort((a:any,b:any)=>a.name.localeCompare(b.name,"vi"));

  const summary = {
    companyCount: companies.length,
    contractCount: rows.length,
    contractValue: rows.reduce((sum:number,row:any)=>sum + row.contractValue,0),
    certifiedValue: rows.reduce((sum:number,row:any)=>sum + row.certifiedValue,0),
    paidValue: rows.reduce((sum:number,row:any)=>sum + row.paidValue,0),
    boqBudgetValue: rows.reduce((sum:number,row:any)=>sum + row.boqBudgetValue,0)
  };
  return {
    companies,
    summary: {
      ...summary,
      remainingValue: Math.max(0, summary.contractValue - summary.paidValue),
      efficiencyValue: summary.boqBudgetValue > 0 ? summary.boqBudgetValue - summary.contractValue : null,
      efficiencyPercent: summary.boqBudgetValue > 0 ? ((summary.boqBudgetValue - summary.contractValue) / summary.boqBudgetValue) * 100 : null,
      certifiedPercent: summary.contractValue > 0 ? Math.min(100, (summary.certifiedValue / summary.contractValue) * 100) : 0,
      paidPercent: summary.contractValue > 0 ? Math.min(100, (summary.paidValue / summary.contractValue) * 100) : 0
    }
  };
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
  for (const result of [contractsRes, scheduleRes, requestsRes, docsRes, eventsRes, materialsRes, costsRes, packagesRes, usersRes]) if (result.error) throw result.error;

  const documents = await Promise.all((docsRes.data || []).map(async (doc: any) => {
    const { data } = await db.storage.from(DOCUMENT_BUCKET).createSignedUrl(doc.storage_path, 60 * 30);
    return { ...doc, signedUrl: data?.signedUrl || null };
  }));
  const users = usersRes.data || [];
  const userName = (id?: string | null) => users.find((item: any) => item.id === id)?.full_name || null;
  const packages = normalizePackages(packagesRes.data || [], requestsRes.data || []);
  const packageMap = new Map(packages.map((item:any)=>[item.id,item]));

  const requests = (requestsRes.data || []).map((request: any) => ({
    ...request,
    workPackage: request.work_package_id ? packageMap.get(request.work_package_id) || null : null,
    documents: documents.filter((doc: any) => doc.request_id === request.id),
    events: (eventsRes.data || []).filter((event: any) => event.request_id === request.id).map((event: any) => ({ ...event, actor_name: userName(event.actor_id) }))
  }));

  const materials = (materialsRes.data || []).map((item: any) => {
    const receipts = [...(item.material_receipts || [])].sort((a: any, b: any) => String(a.receipt_date).localeCompare(String(b.receipt_date)));
    const received = receipts.reduce((sum: number, row: any) => sum + Number(row.quantity || 0), 0);
    const budget = Number(item.budget_quantity || 0);
    return { ...item, receipts, received, remaining: budget - received, overBudget: budget > 0 && received > budget, percent: budget > 0 ? (received / budget) * 100 : 0 };
  });

  const contracts = contractsRes.data || [];
  const ownerContract = contracts.find((item: any) => item.contract_kind === "owner") || null;
  const subcontractRequests = requests.filter((item: any) => item.request_type === "subcontractor");
  const totalPaid = subcontractRequests.filter((item: any) => item.status === "paid").reduce((sum: number, item: any) => sum + Number(item.amount_paid || 0), 0);
  const pendingPayment = subcontractRequests.filter((item: any) => !["paid", "cancelled"].includes(item.status)).reduce((sum: number, item: any) => sum + Number(item.amount_requested || 0), 0);
  const totalCosts = (costsRes.data || []).reduce((sum: number, item: any) => sum + Number(item.amount || 0), 0);
  const materialWarnings = materials.filter((item: any) => item.overBudget || item.percent >= 90).length;
  const subcontract = subcontractDashboard(contracts, requests);

  return {
    contracts, ownerContract, schedule: scheduleRes.data || [], requests, materials, costs: costsRes.data || [], packages, users,
    subcontractCompanies: subcontract.companies,
    subcontractSummary: subcontract.summary,
    summary: { ownerContractValue: Number(ownerContract?.after_tax_value || 0), totalPaid, pendingPayment, totalCosts, materialWarnings, activeRequests: subcontractRequests.filter((item: any) => !["paid", "cancelled"].includes(item.status)).length }
  };
}
