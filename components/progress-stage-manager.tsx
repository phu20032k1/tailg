"use client";

import { FormEvent, useMemo, useState } from "react";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import type { ProgressItem, Zone } from "@/lib/types";

type User = { id:string; full_name:string; role:"commander"|"leader" };

function scheduleState(item: ProgressItem, today: string) {
  if (!item.planned_finish) return { key:"ontrack", label:"Chưa có mốc" };
  if (item.actual_finish) {
    if (item.actual_finish < item.planned_finish) return { key:"ahead", label:"Nhanh" };
    if (item.actual_finish === item.planned_finish) return { key:"ontrack", label:"Đúng kế hoạch" };
    return { key:"late", label:"Chậm" };
  }
  if (item.progress >= 100) return { key:"ontrack", label:"Hoàn thành" };
  if (today > item.planned_finish) return { key:"late", label:"Chậm" };
  return { key:"ontrack", label:"Đang theo kế hoạch" };
}

function itemTypeLabel(value:string){
  return value === "column" ? "Cột" : value === "slab" ? "Sàn" : value === "foundation" ? "Móng" : value === "floor" ? "Nền" : "Khác";
}

export function ProgressStageManager({
  items, zones, users, commander, stage, today, mapUrl
}:{
  items:ProgressItem[]; zones:Zone[]; users:User[]; commander:boolean; stage:string; today:string; mapUrl?:string|null;
}){
  const router=useRouter();
  const [editing,setEditing]=useState<ProgressItem|null>(null);
  const [adding,setAdding]=useState(false);
  const [deleting,setDeleting]=useState<ProgressItem|null>(null);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");
  const leaders=users.filter(u=>u.role==="leader");
  const zoneMap=useMemo(()=>new Map(zones.map(z=>[z.id,z])),[zones]);
  const userMap=useMemo(()=>new Map(users.map(u=>[u.id,u])),[users]);

  const completed=items.filter(i=>i.progress>=100||i.status==="completed").length;
  const late=items.filter(i=>scheduleState(i,today).key==="late").length;
  const avg=items.length?items.reduce((s,i)=>s+Number(i.progress||0),0)/items.length:0;

  async function submitAdd(event:FormEvent<HTMLFormElement>){
    event.preventDefault(); setBusy(true); setMessage(""); const fd=new FormData(event.currentTarget);
    const body={code:fd.get("code"),itemType:fd.get("itemType"),zoneId:fd.get("zoneId"),ownerId:fd.get("ownerId"),workStage:stage,plannedStart:fd.get("plannedStart"),plannedFinish:fd.get("plannedFinish"),actualStart:fd.get("actualStart"),actualFinish:fd.get("actualFinish"),progress:Number(fd.get("progress")||0),mapX:fd.get("mapX")?Number(fd.get("mapX")):null,mapY:fd.get("mapY")?Number(fd.get("mapY")):null,note:fd.get("note")};
    const res=await fetch("/api/progress-items",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)}); const result=await res.json(); setBusy(false);
    if(!res.ok){setMessage(result.error||"Chưa thể thêm.");return;} setAdding(false); router.refresh();
  }

  async function submitEdit(event:FormEvent<HTMLFormElement>){
    event.preventDefault(); if(!editing)return; setBusy(true); setMessage(""); const fd=new FormData(event.currentTarget);
    const body={code:fd.get("code"),itemType:fd.get("itemType"),zoneId:fd.get("zoneId"),ownerId:fd.get("ownerId"),workStage:stage,plannedStart:fd.get("plannedStart"),plannedFinish:fd.get("plannedFinish"),actualStart:fd.get("actualStart"),actualFinish:fd.get("actualFinish"),progress:Number(fd.get("progress")||0),mapX:fd.get("mapX")?Number(fd.get("mapX")):null,mapY:fd.get("mapY")?Number(fd.get("mapY")):null,note:fd.get("note")};
    const res=await fetch(`/api/progress-items/${editing.id}`,{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify(body)}); const result=await res.json(); setBusy(false);
    if(!res.ok){setMessage(result.error||"Chưa thể cập nhật.");return;} setEditing(null); router.refresh();
  }

  async function remove(){ if(!deleting)return; setBusy(true); const res=await fetch(`/api/progress-items/${deleting.id}`,{method:"DELETE"}); const result=await res.json(); setBusy(false); if(!res.ok){setMessage(result.error||"Chưa thể xóa.");return;} setDeleting(null); router.refresh(); }

  function formFields(item?:ProgressItem){
    const currentZone=item?.zone_id||zones[0]?.id||"";
    const currentOwner=item?.owner_id||zoneMap.get(currentZone)?.owner_id||leaders[0]?.id||"";
    return <>
      <div className="progress-manager-grid">
        <label className="field"><span>Ký hiệu</span><input name="code" defaultValue={item?.code||""} placeholder="VD: C1-A9" required/></label>
        <label className="field"><span>Loại</span><select name="itemType" defaultValue={item?.item_type||"column"}><option value="foundation">Móng</option><option value="column">Cột</option><option value="slab">Sàn</option><option value="floor">Nền</option><option value="other">Khác</option></select></label>
        <label className="field"><span>Khu vực</span><select name="zoneId" defaultValue={currentZone}>{zones.map(z=><option key={z.id} value={z.id}>{z.name}</option>)}</select></label>
        <label className="field"><span>Đội phụ trách</span><select name="ownerId" defaultValue={currentOwner}>{leaders.map(u=><option key={u.id} value={u.id}>{u.full_name}</option>)}</select></label>
        <label className="field"><span>Bắt đầu kế hoạch</span><input name="plannedStart" type="date" defaultValue={item?.planned_start||""}/></label>
        <label className="field"><span>Hoàn thành cam kết</span><input name="plannedFinish" type="date" defaultValue={item?.planned_finish||""}/></label>
        <label className="field"><span>Bắt đầu thực tế</span><input name="actualStart" type="date" defaultValue={item?.actual_start||""}/></label>
        <label className="field"><span>Hoàn thành thực tế</span><input name="actualFinish" type="date" defaultValue={item?.actual_finish||""}/></label>
        <label className="field"><span>Tiến độ (%)</span><input name="progress" type="number" min="0" max="100" defaultValue={item?.progress||0}/></label>
        <label className="field"><span>Vị trí ngang (%)</span><input name="mapX" type="number" min="0" max="100" step="0.1" defaultValue={item?.map_x??""}/></label>
        <label className="field"><span>Vị trí dọc (%)</span><input name="mapY" type="number" min="0" max="100" step="0.1" defaultValue={item?.map_y??""}/></label>
        <label className="field wide"><span>Ghi chú</span><input name="note" defaultValue={item?.note||""} placeholder="Ghi chú tiến độ, vướng mắc..."/></label>
      </div>
      {message?<div className="form-error">{message}</div>:null}
      <div className="progress-manager-actions"><button type="button" className="button secondary" onClick={()=>{setAdding(false);setEditing(null);}}>Hủy</button><button className="button primary" disabled={busy} type="submit">{busy?"Đang lưu...":"Lưu"}</button></div>
    </>;
  }

  return <>
    <section className="stage-summary-grid">
      <div><span>Tổng ký hiệu</span><strong>{items.length}</strong></div>
      <div><span>Hoàn thành</span><strong>{completed}</strong></div>
      <div><span>Tiến độ bình quân</span><strong>{avg.toFixed(1)}%</strong></div>
      <div><span>Đang chậm</span><strong>{late}</strong></div>
    </section>

    {commander?<div className="progress-manager-actions"><button className="button primary" type="button" onClick={()=>{setAdding(true);setMessage("");}}><Plus size={17}/> Thêm ký hiệu</button></div>:null}

    <section className="panel section-gap"><div className="panel-head"><div><span className="eyebrow">MẶT BẰNG ĐÁNH DẤU</span><h2>{stage}</h2></div></div><div className="panel-body">
      <div className="progress-marker-board">
        {mapUrl?<img src={mapUrl} alt={`Mặt bằng ${stage}`}/>:null}
        {items.filter(i=>i.map_x!==null&&i.map_y!==null).map(item=>{const s=scheduleState(item,today);return <span key={item.id} title={`${item.code} · ${item.progress}%`} className={`progress-marker ${item.status==="completed"?"completed":""} ${s.key==="late"?"late":""}`} style={{left:`${item.map_x}%`,top:`${item.map_y}%`}}>{item.code}</span>;})}
      </div>
      {!mapUrl?<div className="empty-inline">Chưa có ảnh mặt bằng nền. Các ký hiệu vẫn có thể quản lý theo bảng; tọa độ X/Y dùng để đánh dấu khi có mặt bằng.</div>:null}
    </div></section>

    <section className="panel section-gap"><div className="panel-head"><div><span className="eyebrow">KẾ HOẠCH / THỰC TẾ</span><h2>So sánh tiến độ cam kết</h2></div></div><div className="panel-body progress-plan-table-wrap"><table className="progress-plan-table"><thead><tr><th>Ký hiệu</th><th>Khu vực</th><th>Đội</th><th>Kế hoạch HT</th><th>Thực tế HT</th><th>%</th><th>Đánh giá</th>{commander?<th>Thao tác</th>:null}</tr></thead><tbody>{items.map(item=>{const s=scheduleState(item,today);return <tr key={item.id}><td><b>{item.code}</b><br/><small>{itemTypeLabel(item.item_type)}</small></td><td>{zoneMap.get(item.zone_id)?.name||item.zone_id}</td><td>{userMap.get(item.owner_id)?.full_name||"-"}</td><td>{item.planned_finish||"-"}</td><td>{item.actual_finish||"-"}</td><td>{Number(item.progress).toFixed(0)}%</td><td><span className={`schedule-badge ${s.key}`}>{s.label}</span></td>{commander?<td><div className="report-actions"><button className="report-action-button" type="button" onClick={()=>{setEditing(item);setMessage("");}}><Pencil size={14}/> Sửa</button><button className="report-action-button danger" type="button" onClick={()=>setDeleting(item)}><Trash2 size={14}/> Xóa</button></div></td>:null}</tr>;})}</tbody></table>{!items.length?<div className="empty-state">Chưa có ký hiệu trong giai đoạn này.</div>:null}</div></section>

    {adding?<div className="confirm-layer"><form className="foundation-modal" onSubmit={submitAdd}><button className="modal-close" type="button" onClick={()=>setAdding(false)}><X/></button><h2>Thêm ký hiệu · {stage}</h2>{formFields()}</form></div>:null}
    {editing?<div className="confirm-layer"><form className="foundation-modal" onSubmit={submitEdit}><button className="modal-close" type="button" onClick={()=>setEditing(null)}><X/></button><h2>Sửa {editing.code}</h2>{formFields(editing)}</form></div>:null}
    {deleting?<div className="confirm-layer"><div className="confirm-card"><Trash2 size={25}/><h3>Xóa {deleting.code}?</h3><p>Ký hiệu sẽ bị xóa khỏi giai đoạn {stage}.</p><div className="confirm-actions"><button className="button secondary" onClick={()=>setDeleting(null)}>Hủy</button><button className="button danger-button" disabled={busy} onClick={remove}>{busy?"Đang xóa...":"Xóa"}</button></div></div></div>:null}
  </>;
}
