import Link from "next/link";
import { ArrowRight, CalendarDays, Camera, CheckCircle2, ClipboardPlus, HardHat, Rows3, Users, Building2, AlertCircle } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getDashboardData, getFoundations, getReportRange } from "@/lib/data";
import { formatDate, formatPercent } from "@/lib/format";
import { PhotoGrid } from "@/components/photo-grid";
import { SiteMap } from "@/components/site-map";
import { StatCard } from "@/components/stat-card";

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

export default async function DashboardPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireUser();
  const data = await getDashboardData(user);
  const params = (await searchParams) || {};
  const mode = params.view === "week" ? "week" : "day";
  const selectedDate = typeof params.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(params.date) ? params.date : data.today;
  const from = mode === "week" ? mondayOf(selectedDate) : selectedDate;
  const to = mode === "week" ? addDays(from, 6) : selectedDate;

  if (user.role === "commander") {
    const [periodReports, foundations] = await Promise.all([getReportRange(user, from, to), getFoundations(user)]);
    const leaders = data.users.filter((item) => item.role === "leader");
    const workerTotal = periodReports.reduce((sum, report) => sum + Number(report.workers || 0), 0);
    const technicalTotal = periodReports.reduce((sum, report) => sum + Number(report.technical_staff || 0), 0);
    const reportingTeams = new Set(periodReports.map((report) => report.leader_id)).size;
    const reportDays = new Set(periodReports.map((report) => report.report_date)).size;
    const averageWorkers = periodReports.length ? Math.round(workerTotal / periodReports.length) : 0;
    const latestPhotos = periodReports.flatMap((report) => report.photos).slice(0, 8);
    const finishedFoundations = foundations.filter((item) => Number(item.progress) >= 100 || item.status === "completed").length;

    const teamRows = leaders.map((leader) => {
      const reports = periodReports.filter((report) => report.leader_id === leader.id).sort((a, b) => b.report_date.localeCompare(a.report_date));
      const latest = reports[0];
      const foundationsOfTeam = foundations.filter((item) => item.owner_id === leader.id);
      const zoneNames = data.zones.filter((zone) => zone.owner_id === leader.id).map((zone) => zone.name);
      const avgProgress = foundationsOfTeam.length ? foundationsOfTeam.reduce((sum, item) => sum + Number(item.progress || 0), 0) / foundationsOfTeam.length : 0;
      const avgWorkers = reports.length ? Math.round(reports.reduce((sum, report) => sum + Number(report.workers || 0), 0) / reports.length) : 0;
      return { leader, reports, latest, foundationsOfTeam, zoneNames, avgProgress, avgWorkers };
    });

    return (
      <>
        <section className="commander-hero">
          <div>
            <span className="eyebrow">BAN ĐIỀU HÀNH · TỔNG HỢP 6 ĐỘI</span>
            <h1>Bảng điều hành Chỉ huy trưởng</h1>
            <p>Theo dõi nhân lực, báo cáo, công việc và tiến độ của toàn bộ 6 đội theo ngày hoặc theo tuần.</p>
          </div>
          <Link className="button primary" href="/reports/new"><ClipboardPlus size={18} /> Nhập báo cáo</Link>
        </section>

        <section className="commander-period-bar">
          <div className="period-tabs">
            <Link className={mode === "day" ? "active" : ""} href={`/?view=day&date=${selectedDate}`}>Theo ngày</Link>
            <Link className={mode === "week" ? "active" : ""} href={`/?view=week&date=${selectedDate}`}>Theo tuần</Link>
          </div>
          <form className="period-date-form" method="get">
            <input type="hidden" name="view" value={mode} />
            <label><CalendarDays size={17} /><span>{mode === "week" ? "Chọn ngày trong tuần" : "Ngày báo cáo"}</span><input type="date" name="date" defaultValue={selectedDate} /></label>
            <button className="button secondary" type="submit">Xem</button>
          </form>
          <div className="period-caption">
            <strong>{mode === "week" ? `Tuần ${formatDate(from)} – ${formatDate(to)}` : formatDate(selectedDate)}</strong>
            <span>{mode === "week" ? `${reportDays} ngày có dữ liệu` : "Số liệu trong ngày"}</span>
          </div>
        </section>

        <section className="stats-grid commander-stats">
          <StatCard label={mode === "week" ? "Nhân lực bình quân" : "Công nhân"} value={mode === "week" ? averageWorkers : workerTotal} hint={`${technicalTotal} lượt cán bộ kỹ thuật`} icon={HardHat} tone="blue" />
          <StatCard label="Đội đã báo cáo" value={`${reportingTeams}/6`} hint={`${periodReports.length} báo cáo trong kỳ`} icon={CheckCircle2} tone="green" />
          <StatCard label="Móng hoàn thành" value={`${finishedFoundations}/${foundations.length}`} hint="Theo danh mục móng hiện tại" icon={Rows3} tone="amber" />
          <StatCard label="Tiến độ bình quân" value={`${formatPercent(data.averageProgress)}%`} hint="Theo cập nhật mới nhất" icon={Users} tone="red" />
        </section>

        <section className="commander-team-section">
          <div className="commander-section-head">
            <div><span className="eyebrow">06 ĐỘI THI CÔNG</span><h2>Tình hình từng đội</h2></div>
            <Link className="text-link" href={`/reports?from=${from}&to=${to}`}>Xem toàn bộ báo cáo <ArrowRight size={15} /></Link>
          </div>
          <div className="commander-team-grid">
            {teamRows.map(({ leader, reports, latest, foundationsOfTeam, zoneNames, avgProgress, avgWorkers }) => (
              <article className="commander-team-card" key={leader.id}>
                <div className="team-card-top">
                  <div className="team-avatar">{leader.full_name.split(" ").slice(-1)[0]?.charAt(0)}</div>
                  <div className="team-heading"><span>Đội trưởng</span><h3>{leader.full_name}</h3></div>
                  <span className={`report-state ${reports.length ? "done" : "missing"}`}>{reports.length ? <><CheckCircle2 size={14}/> Đã báo cáo</> : <><AlertCircle size={14}/> Chưa báo cáo</>}</span>
                </div>
                <div className="team-zone-line"><Building2 size={15}/><span>{zoneNames.length ? zoneNames.join(" · ") : "Chưa gán khu vực"}</span></div>
                <div className="team-metrics">
                  <div><span>{mode === "week" ? "CN bình quân" : "Công nhân"}</span><strong>{mode === "week" ? avgWorkers : Number(latest?.workers || 0)}</strong></div>
                  <div><span>Báo cáo</span><strong>{reports.length}</strong></div>
                  <div><span>Số móng</span><strong>{foundationsOfTeam.length}</strong></div>
                </div>
                <div className="team-progress-row"><span>Tiến độ móng</span><b>{formatPercent(avgProgress)}%</b></div>
                <div className="progress-track large"><i style={{ width: `${Math.min(100, Math.max(0, avgProgress))}%` }} /></div>
                <div className="team-latest-work">
                  <span>Công việc gần nhất</span>
                  <p>{latest?.tasks?.[0]?.description_vi || latest?.workItems?.[0]?.stage || "Chưa có công việc trong kỳ."}</p>
                </div>
                <Link className="team-detail-link" href={`/teams/${leader.id}?view=${mode}&date=${selectedDate}`}>Xem chi tiết <ArrowRight size={14}/></Link>
              </article>
            ))}
          </div>
        </section>

        <section className="dashboard-grid commander-lower-grid">
          <article className="panel lazy-section">
            <div className="panel-head"><div><span className="eyebrow">MẶT BẰNG PHÂN KHU</span><h2>Tiến độ theo khu vực</h2></div><Link className="text-link" href="/map">Xem đầy đủ <ArrowRight size={15}/></Link></div>
            <div className="panel-body"><SiteMap zones={data.zones}/></div>
          </article>
          <article className="panel lazy-section">
            <div className="panel-head"><div><span className="eyebrow">TÌNH TRẠNG BÁO CÁO</span><h2>{mode === "week" ? "Theo dõi tuần" : "Trong ngày"}</h2></div><CalendarDays size={19}/></div>
            <div className="panel-body commander-reporting-list">
              {teamRows.map(({ leader, reports, latest }) => <div className="reporting-line" key={leader.id}><div><strong>{leader.full_name}</strong><span>{latest ? `${formatDate(latest.report_date)} · ${latest.workers} công nhân` : "Chưa có dữ liệu"}</span></div><b className={reports.length ? "ok" : "warn"}>{reports.length ? `${reports.length} báo cáo` : "Thiếu"}</b></div>)}
            </div>
          </article>
        </section>

        {latestPhotos.length ? <section className="panel section-gap lazy-section"><div className="panel-head"><div><span className="eyebrow">ẢNH HIỆN TRƯỜNG</span><h2>Ảnh trong {mode === "week" ? "tuần" : "ngày"}</h2></div><Camera size={19}/></div><div className="panel-body"><PhotoGrid photos={latestPhotos}/></div></section> : null}
      </>
    );
  }

  const latestPhotos = data.recentReports.flatMap((report) => report.photos).slice(0, 6);
  return (
    <>
      <section className="hero-banner"><div><span className="eyebrow">BÁO CÁO THI CÔNG HẰNG NGÀY</span><h1>{`Tổng quan đội · ${user.fullName}`}</h1><p>Nhập báo cáo trong ngày, kiểm tra số liệu và gửi ảnh hiện trường để Ban điều hành theo dõi.</p></div><Link className="button primary" href="/reports/new"><ClipboardPlus size={18}/> Nhập báo cáo hôm nay</Link></section>
      <section className="stats-grid"><StatCard label="Công nhân hôm nay" value={data.workersToday} hint={`${data.technicalToday} cán bộ kỹ thuật`} icon={HardHat} tone="blue"/><StatCard label="Báo cáo hôm nay" value={data.teamsReported ? "Đã có" : "Chưa có"} hint={data.teamsReported ? "Đã nhận báo cáo" : "Cần báo cáo trước 07:30"} icon={CheckCircle2} tone="green"/><StatCard label="Móng đã khai báo" value={data.foundationCount} hint="Theo danh mục móng hiện có" icon={Rows3} tone="amber"/><StatCard label="Tiến độ bình quân" value={`${formatPercent(data.averageProgress)}%`} hint="Theo cập nhật mới nhất" icon={Users} tone="red"/></section>
      <section className="dashboard-grid"><article className="panel lazy-section"><div className="panel-head"><div><span className="eyebrow">MẶT BẰNG PHÂN KHU</span><h2>Tiến độ theo khu vực</h2></div><Link className="text-link" href="/map">Xem đầy đủ <ArrowRight size={15}/></Link></div><div className="panel-body"><SiteMap zones={data.zones}/></div></article></section>
      {latestPhotos.length ? <section className="panel section-gap lazy-section"><div className="panel-head"><div><span className="eyebrow">ẢNH HIỆN TRƯỜNG</span><h2>Ảnh mới nhất</h2></div><Camera size={19}/></div><div className="panel-body"><PhotoGrid photos={latestPhotos}/></div></section> : null}
    </>
  );
}
