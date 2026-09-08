"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, CheckCircle2, ClipboardPaste, CloudSun, Loader2, Plus, Trash2, UploadCloud, X } from "lucide-react";
import { parseDailyReportMessage } from "@/lib/report-message-parser";
import type { SessionUser } from "@/lib/types";

type Leader = { id: string; full_name: string; username: string; role: "commander" | "leader" };
type FoundationOption = { id:string; code:string; zone_id:string; owner_id:string; current_stage:string; progress:number; status:string };
type LaborEntry = { categoryCode:string; label:string; crewName:string; headcount:number; countsAsWorker:boolean };
type EquipmentEntry = { equipmentName:string; quantity:number; unit:string };
type TaskEntry = { kind:"main"|"other"; areaLabel:string; descriptionVi:string; descriptionZh:string };
type FoundationUpdate = { foundationId:string; stage:string; progress:number };
type Notice = { type:"ok"|"error"; title:string; text?:string };

const LABOR_OPTIONS = [
  ["technical", "Kỹ thuật", false], ["machine_operator", "Lái máy", false], ["security", "Bảo vệ", false], ["survey", "TD / Trắc địa", false],
  ["day_labor", "Công nhật", true], ["rebar", "Cốt thép", true], ["formwork", "Cốp pha / ván khuôn", true], ["other", "Khác", true]
] as const;

const WEATHER_OPTIONS = ["Nắng", "Nhiều mây", "Âm u", "Mưa nhẹ", "Mưa", "Mưa lớn", "Giông", "Khác"];

function today(){ return new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Ho_Chi_Minh"}).format(new Date()); }
function createInitialLabor():LaborEntry[]{ return [
  {categoryCode:"technical",label:"Kỹ thuật",crewName:"",headcount:0,countsAsWorker:false},
  {categoryCode:"machine_operator",label:"Lái máy",crewName:"",headcount:0,countsAsWorker:false},
  {categoryCode:"security",label:"Bảo vệ",crewName:"",headcount:0,countsAsWorker:false},
  {categoryCode:"day_labor",label:"Công nhật",crewName:"",headcount:0,countsAsWorker:true},
  {categoryCode:"rebar",label:"Cốt thép",crewName:"",headcount:0,countsAsWorker:true},
  {categoryCode:"formwork",label:"Cốp pha / ván khuôn",crewName:"",headcount:0,countsAsWorker:true}
]; }
function createInitialEquipment():EquipmentEntry[]{ return [{equipmentName:"Máy xúc",quantity:0,unit:"máy"}]; }
function createInitialTasks():TaskEntry[]{ return [{kind:"main",areaLabel:"",descriptionVi:"",descriptionZh:""}]; }
function isImageFile(file:File){ return file.type.startsWith("image/") || /\.(jpe?g|png|webp|heic|heif)$/i.test(file.name); }

export function DailyReportForm({ user, leaders, foundations }: { user:SessionUser; leaders:Leader[]; foundations:FoundationOption[] }) {
  const router=useRouter();
  const [leaderId,setLeaderId]=useState(user.role==="leader"?user.id:leaders[0]?.id||"");
  const [reportDate,setReportDate]=useState(today());
  const [weatherMorning,setWeatherMorning]=useState("Nắng");
  const [weatherAfternoon,setWeatherAfternoon]=useState("Nắng");
  const [rawMessage,setRawMessage]=useState("");
  const [labor,setLabor]=useState<LaborEntry[]>(createInitialLabor);
  const [equipment,setEquipment]=useState<EquipmentEntry[]>(createInitialEquipment);
  const [tasks,setTasks]=useState<TaskEntry[]>(createInitialTasks);
  const [foundationUpdates,setFoundationUpdates]=useState<FoundationUpdate[]>([]);
  const [files,setFiles]=useState<File[]>([]);
  const [photoCaption,setPhotoCaption]=useState("");
  const [fileInputKey,setFileInputKey]=useState(0);
  const [loading,setLoading]=useState(false);
  const [notice,setNotice]=useState<Notice|null>(null);

  useEffect(()=>{ if(!notice)return; const timer=window.setTimeout(()=>setNotice(null),notice.type==="ok"?2800:5000); return()=>window.clearTimeout(timer); },[notice]);
  useEffect(()=>{ setFoundationUpdates([]); },[leaderId]);

  const photoPreviews=useMemo(()=>files.map((file)=>({file,url:URL.createObjectURL(file)})),[files]);
  useEffect(()=>()=>{photoPreviews.forEach((item)=>URL.revokeObjectURL(item.url));},[photoPreviews]);

  const directWorkers=useMemo(()=>labor.reduce((sum,item)=>sum+(item.countsAsWorker?Number(item.headcount||0):0),0),[labor]);
  const technical=useMemo(()=>labor.filter(i=>i.categoryCode==="technical").reduce((sum,i)=>sum+Number(i.headcount||0),0),[labor]);
  const availableFoundations=useMemo(()=>foundations.filter(f=>f.owner_id===leaderId),[foundations,leaderId]);

  function parseMessage(){
    const parsed=parseDailyReportMessage(rawMessage);
    if(parsed.reportDate)setReportDate(parsed.reportDate);
    if(parsed.teamName&&user.role==="commander"){
      const normalized=parsed.teamName.toLocaleLowerCase("vi");
      const matched=leaders.find(l=>normalized.includes(l.full_name.toLocaleLowerCase("vi")));
      if(matched)setLeaderId(matched.id);
    }
    if(parsed.labor.length)setLabor(parsed.labor.map(i=>({...i,crewName:i.crewName||""})));
    if(parsed.equipment.length)setEquipment(parsed.equipment);
    if(parsed.tasks.length)setTasks(parsed.tasks.map(i=>({...i,areaLabel:i.areaLabel||"",descriptionZh:""})));
    setNotice({type:"ok",title:"Đã bóc tách báo cáo",text:"Kiểm tra lại số liệu trước khi gửi."});
  }
  function changeLabor(index:number,patch:Partial<LaborEntry>){setLabor(items=>items.map((item,i)=>i===index?{...item,...patch}:item));}
  function changeEquipment(index:number,patch:Partial<EquipmentEntry>){setEquipment(items=>items.map((item,i)=>i===index?{...item,...patch}:item));}
  function changeTask(index:number,patch:Partial<TaskEntry>){setTasks(items=>items.map((item,i)=>i===index?{...item,...patch}:item));}
  function changeFoundation(index:number,patch:Partial<FoundationUpdate>){setFoundationUpdates(items=>items.map((item,i)=>i===index?{...item,...patch}:item));}
  function addFoundation(){
    const used=new Set(foundationUpdates.map(i=>i.foundationId));
    const next=availableFoundations.find(f=>!used.has(f.id));
    if(!next){setNotice({type:"error",title:"Không còn móng để chọn",text:"Danh sách móng của đội đã được chọn hết."});return;}
    setFoundationUpdates(items=>[...items,{foundationId:next.id,stage:next.current_stage||"Thi công móng",progress:Number(next.progress||0)}]);
  }
  function selectFiles(selected:FileList|null){
    const picked=Array.from(selected||[]).filter(isImageFile).slice(0,10);
    setFiles(picked);
    if(Array.from(selected||[]).length>10)setNotice({type:"error",title:"Tối đa 10 ảnh",text:"Hệ thống đã giữ lại 10 ảnh đầu tiên."});
  }
  function removeFile(index:number){ setFiles(items=>items.filter((_,i)=>i!==index)); }
  function clearSubmittedData(){ setRawMessage(""); setLabor(createInitialLabor()); setEquipment(createInitialEquipment()); setTasks(createInitialTasks()); setFoundationUpdates([]); setFiles([]); setPhotoCaption(""); setFileInputKey(v=>v+1); }

  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault(); setLoading(true); setNotice(null);
    const submittedWorkers=directWorkers, submittedTechnical=technical, submittedPhotos=files.length, submittedFoundations=foundationUpdates.length;
    try{
      const response=await fetch("/api/reports",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({
        reportDate, leaderId:user.role==="commander"?leaderId:undefined, rawMessage, weatherMorning, weatherAfternoon,
        labor:labor.filter(i=>i.label.trim()&&Number(i.headcount)>=0).map((i,index)=>({...i,headcount:Number(i.headcount),sortOrder:(index+1)*10})),
        equipment:equipment.filter(i=>i.equipmentName.trim()).map((i,index)=>({...i,quantity:Number(i.quantity),sortOrder:(index+1)*10})),
        tasks:tasks.filter(i=>i.descriptionVi.trim()).map((i,index)=>({...i,sortOrder:(index+1)*10})),
        foundationUpdates:foundationUpdates.map(i=>({...i,progress:Number(i.progress)})),
        issueText:""
      })});
      const result=await response.json(); if(!response.ok)throw new Error(result.error||"Không gửi được báo cáo.");
      const reportId=result.result?.report_id;
      if(reportId&&files.length){ for(const file of files){ const image=new FormData(); image.append("file",file); image.append("caption",photoCaption); image.append("photoType","work"); const upload=await fetch(`/api/reports/${reportId}/photos`,{method:"POST",body:image}); const uploadResult=await upload.json(); if(!upload.ok)throw new Error(`Báo cáo đã lưu nhưng ảnh chưa tải lên: ${uploadResult.error||"Không rõ lỗi"}`); } }
      clearSubmittedData();
      setNotice({type:"ok",title:"Đã gửi báo cáo",text:`${submittedWorkers} công nhân · ${submittedTechnical} kỹ thuật${submittedFoundations?` · ${submittedFoundations} móng`:""}${submittedPhotos?` · ${submittedPhotos} ảnh`:""}`});
      router.refresh();
    }catch(error){setNotice({type:"error",title:"Chưa gửi được báo cáo",text:error instanceof Error?error.message:"Vui lòng thử lại."});}
    finally{setLoading(false);}
  }

  return <>
    <form className="report-form daily-v3-form" onSubmit={submit}>
      <section className="form-section">
        <div className="section-heading"><span>01</span><div><h3>Thông tin báo cáo</h3></div></div>
        <div className="form-grid two">
          <label className="field"><span>Ngày báo cáo</span><input type="date" value={reportDate} onChange={e=>setReportDate(e.target.value)} required/></label>
          {user.role==="commander"?<label className="field"><span>Đội thi công</span><select value={leaderId} onChange={e=>setLeaderId(e.target.value)} required>{leaders.map(l=><option key={l.id} value={l.id}>{l.full_name}</option>)}</select></label>:<label className="field"><span>Đội thi công</span><input value={user.fullName} disabled/></label>}
        </div>
        <div className="weather-entry-grid">
          <div className="weather-entry-title"><CloudSun size={19}/><div><strong>Thời tiết trong ngày</strong><span>Ghi nhận riêng buổi sáng và buổi chiều để tổng hợp báo cáo tuần.</span></div></div>
          <label className="field"><span>Buổi sáng</span><select value={weatherMorning} onChange={e=>setWeatherMorning(e.target.value)}>{WEATHER_OPTIONS.map(item=><option key={item}>{item}</option>)}</select></label>
          <label className="field"><span>Buổi chiều</span><select value={weatherAfternoon} onChange={e=>setWeatherAfternoon(e.target.value)}>{WEATHER_OPTIONS.map(item=><option key={item}>{item}</option>)}</select></label>
        </div>
        <label className="field"><span>Nội dung tin nhắn</span><textarea rows={10} value={rawMessage} onChange={e=>setRawMessage(e.target.value)} placeholder="Dán nội dung báo cáo trong nhóm dự án..."/></label>
        <button className="button secondary" type="button" onClick={parseMessage} disabled={!rawMessage.trim()}><ClipboardPaste size={17}/> Bóc tách tin nhắn</button>
      </section>

      <section className="form-section">
        <div className="section-heading"><span>02</span><div><h3>Nhân lực</h3></div></div>
        <div className="summary-strip"><div><span>Công nhân trực tiếp</span><strong>{directWorkers}</strong></div><div><span>Kỹ thuật</span><strong>{technical}</strong></div><div><span>Tổng nhân lực nhập</span><strong>{labor.reduce((s,i)=>s+Number(i.headcount||0),0)}</strong></div></div>
        <div className="editable-table labor-table"><div className="editable-row editable-head"><span>Nhóm</span><span>Tổ / người phụ trách</span><span>SL</span><span>Tính CN</span><span/></div>
          {labor.map((item,index)=><div className="editable-row" key={`${item.categoryCode}-${index}`}><select value={item.categoryCode} onChange={e=>{const o=LABOR_OPTIONS.find(([c])=>c===e.target.value);changeLabor(index,{categoryCode:e.target.value,label:o?.[1]||"Khác",countsAsWorker:o?.[2]??true});}}>{LABOR_OPTIONS.map(([c,l])=><option key={c} value={c}>{l}</option>)}</select><input value={item.crewName} onChange={e=>changeLabor(index,{crewName:e.target.value})} placeholder="VD: Tổ Thái"/><input type="number" min="0" value={item.headcount} onChange={e=>changeLabor(index,{headcount:Number(e.target.value)})}/><input aria-label="Tính vào công nhân" type="checkbox" checked={item.countsAsWorker} onChange={e=>changeLabor(index,{countsAsWorker:e.target.checked})}/><button type="button" className="icon-button" onClick={()=>setLabor(items=>items.filter((_,i)=>i!==index))}><Trash2 size={15}/></button></div>)}
        </div>
        <button className="button ghost" type="button" onClick={()=>setLabor(items=>[...items,{categoryCode:"other",label:"Khác",crewName:"",headcount:0,countsAsWorker:true}])}><Plus size={16}/> Thêm dòng nhân lực</button>
      </section>

      <section className="form-section">
        <div className="section-heading"><span>03</span><div><h3>Máy móc</h3></div></div>
        <div className="editable-table equipment-table"><div className="editable-row editable-head"><span>Thiết bị</span><span>Số lượng</span><span>Đơn vị</span><span/></div>{equipment.map((item,index)=><div className="editable-row" key={`${item.equipmentName}-${index}`}><input value={item.equipmentName} onChange={e=>changeEquipment(index,{equipmentName:e.target.value})}/><input type="number" min="0" value={item.quantity} onChange={e=>changeEquipment(index,{quantity:Number(e.target.value)})}/><input value={item.unit} onChange={e=>changeEquipment(index,{unit:e.target.value})}/><button type="button" className="icon-button" onClick={()=>setEquipment(items=>items.filter((_,i)=>i!==index))}><Trash2 size={15}/></button></div>)}</div>
        <button className="button ghost" type="button" onClick={()=>setEquipment(items=>[...items,{equipmentName:"",quantity:0,unit:"máy"}])}><Plus size={16}/> Thêm thiết bị</button>
      </section>

      <section className="form-section foundation-report-section">
        <div className="section-heading"><span>04</span><div><h3>Cập nhật móng</h3></div></div>
        {availableFoundations.length?<>
          <div className="foundation-update-list">{foundationUpdates.map((item,index)=>{const f=availableFoundations.find(x=>x.id===item.foundationId);return <div className="foundation-update-row" key={`${item.foundationId}-${index}`}><select value={item.foundationId} onChange={e=>{const next=availableFoundations.find(x=>x.id===e.target.value);changeFoundation(index,{foundationId:e.target.value,stage:next?.current_stage||item.stage,progress:Number(next?.progress??item.progress)});}}>{availableFoundations.filter(x=>x.id===item.foundationId||!foundationUpdates.some((u,j)=>j!==index&&u.foundationId===x.id)).map(x=><option key={x.id} value={x.id}>{x.code}</option>)}</select><input value={item.stage} onChange={e=>changeFoundation(index,{stage:e.target.value})} placeholder="Công việc: đổ bê tông, cốt thép..."/><div className="foundation-percent-input"><input type="number" min="0" max="100" value={item.progress} onChange={e=>changeFoundation(index,{progress:Number(e.target.value)})}/><span>%</span></div><button type="button" className="icon-button" onClick={()=>setFoundationUpdates(items=>items.filter((_,i)=>i!==index))}><Trash2 size={15}/></button>{f?<small>Hiện tại: {Number(f.progress).toFixed(0)}%</small>:null}</div>;})}</div>
          <button className="button ghost" type="button" onClick={addFoundation}><Plus size={16}/> Chọn móng thi công hôm nay</button>
        </>:<div className="empty-inline">Đội này chưa được giao mã móng.</div>}
      </section>

      <section className="form-section">
        <div className="section-heading"><span>05</span><div><h3>Công việc trong ngày</h3></div></div>
        <div className="task-editor-stack">{tasks.map((item,index)=><div className="task-editor-card" key={index}><div className="task-editor-top"><select value={item.kind} onChange={e=>changeTask(index,{kind:e.target.value as "main"|"other"})}><option value="main">Công việc chính</option><option value="other">Công việc khác</option></select><input value={item.areaLabel} onChange={e=>changeTask(index,{areaLabel:e.target.value})} placeholder="Khu vực: Xưởng 1, Xưởng 3..."/><button type="button" className="icon-button" onClick={()=>setTasks(items=>items.filter((_,i)=>i!==index))}><Trash2 size={15}/></button></div><textarea rows={2} value={item.descriptionVi} onChange={e=>changeTask(index,{descriptionVi:e.target.value})} placeholder="Nội dung công việc"/><input value={item.descriptionZh} onChange={e=>changeTask(index,{descriptionZh:e.target.value})} placeholder="中文说明（可选）"/></div>)}</div>
        <button className="button ghost" type="button" onClick={()=>setTasks(items=>[...items,{kind:"main",areaLabel:"",descriptionVi:"",descriptionZh:""}])}><Plus size={16}/> Thêm công việc</button>
      </section>

      <section className="form-section">
        <div className="section-heading"><span>06</span><div><h3>Ảnh thi công đại diện</h3></div></div>
        <label className="upload-box"><UploadCloud size={30}/><strong>Chọn ảnh công trường</strong><span>JPG, PNG, WEBP, HEIC · tối đa 10 ảnh</span><input key={fileInputKey} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" multiple onChange={e=>selectFiles(e.target.files)}/></label>
        {photoPreviews.length?<div className="photo-upload-preview-grid">{photoPreviews.map((item,index)=><div className="photo-upload-preview" key={`${item.file.name}-${item.file.size}-${index}`}><img src={item.url} alt={`Ảnh đã chọn ${index+1}`}/><button type="button" onClick={()=>removeFile(index)} aria-label={`Xóa ảnh ${index+1}`}><X size={16}/></button><span>{index+1}</span><small>{item.file.name}</small></div>)}</div>:null}
        {files.length?<div className="photo-selection-summary"><Camera size={16}/><strong>Đã chọn {files.length} ảnh</strong><span>Tất cả ảnh phía trên sẽ được tải lên cùng báo cáo.</span></div>:null}
        <label className="field"><span>Chú thích ảnh</span><input value={photoCaption} onChange={e=>setPhotoCaption(e.target.value)} placeholder="VD: Lắp dựng cốt thép dầm móng Xưởng 1"/></label>
      </section>

      <div className="form-actions"><button className="button primary" type="submit" disabled={loading||!leaderId}>{loading?<><Loader2 className="spin" size={18}/> Đang gửi...</>:<><Plus size={18}/> Gửi báo cáo</>}</button></div>
    </form>
    {notice?<div className={`operation-popup ${notice.type}`} role="status" aria-live="polite"><div className="operation-popup-icon">{notice.type==="ok"?<CheckCircle2 size={24}/>:<X size={24}/>}</div><div className="operation-popup-copy"><strong>{notice.title}</strong>{notice.text?<span>{notice.text}</span>:null}</div><button type="button" className="operation-popup-close" onClick={()=>setNotice(null)} aria-label="Đóng thông báo"><X size={17}/></button></div>:null}
  </>;
}
