"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, KeyRound, LoaderCircle, ShieldCheck, X } from "lucide-react";

const PRESETS = [
  { username: "khkt", fullName: "Phòng Kinh tế - Kỹ thuật", role: "khkt" },
  { username: "giamdoc", fullName: "Ban Giám đốc", role: "director" },
  { username: "taichinh", fullName: "Phòng Tài chính - Kế toán", role: "finance" }
] as const;

export function DepartmentAccountSetup({ existing }: { existing: any[] }) {
  const router=useRouter(); const [busy,setBusy]=useState(false); const [message,setMessage]=useState("");
  async function setup(event:FormEvent<HTMLFormElement>){event.preventDefault();setBusy(true);setMessage("");const f=new FormData(event.currentTarget);const pin=String(f.get("pin")||"");try{for(const preset of PRESETS){const r=await fetch("/api/admin/accounts",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({...preset,pin})});const j=await r.json();if(!r.ok)throw new Error(`${preset.fullName}: ${j.error||"Không tạo được tài khoản."}`);}setMessage("Đã khởi tạo / cập nhật đủ 3 tài khoản phòng ban");router.refresh();}catch(e){setMessage(e instanceof Error?e.message:"Không tạo được tài khoản.");}finally{setBusy(false);}}
  return <>
    <section className="department-account-grid">{PRESETS.map((item)=>{const found=existing.find((u)=>u.username===item.username);return <article key={item.username}><div className="department-account-icon"><ShieldCheck/></div><span>Tài khoản: <b>{item.username}</b></span><h3>{item.fullName}</h3><p>{found?"Đã có trên hệ thống · đang hoạt động":"Chưa khởi tạo trên hệ thống"}</p><strong className={found?"account-active":"account-missing"}>{found?"ĐÃ KÍCH HOẠT":"CHƯA CÓ"}</strong></article>;})}</section>
    <form className="panel department-account-form" onSubmit={setup}><div className="panel-head"><div><span className="eyebrow">THIẾT LẬP QUYỀN TRUY CẬP</span><h2>Khởi tạo 3 tài khoản phòng ban</h2></div><KeyRound/></div><div className="panel-body"><p>Nhập một mã PIN ban đầu. Hệ thống sẽ tạo hoặc đặt lại PIN cho ba tài khoản: Phòng KTKT, Ban Giám đốc và Phòng Tài chính - Kế toán.</p><label className="field"><span>Mã PIN ban đầu (ít nhất 6 ký tự)</span><input name="pin" type="password" minLength={6} autoComplete="new-password" inputMode="numeric" required placeholder="Nhập PIN do bạn tự chọn" /></label><button className="button primary" type="submit" disabled={busy}>{busy?<><LoaderCircle className="route-loading-spinner" size={17}/> Đang thiết lập...</>:"Khởi tạo / cập nhật 3 tài khoản"}</button></div></form>
    {message?<div className="operation-popup ok"><div className="operation-popup-icon"><CheckCircle2/></div><div className="operation-popup-copy"><strong>{message}</strong></div><button className="operation-popup-close" onClick={()=>setMessage("")}><X size={17}/></button></div>:null}
  </>;
}