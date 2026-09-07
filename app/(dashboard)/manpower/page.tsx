import Link from "next/link";
import { Download, UsersRound } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getReportRange, getUsers } from "@/lib/data";
import { formatDate } from "@/lib/format";

function dateOnly(date: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(date);
}

function defaultRange() {
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - 6);
  return { from: dateOnly(from), to: dateOnly(to) };
}

function dateList(from: string, to: string) {
  const dates: string[] = [];
  const cursor = new Date(`${from}T00:00:00+07:00`);
  const end = new Date(`${to}T00:00:00+07:00`);
  while (cursor <= end && dates.length < 31) {
    dates.push(dateOnly(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

function laborBy(report: Awaited<ReturnType<typeof getReportRange>>[number] | undefined, code: string) {
  return report?.labor.filter((item) => item.category_code === code).reduce((sum, item) => sum + Number(item.headcount || 0), 0) || 0;
}

export default async function ManpowerPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  const user = await requireUser();
  const defaults = defaultRange();
  const query = await searchParams;
  const from = query.from || defaults.from;
  const to = query.to || defaults.to;
  const [reports, users] = await Promise.all([getReportRange(user, from, to), getUsers()]);
  const dates = dateList(from, to);
  const leaders = users.filter((item) => item.role === "leader" && (user.role === "commander" || item.id === user.id));

  const metrics = [
    { key: "technical", label: "Kỹ thuật" },
    { key: "formwork", label: "Cốp pha" },
    { key: "rebar", label: "Cốt thép" },
    { key: "day_labor", label: "Công nhật" },
    { key: "workers", label: "Tổng công nhân" }
  ];

  return (
    <>
      <section className="page-title-row">
        <div><span className="eyebrow">NHÂN LỰC CÔNG TRƯỜNG</span><h1>Bảng tổng hợp nhân lực</h1><p>Theo dõi số lượng nhân lực của từng đội theo ngày và xuất bảng tổng hợp khi cần.</p></div>
        <div className="page-title-icon"><UsersRound size={25} /></div>
      </section>

      <section className="panel lazy-section">
        <div className="panel-body">
          <form className="range-filter" method="get">
            <label>Từ ngày<input type="date" name="from" defaultValue={from} /></label>
            <label>Đến ngày<input type="date" name="to" defaultValue={to} /></label>
            <button className="button secondary" type="submit">Xem dữ liệu</button>
            <Link className="button primary" href={`/api/manpower/xlsx?from=${from}&to=${to}`}><Download size={17} /> Tải bảng Excel</Link>
          </form>

          <div className="matrix-scroll">
            <table className="manpower-matrix">
              <thead><tr><th>Đội thi công</th><th>Nhóm</th>{dates.map((date) => <th key={date}>{formatDate(date)}</th>)}</tr></thead>
              <tbody>
                <tr className="project-total-row"><th rowSpan={metrics.length}>TOÀN DỰ ÁN</th><th>Kỹ thuật</th>{dates.map((date) => <td key={date}>{reports.filter((report) => report.report_date === date).reduce((sum, report) => sum + report.technical_staff, 0)}</td>)}</tr>
                {metrics.slice(1).map((metric) => <tr className="project-total-row" key={metric.key}><th>{metric.label}</th>{dates.map((date) => <td key={date}>{reports.filter((report) => report.report_date === date).reduce((sum, report) => sum + (metric.key === "workers" ? report.workers : laborBy(report, metric.key)), 0)}</td>)}</tr>)}

                {leaders.flatMap((leader) => metrics.map((metric, metricIndex) => {
                  return <tr key={`${leader.id}-${metric.key}`} className={metric.key === "workers" ? "worker-total-row" : ""}>
                    {metricIndex === 0 ? <th rowSpan={metrics.length}>{leader.full_name}</th> : null}
                    <th>{metric.label}</th>
                    {dates.map((date) => {
                      const report = reports.find((item) => item.leader_id === leader.id && item.report_date === date);
                      const value = metric.key === "technical" ? report?.technical_staff || 0 : metric.key === "workers" ? report?.workers || 0 : laborBy(report, metric.key);
                      return <td key={date}>{value || ""}</td>;
                    })}
                  </tr>;
                }))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </>
  );
}
