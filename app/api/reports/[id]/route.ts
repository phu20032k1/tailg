import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { readSessionToken, SESSION_COOKIE } from "@/lib/auth";
import { getSupabaseAdmin, STORAGE_BUCKET } from "@/lib/supabase/admin";

const laborSchema=z.object({categoryCode:z.string().trim().min(1).max(60),label:z.string().trim().min(1).max(120),crewName:z.string().trim().max(120).optional().default(""),headcount:z.coerce.number().int().min(0).max(9999),countsAsWorker:z.boolean().default(false),sortOrder:z.coerce.number().int().min(0).max(9999).default(0)});
const equipmentSchema=z.object({equipmentName:z.string().trim().min(1).max(120),quantity:z.coerce.number().int().min(0).max(999),unit:z.string().trim().min(1).max(30).default("máy"),note:z.string().trim().max(300).optional().default(""),sortOrder:z.coerce.number().int().min(0).max(9999).default(0)});
const taskSchema=z.object({kind:z.enum(["main","other"]),areaLabel:z.string().trim().max(180).optional().default(""),descriptionVi:z.string().trim().min(2).max(2000),descriptionZh:z.string().trim().max(2000).optional().default(""),sortOrder:z.coerce.number().int().min(0).max(9999).default(0)});
const updateSchema=z.object({reportDate:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),rawMessage:z.string().max(20000).optional().default(""),issueText:z.string().max(2000).optional().default(""),weatherMorning:z.string().max(120).optional().default(""),weatherNoon:z.string().max(120).optional().default(""),weatherAfternoon:z.string().max(120).optional().default(""),weatherEvening:z.string().max(120).optional().default(""),labor:z.array(laborSchema).max(50),equipment:z.array(equipmentSchema).max(50),tasks:z.array(taskSchema).max(100)});

async function getAuthorizedReport(request:NextRequest,id:string){
 const session=await readSessionToken(request.cookies.get(SESSION_COOKIE)?.value); if(!session)return {response:NextResponse.json({ok:false,error:"Phiên đăng nhập đã hết hạn."},{status:401})};
 const db=getSupabaseAdmin(); const {data:report,error}=await db.from("daily_reports").select("*").eq("id",id).maybeSingle();
 if(error)return {response:NextResponse.json({ok:false,error:"Không đọc được báo cáo."},{status:500})}; if(!report)return {response:NextResponse.json({ok:false,error:"Báo cáo không còn tồn tại."},{status:404})};
 if(session.role==="leader"&&report.leader_id!==session.id)return {response:NextResponse.json({ok:false,error:"Bạn không có quyền thay đổi báo cáo này."},{status:403})}; return {session,db,report};
}

export async function PATCH(request:NextRequest,context:{params:Promise<{id:string}>}){
 const {id}=await context.params; const auth=await getAuthorizedReport(request,id); if("response" in auth)return auth.response;
 try{
  const body=updateSchema.parse(await request.json()); const {db,report,session}=auth;
  if(body.reportDate!==report.report_date){const {data:duplicate}=await db.from("daily_reports").select("id").eq("leader_id",report.leader_id).eq("report_date",body.reportDate).neq("id",id).maybeSingle(); if(duplicate)return NextResponse.json({ok:false,error:"Đội này đã có báo cáo ở ngày đã chọn. Hãy sửa báo cáo của ngày đó thay vì tạo trùng."},{status:409});}
  const [laborBefore,equipmentBefore,tasksBefore]=await Promise.all([db.from("report_labor_entries").select("*").eq("report_id",id).order("sort_order"),db.from("report_equipment_entries").select("*").eq("report_id",id).order("sort_order"),db.from("report_tasks").select("*").eq("report_id",id).order("sort_order")]);
  const beforeData={report,labor:laborBefore.data||[],equipment:equipmentBefore.data||[],tasks:tasksBefore.data||[]};
  const workers=body.labor.reduce((s,i)=>s+(i.countsAsWorker?i.headcount:0),0); const technicalStaff=body.labor.filter(i=>i.categoryCode.toLowerCase()==="technical").reduce((s,i)=>s+i.headcount,0); const now=new Date().toISOString();
  const {error:reportError}=await db.from("daily_reports").update({report_date:body.reportDate,workers,technical_staff:technicalStaff,issue_text:body.issueText.trim()||null,raw_message:body.rawMessage.trim()||null,weather_morning:body.weatherMorning||null,weather_noon:body.weatherNoon||null,weather_afternoon:body.weatherAfternoon||null,weather_evening:body.weatherEvening||null,weather_payload:{morning:body.weatherMorning||null,noon:body.weatherNoon||null,afternoon:body.weatherAfternoon||null,evening:body.weatherEvening||null},updated_at:now}).eq("id",id); if(reportError)throw reportError;
  const deletes=await Promise.all([db.from("report_labor_entries").delete().eq("report_id",id),db.from("report_equipment_entries").delete().eq("report_id",id),db.from("report_tasks").delete().eq("report_id",id)]); const deleteError=deletes.find(r=>r.error)?.error; if(deleteError)throw deleteError;
  if(body.labor.length){const {error}=await db.from("report_labor_entries").insert(body.labor.map(i=>({report_id:id,category_code:i.categoryCode.toLowerCase(),label:i.label,crew_name:i.crewName||null,headcount:i.headcount,counts_as_worker:i.countsAsWorker,sort_order:i.sortOrder}))); if(error)throw error;}
  if(body.equipment.length){const {error}=await db.from("report_equipment_entries").insert(body.equipment.map(i=>({report_id:id,equipment_name:i.equipmentName,quantity:i.quantity,unit:i.unit,note:i.note||null,sort_order:i.sortOrder}))); if(error)throw error;}
  if(body.tasks.length){const {error}=await db.from("report_tasks").insert(body.tasks.map(i=>({report_id:id,kind:i.kind,area_label:i.areaLabel||null,description_vi:i.descriptionVi,description_zh:i.descriptionZh||null,sort_order:i.sortOrder}))); if(error)throw error;}
  const afterData={report:{...report,report_date:body.reportDate,workers,technical_staff:technicalStaff,issue_text:body.issueText,raw_message:body.rawMessage,weather_morning:body.weatherMorning,weather_noon:body.weatherNoon,weather_afternoon:body.weatherAfternoon,weather_evening:body.weatherEvening,updated_at:now},labor:body.labor,equipment:body.equipment,tasks:body.tasks};
  const {error:auditError}=await db.from("report_edit_history").insert({report_id:id,edited_by:session.id,edited_by_name:session.fullName||session.username||"Người dùng",edited_at:now,before_data:beforeData,after_data:afterData,change_summary:`Cập nhật báo cáo ngày ${body.reportDate}`}); if(auditError)throw auditError;
  return NextResponse.json({ok:true,workers,technicalStaff,editedAt:now});
 }catch(error){if(error instanceof z.ZodError)return NextResponse.json({ok:false,error:"Dữ liệu cần sửa chưa hợp lệ."},{status:400}); console.error(error); return NextResponse.json({ok:false,error:"Chưa thể cập nhật báo cáo."},{status:500});}
}

export async function DELETE(request:NextRequest,context:{params:Promise<{id:string}>}){const {id}=await context.params; const auth=await getAuthorizedReport(request,id); if("response" in auth)return auth.response; try{const {db}=auth; const {data:photos}=await db.from("report_photos").select("storage_path").eq("report_id",id); const paths=(photos||[]).map(p=>p.storage_path).filter(Boolean); if(paths.length)await db.storage.from(STORAGE_BUCKET).remove(paths); const {error}=await db.from("daily_reports").delete().eq("id",id); if(error)throw error; return NextResponse.json({ok:true});}catch(error){console.error(error); return NextResponse.json({ok:false,error:"Chưa thể xóa báo cáo."},{status:500});}}
