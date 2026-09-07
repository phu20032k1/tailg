import { CalendarDays, Camera, Cog, HardHat, History, ListChecks, Search } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getReportHistory, getReportRange } from "@/lib/data";
import { formatDate, formatPercent } from "@/lib/format";
import { PhotoGrid } from "@/components/photo-grid";
import { ReportActions } from "@/components/report-actions";

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  const user = await requireUser();
  const query = await searchParams;
  const hasRange = Boolean(query.from || query.to);
  const from = query.from || "2026-01-01";
  const to = query.to || "2099-12-31";
  const reports = hasRange ? await getReportRange(user, from, to) : await getReportHistory(user, 80);

  return (
    <>
      <section className="page-title-row">
        <div>
          <span className="eyebrow">NHẬT KÝ THI CÔNG</span>
          <h1>Lịch sử báo cáo ngày</h1>
          <p>{user.role === "commander" ? "Xem, lọc theo ngày, chỉnh sửa hoặc xóa báo cáo của 6 đội." : "Xem, lọc theo ngày và chỉnh sửa báo cáo của đội bạn."}</p>
        </div>
        <div className="page-title-icon"><History size={25} /></div>
      </section>

      <section className="panel history-filter-panel">
        <div className="panel-body">
          <form className="history-calendar-filter" method="get">
            <div className="calendar-filter-title"><CalendarDays size={19} /><strong>Lọc theo thời gian</strong></div>
            <label><span>Từ ngày</span><input type="date" name="from" defaultValue={query.from || ""} /></label>
            <label><span>Đến ngày</span><input type="date" name="to" defaultValue={query.to || ""} /></label>
            <button className="button secondary" type="submit"><Search size={17} /> Xem báo cáo</button>
            {hasRange ? <a className="button ghost" href="/reports">Bỏ lọc</a> : null}
          </form>
        </div>
      </section>

      <div className="history-stack section-gap">
        {reports.map((report) => (
          <article className="panel report-card lazy-section" key={report.id}>
            <div className="report-card-head">
              <div><span className="eyebrow">{formatDate(report.report_date)}</span><h2>{report.leader?.full_name || "Đội thi công"}</h2></div>
              <div className="report-card-tools">
                <div className="headcount-chip"><HardHat size={17} /><strong>{report.workers}</strong> công nhân <span>+ {report.technical_staff} kỹ thuật</span></div>
                <ReportActions reportId={report.id} />
              </div>
            </div>

            {report.labor.length ? <div className="report-detail-grid"><div><div className="mini-heading"><HardHat size={16} /> Nhân lực</div><div className="compact-list">{report.labor.map((item) => <span key={item.id}><b>{item.label}{item.crew_name ? ` · ${item.crew_name}` : ""}</b><strong>{item.headcount}</strong></span>)}</div></div><div><div className="mini-heading"><Cog size={16} /> Máy móc</div><div className="compact-list">{report.equipment.map((item) => <span key={item.id}><b>{item.equipment_name}</b><strong>{item.quantity} {item.unit}</strong></span>)}{!report.equipment.length ? <small>Không ghi nhận thiết bị.</small> : null}</div></div></div> : null}

            {report.tasks.length ? <div className="report-task-groups"><div><div className="mini-heading"><ListChecks size={16} /> Công việc chính</div>{report.tasks.filter((task) => task.kind === "main").map((task) => <div className="report-task" key={task.id}><strong>{task.area_label || "Công trường"}</strong><span>{task.description_vi}</span>{task.description_zh ? <small>{task.description_zh}</small> : null}</div>)}</div><div><div className="mini-heading">Công việc khác</div>{report.tasks.filter((task) => task.kind === "other").map((task) => <div className="report-task other" key={task.id}><strong>{task.area_label || "Khác"}</strong><span>{task.description_vi}</span></div>)}</div></div> : null}

            {report.workItems.length ? <div className="work-item-list">{report.workItems.map((item) => <div className="work-item-row" key={item.id}><div><strong>{item.stage}</strong><span>{item.zone?.name}</span></div><div className="foundation-codes">{item.foundation_codes.map((code) => <b key={code}>{code}</b>)}</div><div className="work-progress"><strong>{formatPercent(item.progress)}%</strong><span>{item.quantity} {item.unit}</span></div></div>)}</div> : null}
            {report.issue_text ? <div className="issue-box"><strong>Vướng mắc:</strong> {report.issue_text}</div> : null}
            {report.photos.length ? <div className="report-photos"><div className="mini-heading"><Camera size={16} /> Ảnh hiện trường</div><PhotoGrid photos={report.photos} /></div> : null}
            {report.raw_message ? <details className="raw-message"><summary>Xem tin nhắn gốc</summary><pre>{report.raw_message}</pre></details> : null}
          </article>
        ))}
        {!reports.length ? <div className="panel empty-state">Không có báo cáo trong khoảng thời gian đã chọn.</div> : null}
      </div>
    </>
  );
}
