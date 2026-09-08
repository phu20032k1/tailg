import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { readSessionToken, SESSION_COOKIE } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const laborSchema = z.object({ categoryCode:z.string().trim().min(1).max(60), label:z.string().trim().min(1).max(120), crewName:z.string().trim().max(120).optional().default(""), headcount:z.coerce.number().int().min(0).max(9999), countsAsWorker:z.boolean().default(false), sortOrder:z.coerce.number().int().min(0).max(9999).default(0) });
const equipmentSchema = z.object({ equipmentName:z.string().trim().min(1).max(120), quantity:z.coerce.number().int().min(0).max(999), unit:z.string().trim().min(1).max(30).default("máy"), note:z.string().trim().max(300).optional().default(""), sortOrder:z.coerce.number().int().min(0).max(9999).default(0) });
const taskSchema = z.object({ kind:z.enum(["main","other"]), areaLabel:z.string().trim().max(180).optional().default(""), descriptionVi:z.string().trim().min(2).max(2000), descriptionZh:z.string().trim().max(2000).optional().default(""), sortOrder:z.coerce.number().int().min(0).max(9999).default(0) });
const foundationSchema = z.object({ foundationId:z.string().uuid(), stage:z.string().trim().min(1).max(200), progress:z.coerce.number().min(0).max(100) });
const reportSchema = z.object({
  reportDate:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  rawMessage:z.string().max(20000).optional().default(""),
  issueText:z.string().max(2000).optional().default(""),
  weatherMorning:z.string().trim().max(120).optional().default(""),
  weatherAfternoon:z.string().trim().max(120).optional().default(""),
  labor:z.array(laborSchema).max(50),
  equipment:z.array(equipmentSchema).max(50),
  tasks:z.array(taskSchema).max(100),
  foundationUpdates:z.array(foundationSchema).max(100).optional().default([])
});

export async function POST(request:NextRequest){
  const session=await readSessionToken(request.cookies.get(SESSION_COOKIE)?.value);
  if(!session)return NextResponse.json({ok:false,error:"Phiên đăng nhập đã hết hạn."},{status:401});
  if(session.role!=="leader")return NextResponse.json({ok:false,error:"Chỉ đội trưởng mới được nhập báo cáo hằng ngày."},{status:403});
  try{
    const body=reportSchema.parse(await request.json());
    const leaderId=session.id;
    const db=getSupabaseAdmin();

    let selectedFoundations:any[]=[];
    if(body.foundationUpdates.length){
      const ids=[...new Set(body.foundationUpdates.map(i=>i.foundationId))];
      const {data,error}=await db.from("foundations").select("id,code,zone_id,owner_id,first_work_date").in("id",ids);
      if(error)throw error;
      selectedFoundations=data||[];
      if(selectedFoundations.length!==ids.length||selectedFoundations.some(f=>f.owner_id!==leaderId)){
        return NextResponse.json({ok:false,error:"Có móng không thuộc đội đang báo cáo. Vui lòng chọn lại."},{status:400});
      }
    }

    const {data,error}=await db.rpc("save_daily_report_v3",{
      p_report_date:body.reportDate,p_leader_id:leaderId,p_raw_message:body.rawMessage||null,p_issue_text:body.issueText||null,
      p_labor:body.labor.map(i=>({category_code:i.categoryCode,label:i.label,crew_name:i.crewName||null,headcount:i.headcount,counts_as_worker:i.countsAsWorker,sort_order:i.sortOrder})),
      p_equipment:body.equipment.map(i=>({equipment_name:i.equipmentName,quantity:i.quantity,unit:i.unit,note:i.note||null,sort_order:i.sortOrder})),
      p_tasks:body.tasks.map(i=>({kind:i.kind,area_label:i.areaLabel||null,description_vi:i.descriptionVi,description_zh:i.descriptionZh||null,sort_order:i.sortOrder}))
    });
    if(error){
      console.error("save_daily_report_v3:",error);
      const message=error.message||"";
      if(message.includes("INVALID_LEADER"))return NextResponse.json({ok:false,error:"Tài khoản đội trưởng không hợp lệ."},{status:400});
      if(message.includes("save_daily_report_v3"))return NextResponse.json({ok:false,error:"Chức năng lưu báo cáo chưa sẵn sàng. Vui lòng thử lại sau."},{status:503});
      return NextResponse.json({ok:false,error:"Không lưu được báo cáo."},{status:500});
    }

    const reportId=(data as any)?.report_id;
    if(reportId){
      const {error:weatherError}=await db.from("daily_reports").update({
        weather_morning:body.weatherMorning||null,
        weather_afternoon:body.weatherAfternoon||null,
        updated_at:new Date().toISOString()
      }).eq("id",reportId).eq("leader_id",leaderId);
      if(weatherError)throw weatherError;

      const {error:deleteError}=await db.from("work_items").delete().eq("report_id",reportId);
      if(deleteError)throw deleteError;
      if(body.foundationUpdates.length){
        const foundationMap=new Map(selectedFoundations.map(f=>[f.id,f]));
        const workRows=body.foundationUpdates.map(item=>{
          const f=foundationMap.get(item.foundationId)!;
          return {report_id:reportId,zone_id:f.zone_id,stage:item.stage,quantity:1,unit:"móng",progress:item.progress,foundation_codes:[f.code],note:null};
        });
        const {error:workError}=await db.from("work_items").insert(workRows);
        if(workError)throw workError;
        for(const item of body.foundationUpdates){
          const f=foundationMap.get(item.foundationId)!;
          const status=item.progress>=100?"completed":item.progress>0?"in_progress":"not_started";
          const {error:updateError}=await db.from("foundations").update({current_stage:item.stage,progress:item.progress,status,first_work_date:f.first_work_date||body.reportDate,last_work_date:body.reportDate,updated_at:new Date().toISOString()}).eq("id",item.foundationId).eq("owner_id",leaderId);
          if(updateError)throw updateError;
        }
      }
    }
    return NextResponse.json({ok:true,result:data},{status:201});
  }catch(error){
    if(error instanceof z.ZodError)return NextResponse.json({ok:false,error:"Dữ liệu báo cáo chưa hợp lệ.",details:error.issues},{status:400});
    console.error(error); return NextResponse.json({ok:false,error:"Chưa thể lưu báo cáo lúc này."},{status:500});
  }
}
