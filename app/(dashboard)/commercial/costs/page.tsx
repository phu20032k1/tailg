import { BarChart3 } from "lucide-react";
import { requireCommercialUser } from "@/lib/auth";
import { getCommercialData } from "@/lib/commercial";
import { CostManager } from "@/components/cost-manager";

export const dynamic = "force-dynamic";
function money(v:number){return new Intl.NumberFormat("vi-VN",{maximumFractionDigits:0}).format(v||0)+" ₫";}

export default async function CostsPage(){
 const user=await requireCommercialUser(); const data=await getCommercialData();
 const grouped=new Map<string,number>(); for(const c of data.costs as any[]){grouped.set(c.owner_name,(grouped.get(c.owner_name)||0)+Number(c.amount||0));}
 const top=[...grouped.entries()].sort((a,b)=>b[1]-a[1]).slice(0,8);
 return <div className="commercial-page"><section className="commercial-page-head"><div><span className="eyebrow">THEO DÕI CHI PHÍ</span><h1>Chi phí Ban điều hành, đội thi công và thầu phụ</h1><p>Ghi nhận chi phí thực tế theo ngày, hóa đơn, nhà cung cấp và đơn vị chịu chi phí.</p></div><BarChart3 size={30}/></section>
 <section className="commercial-kpi-grid commercial-kpi-3"><article><span>Tổng chi phí đã ghi nhận</span><strong>{money(data.summary.totalCosts)}</strong><small>Dữ liệu hiện có trên hệ thống</small></article><article><span>Số khoản chi</span><strong>{data.costs.length}</strong><small>Chi tiết theo ngày / hóa đơn</small></article><article><span>Số đơn vị có chi phí</span><strong>{grouped.size}</strong><small>Ban, đội và thầu phụ</small></article></section>
 {top.length?<section className="commercial-cost-summary">{top.map(([name,value])=><article key={name}><span>{name}</span><strong>{money(value)}</strong></article>)}</section>:null}
 <CostManager user={user} costs={data.costs as any}/></div>;
}