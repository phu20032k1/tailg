import { notFound, redirect } from "next/navigation";
import { Pencil } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { EditReportForm } from "@/components/edit-report-form";

export default async function EditReportPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const db = getSupabaseAdmin();

  const { data: report, error } = await db
    .from("daily_reports")
    .select("id,report_date,leader_id,raw_message,issue_text")
    .eq("id", id)
    .maybeSingle();

  if (error || !report) notFound();
  if (user.role === "leader" && report.leader_id !== user.id) redirect("/reports");

  const [{ data: labor }, { data: equipment }, { data: tasks }, { data: leader }] = await Promise.all([
    db.from("report_labor_entries").select("category_code,label,crew_name,headcount,counts_as_worker,sort_order").eq("report_id", id).order("sort_order"),
    db.from("report_equipment_entries").select("equipment_name,quantity,unit,note,sort_order").eq("report_id", id).order("sort_order"),
    db.from("report_tasks").select("kind,area_label,description_vi,description_zh,sort_order").eq("report_id", id).order("sort_order"),
    db.from("app_users").select("full_name").eq("id", report.leader_id).maybeSingle()
  ]);

  const editReport = {
    id: report.id,
    reportDate: report.report_date,
    rawMessage: report.raw_message || "",
    issueText: report.issue_text || "",
    labor: (labor || []).map((item) => ({
      categoryCode: item.category_code,
      label: item.label,
      crewName: item.crew_name || "",
      headcount: Number(item.headcount || 0),
      countsAsWorker: Boolean(item.counts_as_worker)
    })),
    equipment: (equipment || []).map((item) => ({
      equipmentName: item.equipment_name,
      quantity: Number(item.quantity || 0),
      unit: item.unit || "máy",
      note: item.note || ""
    })),
    tasks: (tasks || []).map((item) => ({
      kind: item.kind as "main" | "other",
      areaLabel: item.area_label || "",
      descriptionVi: item.description_vi,
      descriptionZh: item.description_zh || ""
    }))
  };

  return (
    <>
      <section className="page-title-row">
        <div>
          <span className="eyebrow">CHỈNH SỬA BÁO CÁO</span>
          <h1>{leader?.full_name || "Đội thi công"}</h1>
          <p>Có thể đổi ngày, nhân lực, máy móc và nội dung công việc đã nhập.</p>
        </div>
        <div className="page-title-icon"><Pencil size={24} /></div>
      </section>
      <div className="panel"><div className="panel-body"><EditReportForm report={editReport} /></div></div>
    </>
  );
}
