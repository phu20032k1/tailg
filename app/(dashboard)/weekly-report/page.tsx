import Link from "next/link";
import { Download, FileBarChart, Image as ImageIcon } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getReportRange, signedPhotoUrl } from "@/lib/data";
import { formatDate } from "@/lib/format";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { WeeklyAssetForm } from "@/components/weekly-asset-form";
import { PhotoGrid } from "@/components/photo-grid";

function dateOnly(date: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(date);
}

function defaultRange() {
  const toDate = new Date();
  const fromDate = new Date(toDate);
  fromDate.setDate(fromDate.getDate() - 6);
  return { from: dateOnly(fromDate), to: dateOnly(toDate) };
}

export default async function WeeklyReportPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  const user = await requireUser();
  if (user.role !== "commander") {
    return <div className="panel empty-state">Báo cáo tuần dành cho tài khoản Chỉ huy trưởng.</div>;
  }

  const defaults = defaultRange();
  const query = await searchParams;
  const from = query.from || defaults.from;
  const to = query.to || defaults.to;
  const reports = await getReportRange(user, from, to);
  const db = getSupabaseAdmin();
  const { data: rawAssets } = await db
    .from("weekly_report_assets")
    .select("id,title,storage_path,source_pdf_path,asset_type,created_at")
    .eq("week_start", from)
    .eq("week_end", to)
    .order("sort_order")
    .order("created_at");
  const assets = await Promise.all((rawAssets || []).map(async (asset) => ({ ...asset, signedUrl: await signedPhotoUrl(asset.storage_path) })));

  const totalWorkers = reports.reduce((sum, report) => sum + report.workers, 0);
  const totalTechnical = reports.reduce((sum, report) => sum + report.technical_staff, 0);
  const uniqueTeams = new Set(reports.map((report) => report.leader_id)).size;
  const tasks = reports.flatMap((report) => report.tasks.map((task) => ({ ...task, reportDate: report.report_date, leader: report.leader })));
  const photos = reports.flatMap((report) => report.photos).filter((photo) => photo.photo_type === "work").slice(0, 18);

  return (
    <>
      <section className="page-title-row">
        <div><span className="eyebrow">TỔNG HỢP TUẦN</span><h1>Báo cáo tuần</h1><p>Tổng hợp công việc, nhân lực, ảnh hiện trường và mặt bằng trong khoảng thời gian đã chọn.</p></div>
        <div className="page-title-icon"><FileBarChart size={25} /></div>
      </section>

      <section className="panel">
        <div className="panel-body">
          <form className="range-filter" method="get">
            <label>Từ ngày<input type="date" name="from" defaultValue={from} /></label>
            <label>Đến ngày<input type="date" name="to" defaultValue={to} /></label>
            <button className="button secondary" type="submit">Tổng hợp tuần</button>
            <Link className="button primary" href={`/api/weekly-report/pptx?from=${from}&to=${to}`}><Download size={17} /> Tải báo cáo trình chiếu</Link>
          </form>

          <div className="weekly-kpis">
            <div><span>Khoảng báo cáo</span><strong>{formatDate(from)} → {formatDate(to)}</strong></div>
            <div><span>Báo cáo ngày</span><strong>{reports.length}</strong></div>
            <div><span>Đội có dữ liệu</span><strong>{uniqueTeams}/6</strong></div>
            <div><span>Lượt công nhân</span><strong>{totalWorkers}</strong></div>
            <div><span>Lượt kỹ thuật</span><strong>{totalTechnical}</strong></div>
            <div><span>Công việc</span><strong>{tasks.length}</strong></div>
          </div>
        </div>
      </section>

      <section className="dashboard-grid section-gap">
        <article className="panel lazy-section"><div className="panel-head"><div><span className="eyebrow">CÔNG VIỆC TRONG TUẦN</span><h2>Công việc chính</h2></div></div><div className="panel-body weekly-task-list">{tasks.filter((task) => task.kind === "main").slice(0, 30).map((task) => <div key={task.id}><strong>{task.area_label || "Công trường"}</strong><span>{task.description_vi}</span><small>{task.leader?.full_name} · {formatDate(task.reportDate)}</small></div>)}{!tasks.length ? <div className="empty-state">Chưa có dữ liệu trong khoảng đã chọn.</div> : null}</div></article>
        <article className="panel lazy-section"><div className="panel-head"><div><span className="eyebrow">MẶT BẰNG TIẾN ĐỘ</span><h2>Tài liệu báo cáo</h2></div><ImageIcon size={19} /></div><div className="panel-body"><WeeklyAssetForm from={from} to={to} />{assets.length ? <div className="asset-list">{assets.map((asset) => <a key={asset.id} href={asset.signedUrl || "#"} target="_blank" rel="noreferrer"><strong>{asset.title}</strong><span>{asset.source_pdf_path ? "Có tài liệu gốc" : "Ảnh mặt bằng"}</span></a>)}</div> : null}</div></article>
      </section>

      {photos.length ? <section className="panel section-gap lazy-section"><div className="panel-head"><div><span className="eyebrow">ẢNH THI CÔNG</span><h2>Ảnh đại diện trong tuần</h2></div></div><div className="panel-body"><PhotoGrid photos={photos} /></div></section> : null}
    </>
  );
}
