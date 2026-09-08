import { notFound, redirect } from "next/navigation";
import { History, Pencil } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { EditReportForm } from "@/components/edit-report-form";

function formatEditTime(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Asia/Ho_Chi_Minh"
  }).format(new Date(value));
}

export default async function EditReportPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const db = getSupabaseAdmin();

  const { data: report, error } = await db
    .from("daily_reports")
    .select("id,report_date,leader_id,raw_message,issue_text,weather_morning,weather_noon,weather_afternoon,weather_evening")
    .eq("id", id)
    .maybeSingle();

  if (error || !report) notFound();
  if (user.role === "leader" && report.leader_id !== user.id) redirect("/reports");
  if (!["leader", "commander"].includes(user.role)) redirect("/reports");

  const [{ data: labor }, { data: equipment }, { data: tasks }, { data: leader }, { data: history }] = await Promise.all([
    db.from("report_labor_entries").select("category_code,label,crew_name,headcount,counts_as_worker,sort_order").eq("report_id", id).order("sort_order"),
    db.from("report_equipment_entries").select("equipment_name,quantity,unit,note,sort_order").eq("report_id", id).order("sort_order"),
    db.from("report_tasks").select("kind,area_label,description_vi,description_zh,sort_order").eq("report_id", id).order("sort_order"),
    db.from("app_users").select("full_name").eq("id", report.leader_id).maybeSingle(),
    db.from("report_edit_history").select("id,edited_by_name,edited_at,change_summary,before_data,after_data").eq("report_id", id).order("edited_at", { ascending: false }).limit(30)
  ]);

  const editReport = {
    id: report.id,
    reportDate: report.report_date,
    rawMessage: report.raw_message || "",
    issueText: report.issue_text || "",
    weatherMorning: report.weather_morning || "",
    weatherNoon: report.weather_noon || "",
    weatherAfternoon: report.weather_afternoon || "",
    weatherEvening: report.weather_evening || "",
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
          <p>Có thể sửa báo cáo ngày cũ. Mỗi lần lưu đều ghi lại người sửa và thời gian chỉnh sửa.</p>
        </div>
        <div className="page-title-icon"><Pencil size={24} /></div>
      </section>
      <div className="panel"><div className="panel-body"><EditReportForm report={editReport} /></div></div>

      <section className="panel section-gap audit-history-panel">
        <div className="panel-head"><div><span className="eyebrow">LỊCH SỬ CHỈNH SỬA</span><h2>Ai sửa · thời gian sửa</h2></div><History size={20}/></div>
        <div className="panel-body">
          {history?.length ? <div className="audit-history-list">{history.map((item) => {
            const beforeReport = (item.before_data as any)?.report || {};
            const afterReport = (item.after_data as any)?.report || {};
            const workerBefore = Number(beforeReport.workers || 0);
            const workerAfter = Number(afterReport.workers || 0);
            const technicalBefore = Number(beforeReport.technical_staff || 0);
            const technicalAfter = Number(afterReport.technical_staff || 0);
            return <article key={item.id} className="audit-history-item"><div><strong>{item.edited_by_name}</strong><span>{formatEditTime(item.edited_at)}</span></div><p>{item.change_summary || "Cập nhật báo cáo"}</p><small>Công nhân: {workerBefore} → {workerAfter} · Kỹ thuật: {technicalBefore} → {technicalAfter}</small></article>;
          })}</div> : <div className="empty-state">Báo cáo chưa có lần chỉnh sửa nào.</div>}
        </div>
      </section>
    </>
  );
}
