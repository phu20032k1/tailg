import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { readSessionToken, SESSION_COOKIE } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const schema=z.object({materialBudgetId:z.string().uuid(),requestDate:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),quantity:z.coerce.number().positive(),note:z.string().trim().max(1000).optional().default("")});
const ACTIVE=["commander_review","khkt_review","approved","returned_to_commander"];

function code(){const now=new Date();const stamp=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Ho_Chi_Minh",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:false}).format(now).replace(/\D/g,"");return `VT-${stamp}-${crypto.randomUUID().slice(0,4).toUpperCase()}`;}

async function committed(db:any,budgetIds:string[]){
  if(!budgetIds.length)return 0;
  const [{data:receipts,error:rErr},{data:requests,error:qErr}]=await Promise.all([
    db.from("material_receipts").select("quantity").in("material_budget_id",budgetIds),
    db.from("material_requests").select("quantity_requested,quantity_approved,status").in("material_budget_id",budgetIds).in("status",ACTIVE)
  ]);
  if(rErr)throw rErr;if(qErr)throw qErr;
  return (receipts||[]).reduce((s:number,r:any)=>s+Number(r.quantity||0),0)+(requests||[]).reduce((s:number,r:any)=>s+Number(r.quantity_approved??r.quantity_requested??0),0);
}

export async function POST(request:NextRequest){
  const session=await readSessionToken(request.cookies.get(SESSION_COOKIE)?.value);
  if(!session)return NextResponse.json({error:"Phiên đăng nhập đã hết hạn."},{status:401});
  if(session.role!=="leader")return NextResponse.json({error:"Chỉ đội trưởng được gửi nhu cầu vật tư của đội."},{status:403});
  try{
    const body=schema.parse(await request.json());const db=getSupabaseAdmin();
    const {data:budget,error}=await db.from("material_budgets").select("*").eq("id",body.materialBudgetId).eq("active",true).maybeSingle();
    if(error)throw error;if(!budget)return NextResponse.json({error:"Không tìm thấy định mức vật tư."},{status:404});
    if(budget.owner_team_id!==session.id)return NextResponse.json({error:"Định mức này không được giao cho đội của bạn."},{status:403});
    const ownCommitted=await committed(db,[budget.id]);
    if(ownCommitted+body.quantity>Number(budget.budget_quantity||0)+0.000001)return NextResponse.json({error:`Vượt định mức đội. Đã dùng/đang chờ ${ownCommitted.toLocaleString("vi-VN")} ${budget.unit}, đề nghị thêm ${body.quantity.toLocaleString("vi-VN")} ${budget.unit}, định mức ${Number(budget.budget_quantity||0).toLocaleString("vi-VN")} ${budget.unit}.`},{status:409});

    if(budget.parent_budget_id){
      const {data:parent,error:pErr}=await db.from("material_budgets").select("id,budget_quantity,unit,parent_budget_id").eq("id",budget.parent_budget_id).maybeSingle();if(pErr)throw pErr;
      if(parent){
        const {data:siblings,error:sErr}=await db.from("material_budgets").select("id").eq("parent_budget_id",parent.id).eq("active",true);if(sErr)throw sErr;
        const stageCommitted=await committed(db,(siblings||[]).map((x:any)=>x.id));
        if(stageCommitted+body.quantity>Number(parent.budget_quantity||0)+0.000001)return NextResponse.json({error:`DỪNG: đề nghị này làm hạng mục vượt định mức ${Number(parent.budget_quantity||0).toLocaleString("vi-VN")} ${parent.unit}.`},{status:409});
        if(parent.parent_budget_id){
          const {data:project,error:prErr}=await db.from("material_budgets").select("id,budget_quantity,unit").eq("id",parent.parent_budget_id).maybeSingle();if(prErr)throw prErr;
          if(project){
            const {data:stages,error:stErr}=await db.from("material_budgets").select("id").eq("parent_budget_id",project.id).eq("active",true);if(stErr)throw stErr;
            const stageIds=(stages||[]).map((x:any)=>x.id);
            const {data:teamBudgets,error:tErr}=stageIds.length?await db.from("material_budgets").select("id").in("parent_budget_id",stageIds).eq("active",true):{data:[],error:null};if(tErr)throw tErr;
            const projectCommitted=await committed(db,(teamBudgets||[]).map((x:any)=>x.id));
            if(projectCommitted+body.quantity>Number(project.budget_quantity||0)+0.000001)return NextResponse.json({error:`DỪNG: tổng toàn dự án sẽ vượt định mức ${Number(project.budget_quantity||0).toLocaleString("vi-VN")} ${project.unit}.`},{status:409});
          }
        }
      }
    }

    const now=new Date().toISOString();
    const {data,error:insertError}=await db.from("material_requests").insert({request_code:code(),material_budget_id:budget.id,team_id:session.id,request_date:body.requestDate,quantity_requested:body.quantity,status:"commander_review",team_note:body.note||null,submitted_at:now,updated_at:now}).select("*").single();
    if(insertError)throw insertError;
    await db.from("material_request_events").insert({request_id:data.id,actor_id:session.id,action:"team_submitted",note:body.note||"Đội gửi nhu cầu vật tư",quantity_after:body.quantity});
    return NextResponse.json({ok:true,request:data},{status:201});
  }catch(error){if(error instanceof z.ZodError)return NextResponse.json({error:"Nhu cầu vật tư chưa hợp lệ."},{status:400});console.error("material request",error);return NextResponse.json({error:"Chưa thể gửi nhu cầu vật tư."},{status:500});}
}
