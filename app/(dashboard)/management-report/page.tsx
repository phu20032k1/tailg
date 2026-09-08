import { CalendarDays, Camera, CheckCircle2, CloudSun, FileText, HardHat, Rows3, Users, Wrench } from "lucide-react";
import { requireCommander } from "@/lib/auth";
import { formatDate, formatPercent, todayISO } from "@/lib/format";
import { getDailyManagementReport } from "@/lib/management-report";
import { ManagementReportControls } from "@/components/management-report-controls";

export const dynamic = "force-dynamic";

function validDate(value: unknown) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

function submittedTime(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Asia/Ho_Chi_Minh"
  }).format(date);
}

export default async function ManagementReportPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireCommander();
  const params = (await searchParams) || {};
  const date = validDate(params.date) || todayISO();
  const data = await getDailyManagementReport(user, date);

  return (
    <div className="management-report-page">
      <section className="management-report-heading">
        <div>
          <span className="eyebrow">BAN ĐIỀU HÀNH · BÁO CÁO NGÀY</span>
          <h1>Bảng tổng hợp báo cáo thi công</h1>
          <p>Dữ liệu tự cập nhật từ nội dung 6 đội trưởng nhập trong ngày {formatDate(date)}.</p>
        </div>
        <ManagementReportControls date={date} />
      </section>

      <section className="management-print-title print-only">
        <strong>CÔNG TY CỔ PHẦN ĐẦU TƯ VÀ XÂY DỰNG SỐ 18.3</strong>
        <h1>BÁO CÁO TỔNG HỢP THI CÔNG NGÀY {formatDate(date)}</h1>
        <p>Dự án: Nhà máy TAILG Việt Nam</p>
      </section>

      <section className="management-summary-grid">
        <article><CheckCircle2 size={22}/><span>Đội đã báo cáo</span><strong>{data.summary.teamsReported}/6</strong><small>{6 - data.summary.teamsReported} đội chưa có dữ liệu</small></article>
        <article><HardHat size={22}/><span>Công nhân trực tiếp</span><strong>{data.summary.totalWorkers}</strong><small>{data.summary.totalTechnical} cán bộ kỹ thuật</small></article>
        <article><Users size={22}/><span>Tổng nhân lực</span><strong>{data.summary.totalPeople}</strong><small>Công nhân + kỹ thuật</small></article>
        <article><FileText size={22}/><span>Công việc ghi nhận</span><strong>{data.summary.totalTasks}</strong><small>{data.summary.totalFoundationUpdates} cập nhật móng</small></article>
        <article><Wrench size={22}/><span>Máy móc thiết bị</span><strong>{data.summary.totalEquipment}</strong><small>Tổng số lượng được báo cáo</small></article>
        <article><Camera size={22}/><span>Ảnh hiện trường</span><strong>{data.summary.totalPhotos}</strong><small>Ảnh từ 6 đội trong ngày</small></article>
      </section>

      <section className="management-overview-grid">
        <article className="panel management-overview-card">
          <div className="panel-head"><div><span className="eyebrow">THỜI TIẾT</span><h2>Điều kiện thi công</h2></div><CloudSun size={20}/></div>
          <div className="panel-body management-weather-row management-weather-four"><div><span>Buổi sáng</span><strong>{data.summary.weatherMorning}</strong></div><div><span>Buổi trưa</span><strong>{data.summary.weatherNoon}</strong></div><div><span>Buổi chiều</span><strong>{data.summary.weatherAfternoon}</strong></div><div><span>Buổi tối</span><strong>{data.summary.weatherEvening}</strong></div></div>
        </article>
        <article className="panel management-overview-card">
          <div className="panel-head"><div><span className="eyebrow">NHÂN LỰC</span><h2>Cơ cấu toàn dự án</h2></div><Users size={20}/></div>
          <div className="panel-body management-total-list">{data.summary.laborTotals.length ? data.summary.laborTotals.map((item) => <div key={item.label}><span>{item.label}</span><strong>{item.headcount}</strong></div>) : <div className="empty-state">Chưa có dữ liệu nhân lực.</div>}</div>
        </article>
        <article className="panel management-overview-card">
          <div className="panel-head"><div><span className="eyebrow">THIẾT BỊ</span><h2>Tổng hợp máy móc</h2></div><Wrench size={20}/></div>
          <div className="panel-body management-total-list">{data.summary.equipmentTotals.length ? data.summary.equipmentTotals.map((item) => <div key={`${item.name}-${item.unit}`}><span>{item.name}</span><strong>{item.quantity} {item.unit}</strong></div>) : <div className="empty-state">Chưa có dữ liệu thiết bị.</div>}</div>
        </article>
      </section>

      <section className="panel management-work-summary section-gap">
        <div className="panel-head"><div><span className="eyebrow">TỔNG HỢP CÔNG VIỆC</span><h2>Nội dung thực tế 6 đội đã nhập</h2></div><Rows3 size={20}/></div>
        <div className="panel-body">
          {data.workSummary.length ? <div className="management-task-list">{data.workSummary.map((task, index) => <div key={`${task.team}-${index}`}><span>{String(index + 1).padStart(2,"0")}</span><div><strong>{task.area} · {task.team}</strong><p>{task.descriptionVi}</p>{task.descriptionZh ? <small>{task.descriptionZh}</small> : null}</div></div>)}</div> : <div className="empty-state">Chưa có công việc được nhập trong ngày.</div>}
        </div>
      </section>

      <section className="management-team-index panel">
        <div className="panel-head"><div><span className="eyebrow">06 ĐỘI THI CÔNG</span><h2>Tình trạng báo cáo trong ngày</h2></div><CalendarDays size={20}/></div>
        <div className="panel-body management-team-table-wrap"><table className="management-team-table"><thead><tr><th>STT</th><th>Đội trưởng</th><th>Phạm vi</th><th>Trạng thái</th><th>Công nhân</th><th>Kỹ thuật</th><th>Công việc</th><th>Ảnh</th></tr></thead><tbody>{data.teamRows.map((team) => <tr key={team.leader.id}><td>{team.stt}</td><td><strong>{team.leader.full_name}</strong></td><td>{team.zoneLabel || "Chưa gán khu vực"}</td><td><span className={`management-status ${team.reported ? "done" : "missing"}`}>{team.reported ? "Đã báo cáo" : "Chưa báo cáo"}</span></td><td>{team.workers}</td><td>{team.technical}</td><td>{team.tasks.length}</td><td>{team.photos.length}</td></tr>)}</tbody></table></div>
      </section>

      <section className="management-team-report-list">
        {data.teamRows.map((team) => (
          <article className={`management-team-report ${team.reported ? "" : "is-missing"}`} key={team.leader.id}>
            <header className="management-team-report-head"><div className="management-team-number">{String(team.stt).padStart(2, "0")}</div><div className="management-team-title"><span>ĐỘI TRƯỞNG</span><h2>{team.leader.full_name}</h2><p>{team.zoneLabel || "Chưa gán khu vực"}</p></div><div className={`management-report-state ${team.reported ? "done" : "missing"}`}><strong>{team.reported ? "ĐÃ BÁO CÁO" : "CHƯA BÁO CÁO"}</strong>{team.report ? <span>{submittedTime(team.report.submitted_at || team.report.updated_at)}</span> : null}</div></header>

            {!team.reported ? <div className="management-missing-body">Chưa nhận được báo cáo của đội trong ngày {formatDate(date)}.</div> : <>
              <div className="management-team-kpis"><div><span>Công nhân</span><strong>{team.workers}</strong></div><div><span>Kỹ thuật</span><strong>{team.technical}</strong></div><div><span>Tổng nhân lực</span><strong>{team.totalPeople}</strong></div><div><span>Móng phụ trách</span><strong>{team.foundationCount}</strong></div><div><span>Móng hoàn thành</span><strong>{team.completedFoundations}</strong></div><div><span>Tiến độ móng</span><strong>{formatPercent(team.foundationProgress)}%</strong></div></div>

              <div className="management-team-grid">
                <section><h3>Nhân lực chi tiết</h3>{team.labor.length ? <table className="management-detail-table"><thead><tr><th>Nhóm</th><th>Tổ / phụ trách</th><th>SL</th></tr></thead><tbody>{team.labor.map((item) => <tr key={item.id}><td>{item.label}</td><td>{item.crew_name || "-"}</td><td>{item.headcount}</td></tr>)}</tbody></table> : <p className="management-empty">Chưa có chi tiết nhân lực.</p>}</section>
                <section><h3>Máy móc thiết bị</h3>{team.equipment.length ? <table className="management-detail-table"><thead><tr><th>Thiết bị</th><th>SL</th><th>Đơn vị</th></tr></thead><tbody>{team.equipment.map((item) => <tr key={item.id}><td>{item.equipment_name}</td><td>{item.quantity}</td><td>{item.unit}</td></tr>)}</tbody></table> : <p className="management-empty">Chưa có thiết bị được ghi nhận.</p>}</section>
              </div>

              <section className="management-work-section"><h3>Công việc trong ngày</h3>{team.tasks.length ? <div className="management-task-list">{team.tasks.map((task, index) => <div key={task.id}><span>{String(index + 1).padStart(2, "0")}</span><div><strong>{task.area_label || "Khu vực thi công"}</strong><p>{task.description_vi}</p>{task.description_zh ? <small>{task.description_zh}</small> : null}</div></div>)}</div> : <p className="management-empty">Chưa có công việc chi tiết.</p>}</section>

              {team.workItems.length ? <section className="management-work-section"><h3>Cập nhật móng / khối lượng</h3><div className="management-foundation-list">{team.workItems.map((item) => <div key={item.id}><strong>{item.foundation_codes?.length ? item.foundation_codes.join(", ") : item.stage}</strong><span>{item.zone?.name || "Khu vực"} · {item.stage}</span><b>{formatPercent(Number(item.progress || 0))}%</b></div>)}</div></section> : null}

              <div className="management-weather-team management-weather-four"><div><span>Sáng</span><strong>{team.weatherMorning || "Chưa ghi nhận"}</strong></div><div><span>Trưa</span><strong>{team.weatherNoon || "Chưa ghi nhận"}</strong></div><div><span>Chiều</span><strong>{team.weatherAfternoon || "Chưa ghi nhận"}</strong></div><div><span>Tối</span><strong>{team.weatherEvening || "Chưa ghi nhận"}</strong></div></div>

              {team.issueText ? <section className="management-issue"><strong>Vướng mắc / ghi chú</strong><p>{team.issueText}</p></section> : null}
              {team.photos.length ? <section className="management-photo-section"><h3>Ảnh hiện trường ({team.photos.length})</h3><div className="management-photo-grid">{team.photos.slice(0, 6).map((photo, index) => <figure key={photo.id}><img src={photo.signedUrl || ""} alt={`Ảnh ${index + 1} - ${team.leader.full_name}`} loading="lazy"/><figcaption>{photo.caption || photo.area_label || `Ảnh ${index + 1}`}</figcaption></figure>)}</div>{team.photos.length > 6 ? <p className="management-photo-more">Còn {team.photos.length - 6} ảnh khác trong nhật ký đội.</p> : null}</section> : null}
              {team.report?.raw_message ? <section className="management-original-message"><h3>Nội dung báo cáo gốc</h3><pre>{team.report.raw_message}</pre></section> : null}
            </>}
          </article>
        ))}
      </section>

      <footer className="management-print-footer print-only"><div><span>Người tổng hợp</span><strong>Ban điều hành dự án</strong></div><div><span>Chỉ huy trưởng</span><strong>Phan Viết Tùng</strong></div></footer>
    </div>
  );
}
