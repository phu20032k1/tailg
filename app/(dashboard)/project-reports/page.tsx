import { Camera, CheckCircle2, CloudSun, FileText, HardHat, Users, Wrench } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { formatDate, formatPercent, todayISO } from "@/lib/format";
import { getDailyManagementReport } from "@/lib/management-report";
import { SharedReportDatePicker } from "@/components/shared-report-date-picker";

export const dynamic = "force-dynamic";

function validDate(value:unknown){return typeof value==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(value)?value:null;}

export default async function ProjectReportsPage({searchParams}:{searchParams?:Promise<Record<string,string|string[]|undefined>>}){
  const user=await requireRole(["commander","khkt","director"]);
  const params=(await searchParams)||{};
  const date=validDate(params.date)||todayISO();
  const data=await getDailyManagementReport(user,date);
  return <div className="shared-report-page">
    <section className="shared-report-head"><div><span className="eyebrow">BÁO CÁO THI CÔNG · 6 ĐỘI</span><h1>Báo cáo ngày toàn dự án</h1><p>Dữ liệu đội trưởng gửi được đồng bộ cùng lúc cho Ban điều hành, Phòng KTKT và Ban Giám đốc.</p></div><SharedReportDatePicker date={date}/></section>

    <section className="shared-report-kpis">
      <article><CheckCircle2/><span>Đội đã báo cáo</span><strong>{data.summary.teamsReported}/6</strong></article>
      <article><HardHat/><span>Công nhân</span><strong>{data.summary.totalWorkers}</strong><small>{data.summary.totalTechnical} kỹ thuật</small></article>
      <article><Users/><span>Tổng nhân lực</span><strong>{data.summary.totalPeople}</strong></article>
      <article><FileText/><span>Công việc</span><strong>{data.summary.totalTasks}</strong></article>
      <article><Camera/><span>Ảnh hiện trường</span><strong>{data.summary.totalPhotos}</strong></article>
    </section>

    <section className="panel shared-report-weather"><div className="panel-head"><div><span className="eyebrow">THỜI TIẾT {formatDate(date)}</span><h2>Điều kiện thi công</h2></div><CloudSun size={20}/></div><div className="panel-body"><div><span>Sáng</span><strong>{data.summary.weatherMorning}</strong></div><div><span>Trưa</span><strong>{data.summary.weatherNoon}</strong></div><div><span>Chiều</span><strong>{data.summary.weatherAfternoon}</strong></div><div><span>Tối</span><strong>{data.summary.weatherEvening}</strong></div></div></section>

    <section className="panel shared-work-summary"><div className="panel-head"><div><span className="eyebrow">TỔNG HỢP CÔNG VIỆC</span><h2>Nội dung thực tế các đội đã nhập</h2></div><FileText size={20}/></div><div className="panel-body">{data.workSummary.length?<div className="shared-work-list">{data.workSummary.map((task,index)=><div key={`${task.team}-${index}`}><b>{String(index+1).padStart(2,"0")}</b><div><strong>{task.area} · {task.team}</strong><p>{task.descriptionVi}</p>{task.descriptionZh?<small>{task.descriptionZh}</small>:null}</div></div>)}</div>:<div className="empty-state">Chưa có công việc trong ngày.</div>}</div></section>

    <section className="shared-team-list">{data.teamRows.map(team=><article className={`shared-team-card ${team.reported?"":"missing"}`} key={team.leader.id}>
      <header><div className="shared-team-index">{String(team.stt).padStart(2,"0")}</div><div><span>ĐỘI TRƯỞNG</span><h2>{team.leader.full_name}</h2><p>{team.zoneLabel||"Chưa gán khu vực"}</p></div><strong className={team.reported?"status-ok":"status-missing"}>{team.reported?"Đã báo cáo":"Chưa báo cáo"}</strong></header>
      {!team.reported?<div className="shared-team-empty">Chưa nhận báo cáo ngày {formatDate(date)}.</div>:<>
        <div className="shared-team-kpis"><div><span>Công nhân</span><strong>{team.workers}</strong></div><div><span>Kỹ thuật</span><strong>{team.technical}</strong></div><div><span>Tổng người</span><strong>{team.totalPeople}</strong></div><div><span>Công việc</span><strong>{team.tasks.length}</strong></div><div><span>Tiến độ móng</span><strong>{formatPercent(team.foundationProgress)}%</strong></div></div>
        <div className="shared-team-columns">
          <section><h3>Nhân lực chi tiết</h3>{team.labor.length?<div className="shared-mini-table">{team.labor.map(item=><div key={item.id}><span>{item.label}{item.crew_name?` · ${item.crew_name}`:""}</span><strong>{item.headcount}</strong></div>)}</div>:<p>Chưa có dữ liệu.</p>}</section>
          <section><h3>Máy móc thiết bị</h3>{team.equipment.length?<div className="shared-mini-table">{team.equipment.map(item=><div key={item.id}><span>{item.equipment_name}</span><strong>{item.quantity} {item.unit}</strong></div>)}</div>:<p>Chưa có dữ liệu.</p>}</section>
        </div>
        <section className="shared-team-tasks"><h3>Công việc trong ngày</h3>{team.tasks.length?<div>{team.tasks.map((task,index)=><article key={task.id}><b>{index+1}</b><div><strong>{task.area_label||"Khu vực thi công"}</strong><p>{task.description_vi}</p>{task.description_zh?<small>{task.description_zh}</small>:null}</div></article>)}</div>:<p>Chưa có công việc chi tiết.</p>}</section>
        {team.issueText?<div className="shared-team-issue"><strong>Vướng mắc / ghi chú</strong><p>{team.issueText}</p></div>:null}
        {team.photos.length?<section className="shared-team-photos"><h3>Ảnh hiện trường ({team.photos.length})</h3><div>{team.photos.slice(0,8).map((photo,index)=><figure key={photo.id}><img src={photo.signedUrl||""} alt={`Ảnh ${index+1} - ${team.leader.full_name}`} loading="lazy"/><figcaption>{photo.caption||photo.area_label||`Ảnh ${index+1}`}</figcaption></figure>)}</div></section>:null}
      </>}
    </article>)}</section>
  </div>;
}
