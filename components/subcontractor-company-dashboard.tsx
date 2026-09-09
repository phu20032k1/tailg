"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BarChart3, Building2, Check, ChevronDown, ChevronUp, CircleDollarSign, FilePenLine, LoaderCircle, PiggyBank, WalletCards, X } from "lucide-react";
import type { SessionUser } from "@/lib/types";

function money(value:number){return new Intl.NumberFormat("vi-VN",{maximumFractionDigits:0}).format(Number(value||0))+" đ";}
function pct(value:number){return `${Number(value||0).toFixed(1)}%`;}
function qty(value:number,unit?:string|null){return `${Number(value||0).toLocaleString("vi-VN",{maximumFractionDigits:3})}${unit?` ${unit}`:""}`;}
function clamp(value:number){return Math.max(0,Math.min(100,Number(value||0)));}

export function SubcontractorCompanyDashboard({user,companies,summary}:{user:SessionUser;companies:any[];summary:any}){
  const router=useRouter();
  const [openCompany,setOpenCompany]=useState<string|null>(companies[0]?.name||null);
  const [editing,setEditing]=useState<any|null>(null);
  const [busy,setBusy]=useState(false);
  const [notice,setNotice]=useState("");
  const editable=["commander","khkt"].includes(user.role);
  const cards=useMemo(()=>[
    {label:"Giá trị hợp đồng",value:money(summary.contractValue),icon:Building2},
    {label:"Sản lượng đã nghiệm thu",value:money(summary.certifiedValue),sub:pct(summary.certifiedPercent),icon:BarChart3},
    {label:"Đã thanh toán",value:money(summary.paidValue),sub:pct(summary.paidPercent),icon:WalletCards},
    {label:"Giá trị còn lại",value:money(summary.remainingValue),icon:CircleDollarSign},
    {label:"BOQ / ngân sách",value:summary.boqBudgetValue>0?money(summary.boqBudgetValue):"Chưa khai báo",icon:PiggyBank}
  ],[summary]);

  async function saveContract(event:FormEvent<HTMLFormElement>){
    event.preventDefault();if(!editing)return;setBusy(true);setNotice("");const f=new FormData(event.currentTarget);
    try{
      const response=await fetch(`/api/commercial/contracts/${editing.id}`,{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({
        companyGroup:f.get("companyGroup"),contractNo:f.get("contractNo"),scope:f.get("scope"),afterTaxValue:f.get("afterTaxValue"),boqBudgetValue:f.get("boqBudgetValue"),contractQuantity:f.get("contractQuantity"),quantityUnit:f.get("quantityUnit"),budgetNote:f.get("budgetNote")
      })});
      const result=await response.json();if(!response.ok)throw new Error(result.error||"Không cập nhật được hợp đồng.");
      setEditing(null);setNotice("Đã cập nhật khai báo hợp đồng");router.refresh();
    }catch(error){setNotice(error instanceof Error?error.message:"Không cập nhật được hợp đồng.");}
    finally{setBusy(false);}
  }

  return <section className="subcontract-exec">
    <div className="subcontract-exec-head">
      <div><span className="eyebrow">DASHBOARD NHÀ THẦU PHỤ</span><h2>Hợp đồng · nghiệm thu · thanh toán · hiệu quả</h2><p>Mỗi công ty được gom thành một nhóm để theo dõi, nhưng từng hợp đồng vẫn tách riêng số liệu và hồ sơ.</p></div>
      <div className="subcontract-count"><strong>{summary.companyCount||0}</strong><span>công ty</span><i/><strong>{summary.contractCount||0}</strong><span>hợp đồng</span></div>
    </div>

    <div className="subcontract-kpi-grid">{cards.map(({label,value,sub,icon:Icon})=><div className="subcontract-kpi" key={label}><Icon size={19}/><span>{label}</span><strong>{value}</strong>{sub?<small>{sub} giá trị hợp đồng</small>:null}</div>)}</div>

    {summary.boqBudgetValue>0?<div className={`subcontract-efficiency ${Number(summary.efficiencyValue)>=0?"positive":"negative"}`}><span>Hiệu quả ngân sách toàn bộ nhà thầu</span><strong>{Number(summary.efficiencyValue)>=0?"Tiết kiệm":"Vượt ngân sách"} {money(Math.abs(Number(summary.efficiencyValue||0)))}</strong><small>{pct(Math.abs(Number(summary.efficiencyPercent||0)))} so với BOQ đã khai báo</small></div>:<div className="subcontract-efficiency neutral"><span>Hiệu quả ngân sách</span><strong>Chưa đủ dữ liệu BOQ</strong><small>Ban điều hành hoặc Phòng KTKT nhập BOQ từng hợp đồng để hệ thống tự tính.</small></div>}

    <div className="subcontract-company-list">{companies.map((company:any)=>{
      const open=openCompany===company.name;
      return <article className="subcontract-company" key={company.name}>
        <button type="button" className="subcontract-company-summary" onClick={()=>setOpenCompany(open?null:company.name)}>
          <div className="subcontract-company-name"><Building2 size={20}/><div><strong>{company.name}</strong><span>{company.contractCount} hợp đồng riêng biệt</span></div></div>
          <div className="subcontract-company-fast"><div><span>Giá trị HĐ</span><b>{money(company.contractValue)}</b></div><div><span>Nghiệm thu</span><b>{money(company.certifiedValue)}</b></div><div><span>Đã thanh toán</span><b>{money(company.paidValue)}</b></div></div>
          {open?<ChevronUp/>:<ChevronDown/>}
        </button>
        {open?<div className="subcontract-company-body">
          <div className="subcontract-company-bars">
            <div><span>Nghiệm thu / hợp đồng <b>{pct(company.certifiedPercent)}</b></span><div className="exec-bar"><i style={{width:`${clamp(company.certifiedPercent)}%`}}/></div></div>
            <div><span>Thanh toán / hợp đồng <b>{pct(company.paidPercent)}</b></span><div className="exec-bar paid"><i style={{width:`${clamp(company.paidPercent)}%`}}/></div></div>
          </div>
          <div className="subcontract-contract-grid">{company.contracts.map((contract:any)=><article className="subcontract-contract" key={contract.id}>
            <header><div><span>{contract.contract_no||"Chưa có số hợp đồng"}</span><h3>{contract.scope||contract.counterparty}</h3></div>{editable?<button type="button" onClick={()=>setEditing(contract)}><FilePenLine size={15}/> Sửa khai báo</button>:null}</header>
            <div className="subcontract-contract-metrics">
              <div><span>Giá trị hợp đồng</span><strong>{money(contract.contractValue)}</strong></div>
              <div><span>Đã nghiệm thu</span><strong>{money(contract.certifiedValue)}</strong><small>{pct(contract.certifiedPercent)}</small></div>
              <div><span>Đã thanh toán</span><strong>{money(contract.paidValue)}</strong><small>{pct(contract.paidPercent)}</small></div>
              <div><span>Còn lại</span><strong>{money(contract.remainingValue)}</strong></div>
              <div><span>BOQ / ngân sách</span><strong>{contract.boqBudgetValue>0?money(contract.boqBudgetValue):"Chưa khai báo"}</strong></div>
              <div><span>Khối lượng HĐ</span><strong>{contract.contractQuantity>0?qty(contract.contractQuantity,contract.quantityUnit):"Chưa khai báo"}</strong></div>
            </div>
            <div className="subcontract-contract-bars"><div><span>Nghiệm thu</span><div className="exec-bar"><i style={{width:`${clamp(contract.certifiedPercent)}%`}}/></div></div><div><span>Thanh toán</span><div className="exec-bar paid"><i style={{width:`${clamp(contract.paidPercent)}%`}}/></div></div></div>
            {contract.boqBudgetValue>0?<div className={`contract-efficiency ${Number(contract.efficiencyValue)>=0?"positive":"negative"}`}><span>Hiệu quả hạng mục</span><strong>{Number(contract.efficiencyValue)>=0?"Tiết kiệm":"Vượt BOQ"} {money(Math.abs(Number(contract.efficiencyValue||0)))}</strong><small>{pct(Math.abs(Number(contract.efficiencyPercent||0)))}</small></div>:<div className="contract-efficiency neutral"><span>Hiệu quả hạng mục</span><strong>Chưa có BOQ</strong></div>}
          </article>)}</div>
        </div>:null}
      </article>;
    })}</div>

    {!companies.length?<div className="panel empty-state">Chưa có hợp đồng nhà thầu phụ để tổng hợp.</div>:null}

    {editing?<div className="contract-config-layer" role="presentation" onClick={()=>!busy&&setEditing(null)}><form className="contract-config-modal" onSubmit={saveContract} onClick={e=>e.stopPropagation()}>
      <div className="contract-config-head"><div><span className="eyebrow">KHAI BÁO HỢP ĐỒNG</span><h3>{editing.counterparty}</h3></div><button type="button" onClick={()=>setEditing(null)} disabled={busy}><X size={18}/></button></div>
      <div className="contract-config-grid">
        <label className="field"><span>Nhóm công ty</span><input name="companyGroup" defaultValue={editing.groupName||editing.company_group||editing.counterparty}/><small>Ví dụ: MINH ĐỨC. Nhiều hợp đồng cùng nhóm vẫn được tách riêng.</small></label>
        <label className="field"><span>Số hợp đồng</span><input name="contractNo" defaultValue={editing.contract_no||""}/></label>
        <label className="field span-2"><span>Phạm vi / hạng mục</span><input name="scope" defaultValue={editing.scope||""}/></label>
        <label className="field"><span>Giá trị hợp đồng sau VAT</span><input name="afterTaxValue" type="number" min="0" step="1" defaultValue={editing.contractValue||0}/></label>
        <label className="field"><span>BOQ / ngân sách được duyệt</span><input name="boqBudgetValue" type="number" min="0" step="1" defaultValue={editing.boqBudgetValue||0}/></label>
        <label className="field"><span>Khối lượng hợp đồng</span><input name="contractQuantity" type="number" min="0" step="0.001" defaultValue={editing.contractQuantity||0}/></label>
        <label className="field"><span>Đơn vị khối lượng</span><input name="quantityUnit" defaultValue={editing.quantityUnit||""} placeholder="m² / m³ / tấn / cọc..."/></label>
        <label className="field span-2"><span>Ghi chú BOQ</span><input name="budgetNote" defaultValue={editing.budget_note||""} placeholder="Căn cứ dự toán / quyết định phê duyệt"/></label>
      </div>
      <div className="contract-config-actions"><button className="button secondary" type="button" onClick={()=>setEditing(null)} disabled={busy}>Hủy</button><button className="button primary" type="submit" disabled={busy}>{busy?<><LoaderCircle className="route-loading-spinner" size={16}/> Đang lưu...</>:<><Check size={16}/> Lưu khai báo</>}</button></div>
    </form></div>:null}
    {notice?<div className="operation-popup ok"><div className="operation-popup-icon"><Check/></div><div className="operation-popup-copy"><strong>{notice}</strong></div><button className="operation-popup-close" onClick={()=>setNotice("")}><X size={17}/></button></div>:null}
  </section>;
}
