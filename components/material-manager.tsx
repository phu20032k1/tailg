"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, LoaderCircle, PackagePlus, Plus, X } from "lucide-react";
import type { SessionUser } from "@/lib/types";

export function MaterialManager({ user, materials }: { user: SessionUser; materials: any[] }) {
  const router = useRouter();
  const [openId, setOpenId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const canEdit = ["commander", "khkt"].includes(user.role);

  async function addBudget(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage("");
    const f = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/commercial/materials", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ materialName: f.get("materialName"), unit: f.get("unit"), budgetQuantity: f.get("budgetQuantity"), areaLabel: f.get("areaLabel"), contractorName: f.get("contractorName"), note: f.get("note") }) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error || "Không lưu được định mức.");
      event.currentTarget.reset(); setMessage("Đã lưu định mức vật tư"); router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Không lưu được định mức."); } finally { setBusy(false); }
  }

  async function addReceipt(event: FormEvent<HTMLFormElement>, id: string) {
    event.preventDefault(); setBusy(true); setMessage("");
    const f = new FormData(event.currentTarget);
    try {
      const response = await fetch(`/api/commercial/materials/${id}/receipt`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ receiptDate: f.get("receiptDate"), supplier: f.get("supplier"), invoiceNo: f.get("invoiceNo"), quantity: f.get("quantity"), unitPrice: f.get("unitPrice"), batchLabel: f.get("batchLabel"), note: f.get("note") }) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error || "Không lưu được lần nhập.");
      event.currentTarget.reset(); setOpenId(null); setMessage(`Đã ghi nhận lần nhập. Còn ${Number(result.remaining).toLocaleString("vi-VN")} theo định mức.`); router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Không lưu được lần nhập."); } finally { setBusy(false); }
  }

  return <>
    {canEdit ? <form className="panel commercial-form" onSubmit={addBudget}>
      <div className="panel-head"><div><span className="eyebrow">ĐỊNH MỨC ĐƯỢC DUYỆT</span><h2>Thêm / cập nhật vật tư</h2></div><PackagePlus size={20}/></div>
      <div className="panel-body commercial-form-grid material-budget-form">
        <label className="field"><span>Vật tư</span><input name="materialName" required placeholder="VD: Thép tròn" /></label>
        <label className="field"><span>Đơn vị</span><input name="unit" required placeholder="kg / tấn / m3..." /></label>
        <label className="field"><span>Định mức ban đầu</span><input name="budgetQuantity" type="number" min="0" step="0.001" required /></label>
        <label className="field"><span>Hạng mục</span><input name="areaLabel" defaultValue="Toàn dự án" /></label>
        <label className="field"><span>Đơn vị / nhà thầu</span><input name="contractorName" placeholder="Để trống nếu áp dụng toàn dự án" /></label>
        <label className="field"><span>Ghi chú</span><input name="note" /></label>
        <div className="commercial-form-actions"><button className="button primary" type="submit" disabled={busy}>{busy ? <><LoaderCircle className="route-loading-spinner" size={17}/> Đang lưu...</> : "Lưu định mức"}</button></div>
      </div>
    </form> : null}

    <section className="material-grid">
      {materials.map((item) => {
        const level = item.overBudget || item.percent >= 100 ? "stop" : item.percent >= 90 ? "warning" : "normal";
        return <article className={`material-card ${level}`} key={item.id}>
          <div className="material-card-head"><div><span>{item.area_label || "Toàn dự án"}</span><h3>{item.material_name}</h3><small>{item.contractor_name || "Áp dụng toàn dự án"}</small></div>{level !== "normal" ? <AlertTriangle size={21}/> : <CheckCircle2 size={20}/>}</div>
          <div className="material-numbers"><div><span>Định mức</span><strong>{Number(item.budget_quantity).toLocaleString("vi-VN")}</strong><small>{item.unit}</small></div><div><span>Đã nhập</span><strong>{Number(item.received).toLocaleString("vi-VN")}</strong><small>{item.unit}</small></div><div><span>Còn lại</span><strong>{Number(item.remaining).toLocaleString("vi-VN")}</strong><small>{item.unit}</small></div></div>
          <div className="material-progress-row"><div className="progress-track large"><i style={{ width: `${Math.min(100, Math.max(0, Number(item.percent || 0)))}%` }}/></div><b>{Math.round(item.percent || 0)}%</b></div>
          {level === "stop" ? <div className="material-stop"><strong>DỪNG NHẬP</strong><span>Đã chạm hoặc vượt định mức ban đầu.</span></div> : level === "warning" ? <div className="material-warning"><strong>Sắp chạm định mức</strong><span>Cần kiểm tra trước lần nhập tiếp theo.</span></div> : null}
          <div className="material-receipt-list"><strong>Các lần nhập ({item.receipts?.length || 0})</strong>{(item.receipts || []).slice(-4).reverse().map((r: any) => <div key={r.id}><span>{r.receipt_date} · {r.source_scope || "Lần nhập"}</span><b>+{Number(r.quantity).toLocaleString("vi-VN")} {item.unit}</b></div>)}</div>
          {canEdit && level !== "stop" ? <button className="button secondary material-add-button" onClick={() => setOpenId(openId === item.id ? null : item.id)}><Plus size={16}/> Ghi nhận lần nhập</button> : null}
          {openId === item.id ? <form className="material-receipt-form" onSubmit={(event) => addReceipt(event, item.id)}>
            <label><span>Ngày nhập</span><input name="receiptDate" type="date" required /></label><label><span>Lần nhập</span><input name="batchLabel" placeholder="Lần 1 / Lần 2..." /></label><label><span>Khối lượng</span><input name="quantity" type="number" min="0.001" step="0.001" required /></label><label><span>Đơn giá</span><input name="unitPrice" type="number" min="0" step="1" defaultValue="0" /></label><label><span>Nhà cung cấp</span><input name="supplier" /></label><label><span>Số hóa đơn</span><input name="invoiceNo" /></label><label className="span-2"><span>Ghi chú</span><input name="note" /></label><button className="button primary" type="submit" disabled={busy}>Xác nhận nhập</button>
          </form> : null}
        </article>;
      })}
    </section>

    {message ? <div className={`operation-popup ${message.includes("DỪNG") || message.includes("vượt") ? "error" : "ok"}`}><div className="operation-popup-icon">{message.includes("DỪNG") || message.includes("vượt") ? <AlertTriangle/> : <CheckCircle2/>}</div><div className="operation-popup-copy"><strong>{message}</strong></div><button className="operation-popup-close" onClick={() => setMessage("")}><X size={17}/></button></div> : null}
  </>;
}