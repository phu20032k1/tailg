"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BellRing, Check, LoaderCircle, Plus, Save } from "lucide-react";
import type { SessionUser } from "@/lib/types";

function parseDate(value?: string | null) { return value ? new Date(`${value}T12:00:00+07:00`) : null; }
function isoDate(date: Date) { return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(date); }
function dayDiff(a: Date, b: Date) { return Math.round((b.getTime() - a.getTime()) / 86400000); }
function fmtDate(value?: string | null) { const d=parseDate(value); return d?new Intl.DateTimeFormat("vi-VN",{day:"2-digit",month:"2-digit",year:"numeric"}).format(d):"-"; }

type Draft = { plannedStart:string; plannedFinish:string; notes:string; assigneeIds:string[]; customFields:Record<string,string> };

export function ProjectGantt({ user, packages, users, columns }: { user:SessionUser; packages:any[]; users:any[]; columns:any[] }) {
  const router=useRouter();
  const canEdit=["commander","khkt"].includes(user.role);
  const [busyId,setBusyId]=useState<string|null>(null);
  const [message,setMessage]=useState("");
  const [drafts,setDrafts]=useState<Record<string,Draft>>(()=>Object.fromEntries(packages.map((item:any)=>[item.id,{plannedStart:item.planned_start||"",plannedFinish:item.planned_finish||"",notes:item.notes||"",assigneeIds:(item.assignees||[]).map((u:any)=>u.id),customFields:item.custom_fields||{}}])));

  const range=useMemo(()=>{
    const dates=packages.flatMap((p:any)=>[parseDate(p.planned_start),parseDate(p.planned_finish)]).filter(Boolean) as Date[];
    const today=new Date();
    let start=dates.length?new Date(Math.min(...dates.map(d=>d.getTime()))):new Date(today.getTime()-7*86400000);
    let end=dates.length?new Date(Math.max(...dates.map(d=>d.getTime()))):new Date(today.getTime()+30*86400000);
    start=new Date(start.getFullYear(),start.getMonth(),1,12);
    end=new Date(end.getFullYear(),end.getMonth()+1,0,12);
    if(dayDiff(start,end)<30) end=new Date(start.getTime()+30*86400000);
    const total=Math.max(1,dayDiff(start,end)+1);
    const months:{label:string;left:number}[]=[]; let cursor=new Date(start);
    while(cursor<=end){months.push({label:new Intl.DateTimeFormat("vi-VN",{month:"2-digit",year:"numeric"}).format(cursor),left:(dayDiff(start,cursor)/total)*100});cursor=new Date(cursor.getFullYear(),cursor.getMonth()+1,1,12);}
    return {start,end,total,months};
  },[packages]);

  async function addColumn(event:FormEvent<HTMLFormElement>){event.preventDefault();const f=new FormData(event.currentTarget);setBusyId("column");setMessage("");try{const r=await fetch("/api/commercial/progress-columns",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({label:f.get("label")})});const j=await r.json();if(!r.ok)throw new Error(j.error||"Không thêm được cột.");event.currentTarget.reset();setMessage("Đã thêm cột tiến độ");router.refresh();}catch(e){setMessage(e instanceof Error?e.message:"Không thêm được cột.");}finally{setBusyId(null);}}

  async function save(item:any){const draft=drafts[item.id];if(!draft)return;setBusyId(item.id);setMessage("");try{const r=await fetch(`/api/commercial/work-packages/${item.id}`,{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({plannedStart:draft.plannedStart||null,plannedFinish:draft.plannedFinish||null,notes:draft.notes||null,assigneeIds:draft.assigneeIds,customFields:draft.customFields})});const j=await r.json();if(!r.ok)throw new Error(j.error||"Không lưu được kế hoạch.");setMessage(`Đã cập nhật ${item.code}`);router.refresh();}catch(e){setMessage(e instanceof Error?e.message:"Không lưu được kế hoạch.");}finally{setBusyId(null);}}

  function patchDraft(id:string,patch:Partial<Draft>){setDrafts(prev=>({...prev,[id]:{...prev[id],...patch}}));}
  const today=isoDate(new Date());

  return <section className="panel gantt-shell">
    <div className="panel-head gantt-toolbar"><div><span className="eyebrow">TIẾN ĐỘ NGANG DỰ ÁN</span><h2>Kế hoạch kiểu Project · giao việc · deadline</h2></div>{canEdit?<form className="gantt-add-column" onSubmit={addColumn}><label className="field"><span>Thêm cột tùy chỉnh</span><input name="label" required placeholder="VD: Ghi chú TVGS" /></label><button className="button secondary" disabled={busyId==="column"}>{busyId==="column"?<LoaderCircle className="route-loading-spinner" size={16}/>:<Plus size={16}/>} Thêm cột</button></form>:null}</div>
    <div className="gantt-scroll"><table className="gantt-table"><thead><tr><th className="gantt-fixed">Mã</th><th className="gantt-title">Công việc</th><th className="gantt-owner">Đơn vị</th><th className="gantt-assignees">Gán thành viên</th><th className="gantt-date">Bắt đầu</th><th className="gantt-date">Deadline</th><th>Tiến độ</th><th className="gantt-note">Ghi chú</th>{columns.map((col:any)=><th className="gantt-custom" key={col.id}>{col.label}</th>)}{canEdit?<th>Lưu</th>:null}<th className="gantt-timeline-head"><div className="gantt-axis">{range.months.map(m=><span key={`${m.label}-${m.left}`} style={{left:`${m.left}%`}}>{m.label}</span>)}</div></th></tr></thead><tbody>{packages.map((item:any)=>{
      const draft=drafts[item.id]||{plannedStart:item.planned_start||"",plannedFinish:item.planned_finish||"",notes:item.notes||"",assigneeIds:(item.assignees||[]).map((u:any)=>u.id),customFields:item.custom_fields||{}};
      const s=parseDate(item.planned_start),e=parseDate(item.planned_finish);const left=s?Math.max(0,(dayDiff(range.start,s)/range.total)*100):0;const width=s&&e?Math.max(.6,((dayDiff(s,e)+1)/range.total)*100):0;const late=Boolean(item.planned_finish&&item.planned_finish<today&&Number(item.percent||0)<100);const due=Boolean(item.planned_finish&&item.planned_finish<=today&&Number(item.percent||0)<100);
      return <tr key={item.id}><td className="gantt-fixed"><strong>{item.code}</strong></td><td className="gantt-title"><strong>{item.title}</strong>{due?<div className="gantt-due-note"><BellRing size={13}/> Đến hạn</div>:null}</td><td>{item.owner_name}</td><td>{canEdit?<select className="gantt-assignee-select" multiple value={draft.assigneeIds} onChange={(ev)=>patchDraft(item.id,{assigneeIds:Array.from(ev.currentTarget.selectedOptions).map(o=>o.value)})}>{users.map((u:any)=><option value={u.id} key={u.id}>{u.full_name}</option>)}</select>:<span>{(item.assignees||[]).map((u:any)=>u.full_name).join(", ")||"-"}</span>}</td><td>{canEdit?<input className="gantt-row-input" type="date" value={draft.plannedStart} onChange={e2=>patchDraft(item.id,{plannedStart:e2.target.value})}/>:fmtDate(item.planned_start)}</td><td>{canEdit?<input className="gantt-row-input" type="date" value={draft.plannedFinish} onChange={e2=>patchDraft(item.id,{plannedFinish:e2.target.value})}/>:fmtDate(item.planned_finish)}</td><td><strong>{Number(item.percent||0).toFixed(1)}%</strong></td><td>{canEdit?<input className="gantt-row-input" value={draft.notes} onChange={e2=>patchDraft(item.id,{notes:e2.target.value})}/>:item.notes||"-"}</td>{columns.map((col:any)=><td key={col.id}>{canEdit?<input className="gantt-row-input" value={draft.customFields?.[col.column_key]||""} onChange={e2=>patchDraft(item.id,{customFields:{...draft.customFields,[col.column_key]:e2.target.value}})}/>:draft.customFields?.[col.column_key]||"-"}</td>)}{canEdit?<td><button className="button secondary gantt-save" onClick={()=>save(item)} disabled={busyId===item.id}>{busyId===item.id?<LoaderCircle className="route-loading-spinner" size={15}/>:<Save size={15}/>} Lưu</button></td>:null}<td className="gantt-timeline-cell"><div className="gantt-track">{s&&e?<div className={`gantt-bar ${late?"late":Number(item.percent||0)>=100?"done":""}`} style={{left:`${left}%`,width:`${width}%`}}>{Number(item.percent||0).toFixed(0)}%</div>:null}</div></td></tr>;
    })}</tbody></table></div>
    {!packages.length?<div className="empty-state">Chưa có đầu mục tiến độ.</div>:null}
    {message?<div className="material-inline-note"><Check size={15}/> {message}</div>:null}
  </section>;
}
