import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  Camera,
  CheckCircle2,
  HardHat,
  MapPin,
  Rows3,
  Users,
  Wrench
} from "lucide-react";
import { requireCommander } from "@/lib/auth";
import { getFoundations, getReportRange, getUsers, getZones } from "@/lib/data";
import { formatDate, formatPercent } from "@/lib/format";
import { PhotoGrid } from "@/components/photo-grid";

function mondayOf(dateText: string) {
  const date = new Date(`${dateText}T12:00:00+07:00`);
  const day = date.getDay() || 7;
  date.setDate(date.getDate() - day + 1);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(date);
}

function addDays(dateText: string, days: number) {
  const date = new Date(`${dateText}T12:00:00+07:00`);
  date.setDate(date.getDate() + days);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(date);
}

export default async function TeamDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const commander = await requireCommander();
  const { id } = await params;
  const query = (await searchParams) || {};
  const users = await getUsers();
  const leader = users.find((item) => item.id === id && item.role === "leader");
  if (!leader) notFound();

  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(new Date());
  const mode = query.view === "week" ? "week" : "day";
  const selectedDate = typeof query.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(query.date) ? query.date : today;
  const from = mode === "week" ? mondayOf(selectedDate) : selectedDate;
  const to = mode === "week" ? addDays(from, 6) : selectedDate;

  const [allReports, allFoundations, zones] = await Promise.all([
    getReportRange(commander, from, to),
    getFoundations(commander),
    getZones()
  ]);

  const reports = allReports.filter((report) => report.leader_id === leader.id);
  const foundations = allFoundations.filter((item) => item.owner_id === leader.id);
  const teamZones = zones.filter((zone) => zone.owner_id === leader.id);
  const workerTotal = reports.reduce((sum, report) => sum + Number(report.workers || 0), 0);
  const technicalTotal = reports.reduce((sum, report) => sum + Number(report.technical_staff || 0), 0);
  const avgWorkers = reports.length ? Math.round(workerTotal / reports.length) : 0;
  const avgTechnical = reports.length ? Math.round(technicalTotal / reports.length) : 0;
  const progress = foundations.length
    ? foundations.reduce((sum, item) => sum + Number(item.progress || 0), 0) / foundations.length
    : 0;
  const completed = foundations.filter((item) => Number(item.progress) >= 100 || item.status === "completed").length;
  const photos = reports.flatMap((report) => report.photos).slice(0, 12);
  const latest = reports[0];
  const labor = latest?.labor || [];
  const equipment = latest?.equipment || [];
  const tasks = reports.flatMap((report) => report.tasks).slice(0, 12);

  return (
    <>
      <section className="team-detail-hero">
        <div>
          <Link className="team-detail-back" href={`/?view=${mode}&date=${selectedDate}`}>
            <ArrowLeft size={17} /> Quay lại tổng quan
          </Link>
          <span className="eyebrow">CHI TIẾT ĐỘI THI CÔNG</span>
          <h1>{leader.full_name}</h1>
          <div className="team-detail-scope">
            <MapPin size={17} />
            <span>{teamZones.length ? teamZones.map((zone) => zone.name).join(" · ") : "Chưa gán khu vực"}</span>
          </div>
        </div>
        <div className={`team-detail-report-badge ${reports.length ? "done" : "missing"}`}>
          {reports.length ? <CheckCircle2 size={19} /> : <CalendarDays size={19} />}
          <div><strong>{reports.length ? "Đã có báo cáo" : "Chưa có báo cáo"}</strong><span>{mode === "week" ? `${reports.length} báo cáo trong tuần` : formatDate(selectedDate)}</span></div>
        </div>
      </section>

      <section className="commander-period-bar team-detail-period">
        <div className="period-tabs">
          <Link className={mode === "day" ? "active" : ""} href={`/teams/${leader.id}?view=day&date=${selectedDate}`}>Theo ngày</Link>
          <Link className={mode === "week" ? "active" : ""} href={`/teams/${leader.id}?view=week&date=${selectedDate}`}>Theo tuần</Link>
        </div>
        <form className="period-date-form" method="get">
          <input type="hidden" name="view" value={mode} />
          <label><CalendarDays size={17} /><span>{mode === "week" ? "Chọn ngày trong tuần" : "Ngày báo cáo"}</span><input type="date" name="date" defaultValue={selectedDate} /></label>
          <button className="button secondary" type="submit">Xem</button>
        </form>
        <div className="period-caption"><strong>{mode === "week" ? `Tuần ${formatDate(from)} – ${formatDate(to)}` : formatDate(selectedDate)}</strong><span>{reports.length} báo cáo</span></div>
      </section>

      <section className="team-detail-kpis">
        <article><HardHat size={21}/><span>{mode === "week" ? "CN bình quân" : "Công nhân"}</span><strong>{mode === "week" ? avgWorkers : Number(latest?.workers || 0)}</strong><small>{mode === "week" ? `${workerTotal} lượt trong kỳ` : "Theo báo cáo đã chọn"}</small></article>
        <article><Users size={21}/><span>{mode === "week" ? "Kỹ thuật bình quân" : "Kỹ thuật"}</span><strong>{mode === "week" ? avgTechnical : Number(latest?.technical_staff || 0)}</strong><small>{technicalTotal} lượt cán bộ kỹ thuật</small></article>
        <article><Rows3 size={21}/><span>Móng phụ trách</span><strong>{foundations.length}</strong><small>{completed} móng hoàn thành</small></article>
        <article><CheckCircle2 size={21}/><span>Tiến độ móng</span><strong>{formatPercent(progress)}%</strong><small>Bình quân danh mục của đội</small></article>
      </section>

      <section className="team-detail-grid">
        <article className="panel team-detail-panel">
          <div className="panel-head"><div><span className="eyebrow">CÔNG VIỆC</span><h2>Công việc trong kỳ</h2></div></div>
          <div className="panel-body">
            {tasks.length ? <div className="team-task-list">{tasks.map((task) => <div key={task.id}><span>{task.area_label || "Khu vực thi công"}</span><strong>{task.description_vi}</strong></div>)}</div> : <div className="empty-state">Chưa có công việc trong khoảng thời gian này.</div>}
          </div>
        </article>

        <article className="panel team-detail-panel">
          <div className="panel-head"><div><span className="eyebrow">NHÂN LỰC</span><h2>Cơ cấu nhân lực gần nhất</h2></div><HardHat size={20}/></div>
          <div className="panel-body">
            {labor.length ? <div className="team-labor-list">{labor.map((item) => <div key={item.id}><span>{item.label}{item.crew_name ? ` · ${item.crew_name}` : ""}</span><strong>{item.headcount}</strong></div>)}</div> : <div className="empty-state">Chưa có chi tiết nhân lực.</div>}
          </div>
        </article>
      </section>

      <section className="team-detail-grid section-gap">
        <article className="panel team-detail-panel">
          <div className="panel-head"><div><span className="eyebrow">MÓNG</span><h2>Danh sách móng của đội</h2></div><Rows3 size={20}/></div>
          <div className="panel-body">
            {foundations.length ? <div className="team-foundation-list">{foundations.slice(0, 30).map((item) => <div key={item.id}><div><strong>{item.code}</strong><span>{teamZones.find((zone) => zone.id === item.zone_id)?.name || "Khu vực"} · {item.current_stage || "Chưa cập nhật"}</span></div><div className="team-foundation-progress"><b>{formatPercent(Number(item.progress || 0))}%</b><div className="progress-track"><i style={{ width: `${Math.min(100, Math.max(0, Number(item.progress || 0)))}%` }}/></div></div></div>)}</div> : <div className="empty-state">Đội chưa được giao móng.</div>}
          </div>
        </article>

        <article className="panel team-detail-panel">
          <div className="panel-head"><div><span className="eyebrow">MÁY MÓC</span><h2>Thiết bị gần nhất</h2></div><Wrench size={20}/></div>
          <div className="panel-body">
            {equipment.length ? <div className="team-labor-list">{equipment.map((item) => <div key={item.id}><span>{item.equipment_name}</span><strong>{item.quantity} {item.unit}</strong></div>)}</div> : <div className="empty-state">Chưa có chi tiết máy móc.</div>}
          </div>
        </article>
      </section>

      <section className="panel section-gap team-detail-panel">
        <div className="panel-head"><div><span className="eyebrow">LỊCH SỬ</span><h2>Báo cáo của {leader.full_name}</h2></div><Link className="text-link" href={`/reports?from=${from}&to=${to}`}>Xem nhật ký 6 đội</Link></div>
        <div className="panel-body">
          {reports.length ? <div className="team-report-timeline">{reports.map((report) => <article key={report.id}><div className="team-report-date"><strong>{formatDate(report.report_date)}</strong><span>{report.workers} công nhân · {report.technical_staff} kỹ thuật</span></div><div className="team-report-work">{report.tasks.slice(0, 3).map((task) => <p key={task.id}><b>{task.area_label || "Công việc"}</b>{task.description_vi}</p>)}{!report.tasks.length ? <p>Chưa có nội dung công việc chi tiết.</p> : null}</div><div className="team-report-photo-count">{report.photos.length ? <><Camera size={15}/> {report.photos.length} ảnh</> : "Không có ảnh"}</div></article>)}</div> : <div className="empty-state">Không có báo cáo trong khoảng thời gian đã chọn.</div>}
        </div>
      </section>

      {photos.length ? <section className="panel section-gap team-detail-panel"><div className="panel-head"><div><span className="eyebrow">ẢNH HIỆN TRƯỜNG</span><h2>Ảnh của riêng đội</h2></div><Camera size={20}/></div><div className="panel-body"><PhotoGrid photos={photos}/></div></section> : null}
    </>
  );
}
