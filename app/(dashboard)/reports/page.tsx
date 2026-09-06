import { Camera, HardHat, History } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getReportHistory } from "@/lib/data";
import { formatDate, formatPercent } from "@/lib/format";
import { PhotoGrid } from "@/components/photo-grid";

export default async function ReportsPage() {
  const user = await requireUser();
  const reports = await getReportHistory(user, 50);

  return (
    <>
      <section className="page-title-row">
        <div><span className="eyebrow">LỊCH SỬ DỮ LIỆU</span><h1>Nhật ký công việc</h1><p>{user.role === "commander" ? "Toàn bộ báo cáo của 6 đội." : "Chỉ hiển thị báo cáo của đội bạn."}</p></div>
        <div className="page-title-icon"><History size={25} /></div>
      </section>

      <div className="history-stack">
        {reports.map((report) => (
          <article className="panel report-card" key={report.id}>
            <div className="report-card-head">
              <div><span className="eyebrow">{formatDate(report.report_date)}</span><h2>{report.leader?.full_name || "Đội thi công"}</h2></div>
              <div className="headcount-chip"><HardHat size={17} /><strong>{report.workers}</strong> công nhân <span>+ {report.technical_staff} kỹ thuật</span></div>
            </div>
            {report.issue_text ? <div className="issue-box"><strong>Vướng mắc:</strong> {report.issue_text}</div> : null}
            <div className="work-item-list">
              {report.workItems.map((item) => <div className="work-item-row" key={item.id}><div><strong>{item.stage}</strong><span>{item.zone?.name}</span></div><div className="foundation-codes">{item.foundation_codes.map((code) => <b key={code}>{code}</b>)}</div><div className="work-progress"><strong>{formatPercent(item.progress)}%</strong><span>{item.quantity} {item.unit}</span></div></div>)}
            </div>
            {report.photos.length ? <div className="report-photos"><div className="mini-heading"><Camera size={16} /> Ảnh hiện trường</div><PhotoGrid photos={report.photos} /></div> : null}
          </article>
        ))}
        {!reports.length ? <div className="panel empty-state">Chưa có báo cáo.</div> : null}
      </div>
    </>
  );
}
