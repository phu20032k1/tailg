"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Calculator, CheckCircle2, LoaderCircle, Plus, TriangleAlert, X } from "lucide-react";
import type { SessionUser } from "@/lib/types";

function fmt(value: number) {
  return Number(value || 0).toLocaleString("vi-VN", { maximumFractionDigits: 3 });
}

export function MaterialTakeoffManager({ user, data }: { user: SessionUser; data: any }) {
  const router = useRouter();
  const canEdit = ["commander", "khkt"].includes(user.role);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [workCode, setWorkCode] = useState(data.workTypes?.[0]?.code || "");
  const [quantity, setQuantity] = useState("1000");

  const preview = useMemo(() => {
    const qty = Number(quantity || 0);
    return (data.norms || []).filter((row: any) => String(row.work_code).toUpperCase() === String(workCode).toUpperCase()).map((row: any) => ({
      ...row,
      required: qty * Number(row.consumption_rate || 0) * (1 + Number(row.waste_percent || 0) / 100)
    }));
  }, [data.norms, workCode, quantity]);

  async function post(url: string, body: Record<string, unknown>, form?: HTMLFormElement) {
    setBusy(true); setMessage("");
    try {
      const response = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Không lưu được dữ liệu.");
      form?.reset();
      setMessage("Đã lưu dữ liệu và cập nhật bảng phân tích");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không lưu được dữ liệu.");
    } finally { setBusy(false); }
  }

  async function addNorm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const f = new FormData(event.currentTarget);
    await post("/api/commercial/material-norms", {
      workCode: f.get("workCode"), workName: f.get("workName"), workUnit: f.get("workUnit"),
      materialName: f.get("materialName"), materialSpec: f.get("materialSpec"), materialUnit: f.get("materialUnit"),
      consumptionRate: f.get("consumptionRate"), wastePercent: f.get("wastePercent"), sourceLabel: f.get("sourceLabel"), note: f.get("note")
    }, event.currentTarget);
  }

  async function addWork(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const f = new FormData(event.currentTarget);
    await post("/api/commercial/design-works", {
      code: f.get("code"), title: f.get("title"), areaLabel: f.get("areaLabel"), workCode: f.get("workCode"),
      quantity: f.get("quantity"), unit: f.get("unit"), note: f.get("note")
    }, event.currentTarget);
  }

  return <>
    <section className="takeoff-grid">
      <article className="panel takeoff-panel">
        <div className="panel-head"><div><span className="eyebrow">KHỐI LƯỢNG THIẾT KẾ → VẬT TƯ</span><h2>Phân tích tự động theo định mức</h2></div><Calculator size={20}/></div>
        <div className="panel-body">
          <div className="takeoff-calc-row">
            <label className="field"><span>Công tác</span><select value={workCode} onChange={(e)=>setWorkCode(e.target.value)}><option value="">Chọn công tác</option>{(data.workTypes || []).map((item:any)=><option key={item.code} value={item.code}>{item.name} · {item.unit}</option>)}</select></label>
            <label className="field"><span>Khối lượng thử</span><input type="number" min="0" step="0.001" value={quantity} onChange={(e)=>setQuantity(e.target.value)} /></label>
          </div>
          {preview.length ? <div className="takeoff-preview">{preview.map((item:any)=><div key={item.id}><span>{item.material_name}{item.material_spec ? ` ${item.material_spec}` : ""}</span><strong>{fmt(item.required)} {item.material_unit}</strong><small>{fmt(item.consumption_rate)} {item.material_unit}/{item.work_unit}{Number(item.waste_percent)>0?` + ${fmt(item.waste_percent)}% hao hụt`:""}</small></div>)}</div> : <div className="empty-state">Chưa có định mức cho công tác này. Hãy khai báo định mức từ dự toán/định mức được duyệt trước.</div>}
        </div>
      </article>

      {canEdit ? <article className="panel takeoff-panel">
        <div className="panel-head"><div><span className="eyebrow">NGUỒN DỮ LIỆU DUY NHẤT</span><h2>Nhập khối lượng thiết kế một lần</h2></div><Plus size={20}/></div>
        <form className="panel-body commercial-form-grid" onSubmit={addWork}>
          <label className="field"><span>Mã đầu việc</span><input name="code" required placeholder="VD: X1-XAY-01" /></label>
          <label className="field commercial-span-2"><span>Tên đầu việc</span><input name="title" required placeholder="VD: Xây tường Xưởng 1" /></label>
          <label className="field"><span>Hạng mục / khu vực</span><input name="areaLabel" placeholder="Xưởng 1" /></label>
          <label className="field"><span>Loại công tác</span><select name="workCode" required><option value="">Chọn công tác</option>{(data.workTypes || []).map((item:any)=><option key={item.code} value={item.code}>{item.name}</option>)}</select></label>
          <label className="field"><span>Khối lượng thiết kế</span><input name="quantity" type="number" min="0" step="0.001" required /></label>
          <label className="field"><span>Đơn vị</span><input name="unit" required placeholder="m³ / m² / tấn..." /></label>
          <label className="field commercial-span-2"><span>Ghi chú</span><input name="note" placeholder="Chỉ nhập ở đây một lần, vật tư được tính tự động" /></label>
          <div className="commercial-form-actions"><button className="button primary" disabled={busy}>{busy?<><LoaderCircle className="route-loading-spinner" size={16}/> Đang lưu...</>:"Lưu khối lượng thiết kế"}</button></div>
        </form>
      </article> : null}
    </section>

    {canEdit ? <details className="panel takeoff-norm-panel">
      <summary><strong>Khai báo / bổ sung định mức hao phí vật tư</strong><span>Nhập từ dự toán, định mức nội bộ hoặc hồ sơ được duyệt</span></summary>
      <form className="panel-body commercial-form-grid" onSubmit={addNorm}>
        <label className="field"><span>Mã công tác</span><input name="workCode" required placeholder="VD: XAY-M3" /></label>
        <label className="field commercial-span-2"><span>Tên công tác</span><input name="workName" required placeholder="VD: Xây khối xây" /></label>
        <label className="field"><span>Đơn vị công tác</span><input name="workUnit" required placeholder="m³" /></label>
        <label className="field"><span>Vật tư</span><input name="materialName" required placeholder="Gạch / Xi măng / Cát" /></label>
        <label className="field"><span>Quy cách</span><input name="materialSpec" /></label>
        <label className="field"><span>Đơn vị vật tư</span><input name="materialUnit" required placeholder="viên / kg / m³" /></label>
        <label className="field"><span>Hao phí / 1 đơn vị công tác</span><input name="consumptionRate" type="number" min="0.000001" step="0.000001" required /></label>
        <label className="field"><span>Hao hụt (%)</span><input name="wastePercent" type="number" min="0" max="100" step="0.01" defaultValue="0" /></label>
        <label className="field"><span>Nguồn định mức</span><input name="sourceLabel" placeholder="Dự toán / BOQ / định mức nội bộ" /></label>
        <label className="field commercial-span-2"><span>Ghi chú</span><input name="note" /></label>
        <div className="commercial-form-actions"><button className="button primary" disabled={busy}>Lưu định mức</button></div>
      </form>
    </details> : null}

    <section className="panel takeoff-summary-panel">
      <div className="panel-head"><div><span className="eyebrow">SO SÁNH THIẾT KẾ / NHẬP THỰC TẾ</span><h2>Vật tư cần theo thiết kế và vật tư đã về dự án</h2></div></div>
      <div className="panel-body takeoff-table-wrap"><table className="takeoff-table"><thead><tr><th>Vật tư</th><th>Theo thiết kế</th><th>Đã nhập</th><th>Đạt</th><th>Còn thiếu / vượt</th><th>Trạng thái</th></tr></thead><tbody>{(data.materialSummary || []).map((item:any)=>{const status=item.over?"Vượt thiết kế":item.percent>=100?"Đủ theo thiết kế":item.percent>=90?"Sắp đủ":"Đang nhập";return <tr key={item.key} className={item.over?"is-over":item.near?"is-near":""}><td><strong>{item.materialName}</strong><small>{item.materialSpec || ""}</small></td><td>{fmt(item.required)} {item.unit}</td><td>{fmt(item.received)} {item.unit}</td><td><div className="takeoff-percent"><div><i style={{width:`${Math.min(100,Math.max(0,item.percent))}%`}}/></div><strong>{item.percent.toFixed(1)}%</strong></div></td><td>{item.remaining>=0?`${fmt(item.remaining)} ${item.unit} còn thiếu`:`Vượt ${fmt(Math.abs(item.remaining))} ${item.unit}`}</td><td>{item.over?<span className="takeoff-status danger"><TriangleAlert size={14}/> {status}</span>:<span className="takeoff-status"><CheckCircle2 size={14}/> {status}</span>}</td></tr>})}</tbody></table>{!data.materialSummary?.length?<div className="empty-state">Chưa có dữ liệu thiết kế để tổng hợp vật tư.</div>:null}</div>
    </section>

    <section className="panel takeoff-work-list"><div className="panel-head"><div><span className="eyebrow">ĐẦU VIỆC THIẾT KẾ</span><h2>Dữ liệu đã nhập một lần</h2></div></div><div className="panel-body">{(data.works || []).map((item:any)=><div className="takeoff-work-row" key={item.id}><span>{item.code}</span><div><strong>{item.title}</strong><small>{item.area_label || "Toàn dự án"}</small></div><b>{fmt(item.quantity)} {item.unit}</b></div>)}{!data.works?.length?<div className="empty-state">Chưa có đầu việc thiết kế.</div>:null}</div></section>

    {message ? <div className="operation-popup ok"><div className="operation-popup-icon"><CheckCircle2/></div><div className="operation-popup-copy"><strong>{message}</strong></div><button className="operation-popup-close" onClick={()=>setMessage("")}><X size={17}/></button></div> : null}
  </>;
}
