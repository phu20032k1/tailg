import Link from "next/link";
import { ArrowRight, CalendarClock, Camera, CheckCircle2, ClipboardPlus, HardHat, Rows3, Users } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getDashboardData } from "@/lib/data";
import { formatDate, formatPercent } from "@/lib/format";
import { PhotoGrid } from "@/components/photo-grid";
import { SiteMap } from "@/components/site-map";
import { StatCard } from "@/components/stat-card";

export default async function DashboardPage() {
  const user = await requireUser();
  const data = await getDashboardData(user);
  const latestPhotos = data.recentReports.flatMap((report) => report.photos).slice(0, 6);

  return (
    <>
      <section className="hero-banner">
        <div>
          <span className="eyebrow">BÁO CÁO THI CÔNG HẰNG NGÀY</span>
          <h1>{user.role === "commander" ? "Bảng điều hành công trường" : `Tổng quan đội · ${user.fullName}`}</h1>
          <p>{user.role === "commander" ? "6 đội báo cáo trước 07:30 → PostgreSQL tự tổng hợp nhân lực, máy móc, công việc, ảnh → xuất Excel và PowerPoint tuần." : "Dán tin nhắn báo cáo, rà lại số lượng và tải ảnh hiện trường. Ban điều hành nhận dữ liệu ngay sau khi lưu."}</p>
        </div>
        <Link className="button primary" href="/reports/new"><ClipboardPlus size={18} /> Nhập báo cáo hôm nay</Link>
      </section>

      <section className="stats-grid">
        <StatCard label="Công nhân hôm nay" value={data.workersToday} hint={`${data.technicalToday} cán bộ kỹ thuật`} icon={HardHat} tone="blue" />
        <StatCard label={user.role === "commander" ? "Đội đã báo cáo" : "Báo cáo hôm nay"} value={user.role === "commander" ? `${data.teamsReported}/6` : data.teamsReported ? "Đã có" : "Chưa có"} hint={data.teamsReported ? "Dữ liệu đã lên hệ thống" : "Cần báo cáo trước 07:30"} icon={CheckCircle2} tone="green" />
        <StatCard label="Móng đã khai báo" value={data.foundationCount} hint="Danh mục tiến độ móng giữ riêng" icon={Rows3} tone="amber" />
        <StatCard label="Tiến độ bình quân" value={`${formatPercent(data.averageProgress)}%`} hint="Theo trạng thái móng mới nhất" icon={Users} tone="red" />
      </section>

      <section className="dashboard-grid">
        <article className="panel">
          <div className="panel-head"><div><span className="eyebrow">MẶT BẰNG PHÂN KHU</span><h2>Tiến độ theo khu vực</h2></div><Link className="text-link" href="/map">Xem đầy đủ <ArrowRight size={15} /></Link></div>
          <div className="panel-body"><SiteMap zones={data.zones} /></div>
        </article>
        <article className="panel">
          <div className="panel-head"><div><span className="eyebrow">KẾ HOẠCH TỔNG</span><h2>Mốc tiến độ</h2></div><CalendarClock size={19} /></div>
          <div className="panel-body milestone-list">{data.milestones.map((item) => { const overdue = data.today > item.finish_date; const active = data.today >= item.start_date && data.today <= item.finish_date; return <div className="milestone" key={item.id}><i className={overdue ? "overdue" : active ? "active" : ""} /><div><strong>{item.label}</strong><span>{formatDate(item.start_date)} → {formatDate(item.finish_date)}</span><small>{item.note}</small></div></div>; })}</div>
        </article>
      </section>

      <section className="panel section-gap">
        <div className="panel-head"><div><span className="eyebrow">NHẬT KÝ GẦN NHẤT</span><h2>Dữ liệu từ 6 đội</h2></div><Link className="text-link" href="/reports">Xem lịch sử <ArrowRight size={15} /></Link></div>
        <div className="panel-body">
          {data.recentReports.length ? <div className="activity-list">{data.recentReports.map((report) => <article className="activity-row" key={report.id}><div className="activity-date"><strong>{formatDate(report.report_date)}</strong><span>{report.leader?.full_name || "Đội thi công"}</span></div><div className="activity-content">{report.tasks.length ? report.tasks.slice(0, 3).map((task) => <div key={task.id}><strong>{task.area_label || (task.kind === "main" ? "Công việc chính" : "Công việc khác")}</strong><span>{task.description_vi}</span></div>) : report.workItems.length ? report.workItems.slice(0, 2).map((item) => <div key={item.id}><strong>{item.stage}</strong><span>{item.zone?.name} · {item.foundation_codes.join(", ")} · {formatPercent(item.progress)}%</span></div>) : <span>Chưa có công việc chi tiết.</span>}</div><div className="activity-meta"><b>{report.workers}</b><span>công nhân</span>{report.photos.length ? <small><Camera size={13} /> {report.photos.length} ảnh</small> : null}</div></article>)}</div> : <div className="empty-state">Chưa có báo cáo. Hãy nhập dữ liệu đầu tiên.</div>}
        </div>
      </section>

      {latestPhotos.length ? <section className="panel section-gap"><div className="panel-head"><div><span className="eyebrow">ẢNH HIỆN TRƯỜNG</span><h2>Ảnh mới nhất</h2></div><Camera size={19} /></div><div className="panel-body"><PhotoGrid photos={latestPhotos} /></div></section> : null}
    </>
  );
}
