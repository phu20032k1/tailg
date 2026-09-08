"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, ChevronDown, Clock3, LoaderCircle, PackageCheck, PackagePlus, RotateCcw, Send, ShieldCheck, X } from "lucide-react";
import type { SessionUser } from "@/lib/types";

const STATUS_LABELS: Record<string,string> = {
  commander_review:"Chờ Ban điều hành xác nhận",
  khkt_review:"Chờ Phòng KTKT kiểm tra",
  approved:"Đã được KTKT duyệt",
  received:"Đã nhập thực tế",
  returned_to_team:"Ban trả lại đội",
  returned_to_commander:"KTKT trả lại Ban",
  cancelled:"Đã hủy"
};
const LEVEL_LABELS:Record<string,string>={project:"Toàn dự án",stage:"Hạng mục",team:"Đội thi công"};
const ACTION_LABELS:Record<string,string>={team_submitted:"Đội gửi đề nghị",commander_approve:"Ban điều hành xác nhận",return_team:"Ban trả lại đội",team_resubmit:"Đội gửi lại",khkt_approve:"KTKT duyệt",return_commander:"KTKT trả lại Ban",receive:"Ghi nhận nhập thực tế",cancel:"Hủy đề nghị"};

function today(){return new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Ho_Chi_Minh"}).format(new Date());}
function fmt(value:number){return Number(value||0).toLocaleString("vi-VN",{maximumFractionDigits:3});}
function fmtDateTime(value?:string|null){if(!value)return "";const d=new Date(value);if(Number.isNaN(d.getTime()))return "";return new Intl.DateTimeFormat("vi-VN",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit",timeZone:"Asia/Ho_Chi_Minh"}).format(d);}

export function MaterialManager({user,materials,requests,leaders}:{user:SessionUser;materials:any[];requests:any[];leaders:any[]}){
  const router=useRouter();
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");
  const [level,setLevel]=useState<"project"|"stage"|"team">("project");
  const [parentId,setParentId]=useState("");
  const [openRequest,setOpenRequest]=useState<string|null>(null);
  const [draftQty,setDraftQty]=useState<Record<string,string>>({});
  const [draftNote,setDraftNote]=useState<Record<string,string>>({});
  const canDefine=["commander","khkt"].includes(user.role);
  const teamBudgets=useMemo(()=>materials.filter((item:any)=>item.allocation_level==="team"&&item.owner_team_id===user.id),[materials,user.id]);
  const parentOptions=useMemo(()=>materials.filter((item:any)=>level==="stage"?item.allocation_level==="project":level==="team"?item.allocation_level==="stage":false),[materials,level]);
  const sortedMaterials=useMemo(()=>[...materials].sort((a:any,b:any)=>{
    const rank=(x:string)=>x==="project"?0:x==="stage"?1:2;
    return String(a.material_name).localeCompare(String(b.material_name),"vi")||rank(a.allocation_level)-rank(b.allocation_level)||String(a.stage_label||a.area_label||"").localeCompare(String(b.stage_label||b.area_label||""),"vi");
  }),[materials]);

  async function addBudget(event:FormEvent<HTMLFormElement>){
    event.preventDefault();setBusy(true);setMessage("");const f=new FormData(event.currentTarget);
    try{
      const response=await fetch("/api/commercial/materials",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({
        materialName:f.get("materialName"),materialSpec:f.get("materialSpec"),unit:f.get("unit"),budgetQuantity:f.get("budgetQuantity"),areaLabel:f.get("areaLabel"),stageLabel:f.get("stageLabel"),allocationLevel:level,ownerTeamId:level==="team"?f.get("ownerTeamId")||null:null,parentBudgetId:level==="project"?null:parentId||null,note:f.get("note")
      })});
      const result=await response.json();if(!response.ok)throw new Error(result.error||"Không lưu được định mức.");
      event.currentTarget.reset();setParentId("");setMessage("Đã lưu phân bổ vật tư");router.refresh();
    }catch(error){setMessage(error instanceof Error?error.message:"Không lưu được định mức.");}finally{setBusy(false);}
  }

  async function submitNeed(event:FormEvent<HTMLFormElement>){
    event.preventDefault();setBusy(true);setMessage("");const f=new FormData(event.currentTarget);
    try{
      const response=await fetch("/api/commercial/material-requests",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({materialBudgetId:f.get("materialBudgetId"),requestDate:f.get("requestDate"),quantity:f.get("quantity"),note:f.get("note")})});
      const result=await response.json();if(!response.ok)throw new Error(result.error||"Không gửi được nhu cầu vật tư.");
      event.currentTarget.reset();setMessage("Đã gửi nhu cầu vật tư lên Ban điều hành");router.refresh();
    }catch(error){setMessage(error instanceof Error?error.message:"Không gửi được nhu cầu vật tư.");}finally{setBusy(false);}
  }

  async function act(id:string,action:string){
    setBusy(true);setMessage("");
    try{
      const response=await fetch(`/api/commercial/material-requests/${id}/action`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action,quantity:draftQty[id]?Number(draftQty[id]):undefined,note:draftNote[id]||""})});
      const result=await response.json();if(!response.ok)throw new Error(result.error||"Chưa thể xử lý đề nghị.");
      setMessage(action==="receive"?"Đã ghi nhận vật tư nhập thực tế":"Đã cập nhật luồng phê duyệt vật tư");setDraftNote(v=>({...v,[id]:""}));router.refresh();
    }catch(error){setMessage(error instanceof Error?error.message:"Chưa thể xử lý đề nghị.");}finally{setBusy(false);}
  }

  return <>
    {canDefine?<form className="panel commercial-form material-allocation-form" onSubmit={addBudget}>
      <div className="panel-head"><div><span className="eyebrow">PHÂN BỔ ĐỊNH MỨC</span><h2>Tổng dự án → hạng mục → từng đội</h2></div><PackagePlus size={20}/></div>
      <div className="panel-body">
        <div className="material-level-tabs">{(["project","stage","team"] as const).map(item=><button type="button" key={item} className={level===item?"active":""} onClick={()=>{setLevel(item);setParentId("");}}>{LEVEL_LABELS[item]}</button>)}</div>
        <div className="commercial-form-grid material-budget-form">
          <label className="field"><span>Vật tư chính</span><input name="materialName" required placeholder="VD: Thép" /></label>
          <label className="field"><span>Quy cách</span><input name="materialSpec" placeholder="VD: Φ22 / CB400-V" /></label>
          <label className="field"><span>Đơn vị</span><input name="unit" required placeholder="tấn / kg / m³ / m²" /></label>
          <label className="field"><span>Khối lượng được duyệt</span><input name="budgetQuantity" type="number" min="0.001" step="0.001" required /></label>
          {level!=="project"?<label className="field span-2"><span>Thuộc định mức cấp trên</span><select value={parentId} onChange={e=>setParentId(e.target.value)} required><option value="">Chọn định mức cấp trên</option>{parentOptions.map((item:any)=><option value={item.id} key={item.id}>{item.material_name}{item.material_spec?` ${item.material_spec}`:""} · {item.stage_label||item.area_label||LEVEL_LABELS[item.allocation_level]} · còn phân bổ {fmt(item.allocationRemaining)} {item.unit}</option>)}</select></label>:null}
          <label className="field"><span>Hạng mục / khu vực</span><input name="stageLabel" placeholder="VD: Móng / Xưởng 1" /></label>
          <label className="field"><span>Phạm vi</span><input name="areaLabel" defaultValue={level==="project"?"Toàn dự án":""} placeholder="VD: Phần móng" /></label>
          {level==="team"?<label className="field"><span>Giao cho đội</span><select name="ownerTeamId" required><option value="">Chọn đội</option>{leaders.map((leader:any)=><option value={leader.id} key={leader.id}>{leader.full_name}</option>)}</select></label>:null}
          <label className="field span-2"><span>Ghi chú</span><input name="note" placeholder="Căn cứ dự toán / phạm vi áp dụng" /></label>
          <div className="commercial-form-actions span-2"><button className="button primary" type="submit" disabled={busy}>{busy?<><LoaderCircle className="route-loading-spinner" size={17}/> Đang lưu...</>:"Lưu phân bổ"}</button></div>
        </div>
      </div>
    </form>:null}

    {user.role==="leader"?<form className="panel commercial-form material-need-form" onSubmit={submitNeed}>
      <div className="panel-head"><div><span className="eyebrow">NHU CẦU VẬT TƯ ĐỘI</span><h2>Gửi nhu cầu lên Ban điều hành</h2></div><Send size={20}/></div>
      <div className="panel-body commercial-form-grid">
        <label className="field span-2"><span>Định mức được giao</span><select name="materialBudgetId" required><option value="">Chọn vật tư / hạng mục</option>{teamBudgets.map((item:any)=><option value={item.id} key={item.id}>{item.material_name}{item.material_spec?` ${item.material_spec}`:""} · {item.stage_label||item.area_label} · đã nhập {fmt(item.received)}/{fmt(item.budget_quantity)} {item.unit}</option>)}</select></label>
        <label className="field"><span>Ngày cần</span><input name="requestDate" type="date" defaultValue={today()} required /></label>
        <label className="field"><span>Khối lượng đề nghị</span><input name="quantity" type="number" min="0.001" step="0.001" required /></label>
        <label className="field span-2"><span>Nội dung / vị trí sử dụng</span><input name="note" placeholder="VD: Cần 5 tấn thép Φ22 cho móng Xưởng 1" /></label>
        <div className="commercial-form-actions span-2"><button className="button primary" type="submit" disabled={busy||!teamBudgets.length}>{busy?<><LoaderCircle className="route-loading-spinner" size={17}/> Đang gửi...</>:<><Send size={16}/> Gửi Ban điều hành</>}</button></div>
        {!teamBudgets.length?<p className="material-inline-note span-2">Đội chưa được phân bổ định mức vật tư. Ban điều hành / KTKT cần giao định mức trước.</p>:null}
      </div>
    </form>:null}

    <section className="panel material-hierarchy-panel">
      <div className="panel-head"><div><span className="eyebrow">CÂY ĐỊNH MỨC</span><h2>Tổng hợp vật tư theo dự án, hạng mục và đội</h2></div><PackageCheck size={20}/></div>
      <div className="panel-body material-allocation-list">
        {sortedMaterials.map((item:any)=>{
          const warning=item.overBudget||item.percent>=100||Number(item.allocationRemaining)<0;const near=!warning&&item.percent>=90;
          return <article className={`material-allocation-row level-${item.allocation_level} ${warning?"danger":near?"warning":""}`} key={item.id}>
            <div className="material-allocation-main"><div className="material-level-badge">{LEVEL_LABELS[item.allocation_level]||item.allocation_level}</div><div><strong>{item.material_name}{item.material_spec?` ${item.material_spec}`:""}</strong><span>{item.stage_label||item.area_label||"Toàn dự án"}{item.team?.full_name?` · ${item.team.full_name}`:""}</span>{item.parent?<small>Thuộc: {item.parent.material_name} · {item.parent.stage_label||item.parent.area_label}</small>:null}</div></div>
            <div className="material-allocation-metrics"><div><span>Định mức</span><b>{fmt(item.budget_quantity)} {item.unit}</b></div>{item.allocation_level!=="team"?<div><span>Đã phân bổ</span><b>{fmt(item.allocatedToChildren)} {item.unit}</b></div>:<><div><span>Đã nhập</span><b>{fmt(item.received)} {item.unit}</b></div><div><span>Đang chờ</span><b>{fmt(item.pending)} {item.unit}</b></div></>}<div><span>{item.allocation_level==="team"?"Còn nhập được":"Còn phân bổ"}</span><b>{fmt(item.allocation_level==="team"?item.remaining:item.allocationRemaining)} {item.unit}</b></div></div>
            {warning?<div className="material-limit-alert"><AlertTriangle size={16}/><strong>DỪNG / KIỂM TRA ĐỊNH MỨC</strong></div>:near?<div className="material-limit-alert warning"><AlertTriangle size={16}/><strong>Sắp chạm định mức</strong></div>:null}
          </article>;
        })}
        {!sortedMaterials.length?<div className="empty-state">Chưa có định mức vật tư.</div>:null}
      </div>
    </section>

    <section className="panel material-request-panel">
      <div className="panel-head"><div><span className="eyebrow">LUỒNG ĐỀ NGHỊ VẬT TƯ</span><h2>Đội → Ban điều hành → Phòng KTKT → Nhập thực tế</h2></div><ShieldCheck size={20}/></div>
      <div className="panel-body material-request-list">
        {requests.map((req:any)=>{
          const qty=Number(req.quantity_approved??req.quantity_requested??0);const isOpen=openRequest===req.id;const budget=req.budget;
          return <article className={`material-request-card status-${req.status}`} key={req.id}>
            <header><div><span className="material-request-code">{req.request_code}</span><h3>{budget?.material_name||"Vật tư"}{budget?.material_spec?` ${budget.material_spec}`:""}</h3><p>{req.team?.full_name||"Đội thi công"} · {budget?.stage_label||budget?.area_label||"Hạng mục"}</p></div><span className="material-status">{STATUS_LABELS[req.status]||req.status}</span></header>
            <div className="material-request-summary"><div><span>Ngày đề nghị</span><strong>{req.request_date}</strong></div><div><span>Đội đề nghị</span><strong>{fmt(req.quantity_requested)} {budget?.unit||""}</strong></div><div><span>Khối lượng xử lý</span><strong>{fmt(qty)} {budget?.unit||""}</strong></div><div><span>Định mức đội</span><strong>{fmt(budget?.budget_quantity)} {budget?.unit||""}</strong></div></div>
            {req.team_note?<p className="material-request-note"><strong>Nội dung đội:</strong> {req.team_note}</p>:null}
            {req.returned_reason?<p className="material-request-return"><AlertTriangle size={15}/><strong>Yêu cầu chỉnh lại:</strong> {req.returned_reason}</p>:null}
            <button className="material-history-toggle" type="button" onClick={()=>setOpenRequest(isOpen?null:req.id)}><Clock3 size={15}/> Lịch sử xử lý ({req.events?.length||0}) <ChevronDown size={15}/></button>
            {isOpen?<div className="material-request-history">{(req.events||[]).map((ev:any)=><div key={ev.id}><span>{fmtDateTime(ev.created_at)}</span><strong>{ACTION_LABELS[ev.action]||ev.action}</strong><small>{ev.actor?.full_name||"Hệ thống"}{ev.note?` · ${ev.note}`:""}</small>{ev.quantity_before!=null&&ev.quantity_after!=null&&Number(ev.quantity_before)!==Number(ev.quantity_after)?<b>{fmt(ev.quantity_before)} → {fmt(ev.quantity_after)} {budget?.unit||""}</b>:null}</div>)}</div>:null}

            {((user.role==="commander"&&["commander_review","returned_to_commander"].includes(req.status))||(user.role==="leader"&&req.status==="returned_to_team"))?<div className="material-action-inputs"><label><span>Khối lượng</span><input type="number" min="0.001" step="0.001" value={draftQty[req.id]??String(qty)} onChange={e=>setDraftQty(v=>({...v,[req.id]:e.target.value}))}/></label><label><span>Ghi chú</span><input value={draftNote[req.id]||""} onChange={e=>setDraftNote(v=>({...v,[req.id]:e.target.value}))} placeholder="Nội dung kiểm tra / chỉnh sửa"/></label></div>:null}
            {user.role==="khkt"&&req.status==="khkt_review"?<div className="material-action-inputs one"><label><span>Ý kiến KTKT</span><input value={draftNote[req.id]||""} onChange={e=>setDraftNote(v=>({...v,[req.id]:e.target.value}))} placeholder="Kết quả rà soát định mức"/></label></div>:null}

            <div className="material-request-actions">
              {user.role==="commander"&&["commander_review","returned_to_commander"].includes(req.status)?<><button className="button primary" type="button" disabled={busy} onClick={()=>act(req.id,"commander_approve")}><CheckCircle2 size={16}/> Xác nhận & gửi KTKT</button><button className="button secondary" type="button" disabled={busy} onClick={()=>act(req.id,"return_team")}><RotateCcw size={16}/> Trả đội chỉnh</button></>:null}
              {user.role==="leader"&&req.status==="returned_to_team"?<button className="button primary" type="button" disabled={busy} onClick={()=>act(req.id,"team_resubmit")}><Send size={16}/> Gửi lại Ban</button>:null}
              {user.role==="khkt"&&req.status==="khkt_review"?<><button className="button primary" type="button" disabled={busy} onClick={()=>act(req.id,"khkt_approve")}><ShieldCheck size={16}/> KTKT duyệt</button><button className="button secondary" type="button" disabled={busy} onClick={()=>act(req.id,"return_commander")}><RotateCcw size={16}/> Trả lại Ban</button></>:null}
              {["commander","khkt"].includes(user.role)&&req.status==="approved"?<button className="button primary" type="button" disabled={busy} onClick={()=>act(req.id,"receive")}><PackageCheck size={16}/> Ghi nhận đã nhập thực tế</button>:null}
            </div>
          </article>;
        })}
        {!requests.length?<div className="empty-state">Chưa có đề nghị vật tư.</div>:null}
      </div>
    </section>

    {busy?<div className="material-busy-layer"><div><LoaderCircle className="route-loading-spinner" size={28}/><strong>Đang cập nhật dữ liệu...</strong></div></div>:null}
    {message?<div className={`operation-popup ${/DỪNG|vượt|Không thể|Chưa thể/i.test(message)?"error":"ok"}`} role="status"><div className="operation-popup-icon">{/DỪNG|vượt|Không thể|Chưa thể/i.test(message)?<AlertTriangle/>:<CheckCircle2/>}</div><div className="operation-popup-copy"><strong>{message}</strong></div><button className="operation-popup-close" type="button" onClick={()=>setMessage("")}><X size={17}/></button></div>:null}
  </>;
}
