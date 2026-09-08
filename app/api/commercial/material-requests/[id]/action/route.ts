import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { readSessionToken, SESSION_COOKIE } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const schema=z.object({action:z.enum(["commander_approve","return_team","khkt_approve","return_commander","team_resubmit","receive","cancel"]),note:z.string().trim().max(1000).optional().default(""),quantity:z.coerce.number().positive().optional()});
const ACTIVE=["commander_review","khkt_review","approved","returned_to_commander"];

async function committed(db:any,budgetIds:string[],excludeRequestId?:string){
  if(!budgetIds.length)return 0;
  const receiptsRes=await db.from("material_receipts").select("quantity").in("material_budget_id",budgetIds);if(receiptsRes.error)throw receiptsRes.error;
  let requestQuery=db.from("material_requests").select("id,quantity_requested,quantity_approved,status").in("material_budget_id",budgetIds).in("status",ACTIVE);
  if(excludeRequestId)requestQuery=requestQuery.neq("id",excludeRequestId);
  const reqRes=await requestQuery;if(reqRes.error)throw reqRes.error;
  return (receiptsRes.data||[]).reduce((s:number,r:any)=>s+Number(r.quantity||0),0)+(reqRes.data||[]).reduce((s:number,r:any)=>s+Number(r.quantity_approved??r.quantity_requested??0),0);
}

async function ensureCapacity(db:any,budget:any,quantity:number,excludeRequestId:string){
  const own=await committed(db,[budget.id],excludeRequestId);if(own+quantity>Number(budget.budget_quantity||0)+0.000001)throw new Error(`LIMIT_TEAM|${own}|${budget.budget_quantity}|${budget.unit}`);
  if(!budget.parent_budget_id)return;
  const {data:parent,error}=await db.from("material_budgets").select("id,budget_quantity,unit,parent_budget_id").eq("id",budget.parent_budget_id).maybeSingle();if(error)throw error;if(!parent)return;
  const {data:siblings,error:sErr}=await db.from("material_budgets").select("id").eq("parent_budget_id",parent.id).eq("active",true);if(sErr)throw sErr;
  const stage=await committed(db,(siblings||[]).map((x:any)=>x.id),excludeRequestId);if(stage+quantity>Number(parent.budget_quantity||0)+0.000001)throw new Error(`LIMIT_STAGE|${stage}|${parent.budget_quantity}|${parent.unit}`);
  if(!parent.parent_budget_id)return;
  const {data:project,error:pErr}=await db.from("material_budgets").select("id,budget_quantity,unit").eq("id",parent.parent_budget_id).maybeSingle();if(pErr)throw pErr;if(!project)return;
  const {data:stages,error:stErr}=await db.from("material_budgets").select("id").eq("parent_budget_id",project.id).eq("active",true);if(stErr)throw stErr;
  const stageIds=(stages||[]).map((x:any)=>x.id);const teamRes=stageIds.length?await db.from("material_budgets").select("id").in("parent_budget_id",stageIds).eq("active",true):{data:[],error:null};if(teamRes.error)throw teamRes.error;
  const projectCommitted=await committed(db,(teamRes.data||[]).map((x:any)=>x.id),excludeRequestId);if(projectCommitted+quantity>Number(project.budget_quantity||0)+0.000001)throw new Error(`LIMIT_PROJECT|${projectCommitted}|${project.budget_quantity}|${project.unit}`);
}
function capacityMessage(message:string){const [type,current,limit,unit]=message.split("|");const scope=type==="LIMIT_TEAM"?"đội":type==="LIMIT_STAGE"?"hạng mục":"toàn dự án";return `DỪNG: khối lượng sau xử lý sẽ vượt định mức ${scope}. Hiện đã dùng/đang chờ ${Number(current).toLocaleString("vi-VN")} ${unit}, giới hạn ${Number(limit).toLocaleString("vi-VN")} ${unit}.`;}

export async function POST(request:NextRequest,context:{params:Promise<{id:string}>}){
  const session=await readSessionToken(request.cookies.get(SESSION_COOKIE)?.value);if(!session)return NextResponse.json({error:"Phiên đăng nhập đã hết hạn."},{status:401});
  try{
    const {id}=await context.params;const body=schema.parse(await request.json());const db=getSupabaseAdmin();
    const {data:row,error}=await db.from("material_requests").select("*,material_budgets(*)").eq("id",id).maybeSingle();if(error)throw error;if(!row)return NextResponse.json({error:"Không tìm thấy đề nghị vật tư."},{status:404});
    const budget=row.material_budgets;const now=new Date().toISOString();const patch:any={updated_at:now};let quantity=Number(row.quantity_approved??row.quantity_requested);

    if(body.action==="commander_approve"){
      if(session.role!=="commander"||!["commander_review","returned_to_commander"].includes(row.status))return NextResponse.json({error:"Hồ sơ chưa ở bước Ban điều hành xác nhận."},{status:403});
      quantity=Number(row.quantity_requested);await ensureCapacity(db,budget,quantity,id);patch.status="khkt_review";patch.quantity_approved=quantity;patch.commander_note=body.note||null;patch.commander_reviewed_by=session.id;patch.commander_reviewed_at=now;patch.returned_reason=null;
    }else if(body.action==="return_team"){
      if(session.role!=="commander"||!["commander_review","returned_to_commander"].includes(row.status))return NextResponse.json({error:"Ban điều hành không thể trả hồ sơ ở trạng thái này."},{status:403});
      if(!body.note)return NextResponse.json({error:"Vui lòng ghi nội dung đội cần chỉnh lại."},{status:400});patch.status="returned_to_team";patch.returned_by=session.id;patch.returned_at=now;patch.returned_reason=body.note;
    }else if(body.action==="team_resubmit"){
      if(session.role!=="leader"||row.team_id!==session.id||row.status!=="returned_to_team")return NextResponse.json({error:"Đội không thể gửi lại hồ sơ này."},{status:403});
      quantity=Number(body.quantity??row.quantity_requested);await ensureCapacity(db,budget,quantity,id);patch.status="commander_review";patch.quantity_requested=quantity;patch.quantity_approved=null;patch.team_note=body.note||row.team_note;patch.submitted_at=now;patch.returned_reason=null;patch.returned_at=null;patch.returned_by=null;
    }else if(body.action==="khkt_approve"){
      if(session.role!=="khkt"||row.status!=="khkt_review")return NextResponse.json({error:"Chỉ Phòng KTKT được duyệt hồ sơ ở bước này."},{status:403});
      quantity=Number(row.quantity_approved??row.quantity_requested);await ensureCapacity(db,budget,quantity,id);patch.status="approved";patch.khkt_note=body.note||null;patch.khkt_reviewed_by=session.id;patch.khkt_reviewed_at=now;
    }else if(body.action==="return_commander"){
      if(session.role!=="khkt"||row.status!=="khkt_review")return NextResponse.json({error:"Chỉ Phòng KTKT được trả hồ sơ ở bước này."},{status:403});
      if(!body.note)return NextResponse.json({error:"Vui lòng ghi lý do trả lại Ban điều hành."},{status:400});patch.status="returned_to_commander";patch.returned_by=session.id;patch.returned_at=now;patch.returned_reason=body.note;
    }else if(body.action==="receive"){
      if(!["commander","khkt"].includes(session.role)||row.status!=="approved")return NextResponse.json({error:"Chỉ hồ sơ đã được KTKT duyệt mới được ghi nhận nhập thực tế."},{status:403});
      const receiveQty=Number(row.quantity_approved??row.quantity_requested);const ownReceipts=await db.from("material_receipts").select("quantity").eq("material_budget_id",budget.id);if(ownReceipts.error)throw ownReceipts.error;const received=(ownReceipts.data||[]).reduce((s:number,r:any)=>s+Number(r.quantity||0),0);if(received+receiveQty>Number(budget.budget_quantity||0)+0.000001)return NextResponse.json({error:"DỪNG: khối lượng nhập thực tế vượt định mức đội."},{status:409});
      const {error:receiptError}=await db.from("material_receipts").insert({material_budget_id:budget.id,material_request_id:row.id,receipt_date:new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Ho_Chi_Minh"}).format(new Date()),quantity:receiveQty,unit_price:0,source_scope:`Theo ${row.request_code}`,note:body.note||"Nhập theo đề nghị đã duyệt",created_by:session.id});if(receiptError)throw receiptError;patch.status="received";patch.received_by=session.id;patch.received_at=now;
    }else if(body.action==="cancel"){
      const allowed=(session.role==="leader"&&row.team_id===session.id&&row.status==="returned_to_team")||(session.role==="commander"&&row.status==="commander_review");if(!allowed)return NextResponse.json({error:"Không thể hủy hồ sơ ở trạng thái này."},{status:403});patch.status="cancelled";
    }

    const before=Number(row.quantity_approved??row.quantity_requested);const {data:updated,error:updateError}=await db.from("material_requests").update(patch).eq("id",id).select("*").single();if(updateError)throw updateError;
    await db.from("material_request_events").insert({request_id:id,actor_id:session.id,action:body.action,note:body.note||null,quantity_before:before,quantity_after:Number(updated.quantity_approved??updated.quantity_requested)});
    return NextResponse.json({ok:true,request:updated});
  }catch(error){if(error instanceof z.ZodError)return NextResponse.json({error:"Thao tác vật tư chưa hợp lệ."},{status:400});const message=error instanceof Error?error.message:"";if(message.startsWith("LIMIT_"))return NextResponse.json({error:capacityMessage(message)},{status:409});console.error("material request action",error);return NextResponse.json({error:"Chưa thể xử lý đề nghị vật tư."},{status:500});}
}
