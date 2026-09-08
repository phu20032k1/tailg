"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, LoaderCircle, X } from "lucide-react";

export function OwnerReceiptForm({ contractId }: { contractId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/commercial/owner-receipts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          contractId,
          description: form.get("description"),
          invoiceAmount: form.get("invoiceAmount"),
          amountRequested: form.get("amountRequested"),
          amountReceived: form.get("amountReceived"),
          receivedDate: form.get("receivedDate")
        })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Không lưu được dữ liệu.");
      event.currentTarget.reset();
      setMessage("Đã cập nhật thanh toán chủ đầu tư");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không lưu được dữ liệu.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <form className="commercial-form panel" onSubmit={submit}>
        <div className="panel-head"><div><span className="eyebrow">CẬP NHẬT THỰC TẾ</span><h2>Ghi nhận hóa đơn / tiền về</h2></div></div>
        <div className="panel-body commercial-form-grid">
          <label className="field"><span>Ngày ghi nhận</span><input name="receivedDate" type="date" required /></label>
          <label className="field commercial-span-2"><span>Nội dung</span><input name="description" placeholder="VD: Thu tiền tạm ứng đợt 1" required /></label>
          <label className="field"><span>Giá trị xuất hóa đơn</span><input name="invoiceAmount" type="number" min="0" step="1" defaultValue="0" /></label>
          <label className="field"><span>Giá trị đề nghị thanh toán</span><input name="amountRequested" type="number" min="0" step="1" defaultValue="0" /></label>
          <label className="field"><span>Tiền thực tế đã về</span><input name="amountReceived" type="number" min="0" step="1" defaultValue="0" /></label>
          <div className="commercial-form-actions"><button className="button primary" type="submit" disabled={busy}>{busy ? <><LoaderCircle className="route-loading-spinner" size={17}/> Đang lưu...</> : "Lưu cập nhật"}</button></div>
        </div>
      </form>
      {message ? <div className="operation-popup ok"><div className="operation-popup-icon"><CheckCircle2/></div><div className="operation-popup-copy"><strong>{message}</strong></div><button className="operation-popup-close" onClick={() => setMessage("")}><X size={17}/></button></div> : null}
    </>
  );
}