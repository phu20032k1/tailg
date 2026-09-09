import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

function normText(value: unknown) {
  return String(value || "").trim().toLocaleUpperCase("vi-VN").replace(/\s+/g, " ");
}

function materialKey(name: unknown, spec: unknown, unit: unknown) {
  return [normText(name), normText(spec), normText(unit)].join("|");
}

export async function getMaterialTakeoffData() {
  const db = getSupabaseAdmin();
  const [normsRes, worksRes, budgetsRes] = await Promise.all([
    db.from("material_norms").select("*").eq("active", true).order("work_name").order("material_name"),
    db.from("design_work_items").select("*").order("created_at", { ascending: false }),
    db.from("material_budgets").select("id,material_name,material_spec,unit,material_receipts(quantity,receipt_date)").eq("active", true)
  ]);
  for (const result of [normsRes, worksRes, budgetsRes]) if (result.error) throw result.error;

  const norms = normsRes.data || [];
  const works = worksRes.data || [];
  const receiptTotals = new Map<string, number>();
  for (const budget of budgetsRes.data || []) {
    const key = materialKey(budget.material_name, budget.material_spec, budget.unit);
    const qty = (budget.material_receipts || []).reduce((sum: number, row: any) => sum + Number(row.quantity || 0), 0);
    receiptTotals.set(key, (receiptTotals.get(key) || 0) + qty);
  }

  const requirementRows: any[] = [];
  const summaryMap = new Map<string, any>();
  for (const work of works) {
    const workNorms = norms.filter((row: any) => normText(row.work_code) === normText(work.work_code));
    for (const row of workNorms) {
      const base = Number(work.quantity || 0) * Number(row.consumption_rate || 0);
      const required = base * (1 + Number(row.waste_percent || 0) / 100);
      const key = materialKey(row.material_name, row.material_spec, row.material_unit);
      const item = {
        workId: work.id,
        workCode: work.code,
        workTitle: work.title,
        areaLabel: work.area_label,
        designQuantity: Number(work.quantity || 0),
        workUnit: work.unit,
        normWorkCode: row.work_code,
        normWorkName: row.work_name,
        materialName: row.material_name,
        materialSpec: row.material_spec,
        materialUnit: row.material_unit,
        consumptionRate: Number(row.consumption_rate || 0),
        wastePercent: Number(row.waste_percent || 0),
        required
      };
      requirementRows.push(item);
      const current = summaryMap.get(key) || {
        key,
        materialName: row.material_name,
        materialSpec: row.material_spec,
        unit: row.material_unit,
        required: 0,
        received: receiptTotals.get(key) || 0,
        sources: 0
      };
      current.required += required;
      current.sources += 1;
      summaryMap.set(key, current);
    }
  }

  const summary = [...summaryMap.values()].map((item: any) => {
    const percent = item.required > 0 ? (item.received / item.required) * 100 : 0;
    return {
      ...item,
      percent,
      remaining: item.required - item.received,
      over: item.required > 0 && item.received > item.required + 1e-9,
      near: item.required > 0 && percent >= 90 && percent <= 100
    };
  }).sort((a: any, b: any) => String(a.materialName).localeCompare(String(b.materialName), "vi"));

  const workTypes = [...new Map(norms.map((row: any) => [normText(row.work_code), {
    code: row.work_code,
    name: row.work_name,
    unit: row.work_unit
  }])).values()];

  return {
    norms,
    works,
    requirementRows,
    materialSummary: summary,
    workTypes,
    totals: {
      workItems: works.length,
      normRows: norms.length,
      materialTypes: summary.length,
      warnings: summary.filter((item: any) => item.over || item.near).length
    }
  };
}
