"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, ChevronUp, Clock3, FileUp, LoaderCircle, RotateCcw, Send, WalletCards, X } from "lucide-react";
import type { SessionUser } from "@/lib/types";
import { PAYMENT_STATUS_LABELS } from "@/lib/commercial-shared";

type Contract = { id: string; contract_no: string | null; counterparty: string; scope: string | null; after_tax_value: number };
type RequestRow = any;

function money(value: number) { return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(value || 0) + " ₫"; }
function dateTime(value?: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Ho_Chi_Minh" }).format(new Date(value));
}
function elapsed(from?: string | null, to?: string | null) {
  if (!from || !to) return "";
  const ms = new Date(to).getTime() - new Date(from).getTime();
  if (ms < 0) return "";
  const hours = ms / 3600000;
  if (hours < 24) return `${Math.max(1, Math.round(hours))} giờ`;
  return `${Math.round(hours / 24)} ngày`;
}

export function PaymentWorkflow({ user, contracts, requests }: { user: SessionUser; contracts: Contract[]; requests: RequestRow[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(requests[0]?.id || null);
  const [notice, setNotice] = useState("");
  const [returnNotes, setReturnNotes] = useState<Record<string, string>>({});
  const subcontractContracts = useMemo(() => contracts.filter((item: any) => item.contract_kind === "subcontract"), [contracts]);

  async function createRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusyId("new");
    const form = new FormData(event.currentTarget);
    const contractId = String(form.get("contractId") || "");
    const contract = subcontractContracts.find((item) => item.id === contractId);
    try {
      const response = await fetch("/api/commercial/requests", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          contractId: contractId || null,
          contractorName: contract?.counterparty || String(form.get("contractorName") || ""),
          description: form.get("description"),
          invoiceAmount: form.get("invoiceAmount"),
          amountRequested: form.get("amountRequested")
        })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Không tạo được hồ sơ.");
      event.currentTarget.reset();
      setNotice(`Đã tạo hồ sơ ${result.request.request_code}`);
      router.refresh();
    } catch (error) { setNotice(error instanceof Error ? error.message : "Không tạo được hồ sơ."); }
    finally { setBusyId(null); }
  }

  async function action(id: string, actionName: string, amountPaid?: number) {
    setBusyId(id + actionName);
    try {
      const note = returnNotes[id] || "";
      const response = await fetch(`/api/commercial/requests/${id}/action`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: actionName, note, amountPaid })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Không cập nhật được hồ sơ.");
      setNotice(actionName === "return" ? "Đã trả hồ sơ về Ban điều hành" : "Đã cập nhật trạng thái hồ sơ");
      setReturnNotes((prev) => ({ ...prev, [id]: "" }));
      router.refresh();
    } catch (error) { setNotice(error instanceof Error ? error.message : "Không cập nhật được hồ sơ."); }
    finally { setBusyId(null); }
  }

  async function uploadDocument(id: string, file: File | null) {
    if (!file) return;
    setBusyId(id + "upload");
    try {
      const form = new FormData(); form.set("file", file);
      const response = await fetch(`/api/commercial/requests/${id}/documents`, { method: "POST", body: form });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Không tải được hồ sơ.");
      setNotice("Đã tải hồ sơ đính kèm");
      router.refresh();
    } catch (error) { setNotice(error instanceof Error ? error.message : "Không tải được hồ sơ."); }
    finally { setBusyId(null); }
  }

  function actionButtons(row: RequestRow) {
    if (user.role === "commander" && ["draft", "returned"].includes(row.status)) {
      return <><button className="button primary" onClick={() => action(row.id, "submit")} disabled={Boolean(busyId)}><Send size={16}/> Gửi Phòng KTKT</button><button className="button secondary" onClick={() => action(row.id, "cancel")} disabled={Boolean(busyId)}>Hủy hồ sơ</button></>;
    }
    if (user.role === "khkt" && row.status === "khkt_review") {
      return <><button className="button primary" onClick={() => action(row.id, "khkt_approve")} disabled={Boolean(busyId)}><Check size={16}/> Hồ sơ OK · Chuyển Giám đốc</button><button className="button danger-button" onClick={() => action(row.id, "return")} disabled={!returnNotes[row.id] || Boolean(busyId)}><RotateCcw size={16}/> Trả lại Ban</button></>;
    }
    if (user.role === "director" && row.status === "director_review") {
      return <><button className="button primary" onClick={() => action(row.id, "director_approve")} disabled={Boolean(busyId)}><Check size={16}/> Duyệt · Chuyển Tài chính</button><button className="button danger-button" onClick={() => action(row.id, "return")} disabled={!returnNotes[row.id] || Boolean(busyId)}><RotateCcw size={16}/> Trả lại</button></>;
    }
    if (user.role === "finance" && row.status === "finance_payment") {
      return <><button className="button primary" onClick={() => action(row.id, "mark_paid", Number(row.amount_requested || 0))} disabled={Boolean(busyId)}><WalletCards size={16}/> Xác nhận đã thanh toán</button><button className="button danger-button" onClick={() => action(row.id, "return")} disabled={!returnNotes[row.id] || Boolean(busyId)}><RotateCcw size={16}/> Trả lại</button></>;
    }
    return null;
  }

  return <>
    {user.role === "commander" ? <form className="panel commercial-form commercial-request-create" onSubmit={createRequest}>
      <div className="panel-head"><div><span className="eyebrow">BAN ĐIỀU HÀNH KHỞI TẠO</span><h2>Đề nghị thanh toán nhà thầu phụ</h2></div></div>
      <div className="panel-body commercial-form-grid">
        <label className="field commercial-span-2"><span>Hợp đồng / nhà thầu</span><select name="contractId" defaultValue=""><option value="">Chọn hợp đồng</option>{subcontractContracts.map((item) => <option key={item.id} value={item.id}>{item.counterparty} · {item.scope || item.contract_no}</option>)}</select></label>
        <label className="field commercial-span-2"><span>Nội dung đề nghị</span><input name="description" placeholder="VD: Tạm ứng / Thanh toán giá trị thi công đợt 1" required /></label>
        <label className="field"><span>Giá trị hóa đơn (sau VAT)</span><input name="invoiceAmount" type="number" min="0" step="1" defaultValue="0" /></label>
        <label className="field"><span>Giá trị đề nghị thanh toán</span><input name="amountRequested" type="number" min="1" step="1" required /></label>
        <div className="commercial-form-actions"><button className="button primary" type="submit" disabled={busyId === "new"}>{busyId === "new" ? <><LoaderCircle className="route-loading-spinner" size={17}/> Đang tạo...</> : "Tạo hồ sơ"}</button></div>
      </div>
    </form> : null}

    <div className="payment-workflow-list">
      {requests.filter((row) => row.request_type === "subcontractor").map((row) => {
        const open = openId === row.id;
        const needsReturnNote = (user.role === "khkt" && row.status === "khkt_review") || (user.role === "director" && row.status === "director_review") || (user.role === "finance" && row.status === "finance_payment");
        return <article className={`payment-workflow-card status-${row.status}`} key={row.id}>
          <button className="payment-workflow-summary" type="button" onClick={() => setOpenId(open ? null : row.id)}>
            <div className="payment-code"><span>{row.request_code}</span><strong>{row.contractor_name || row.commercial_contracts?.counterparty || "Nhà thầu phụ"}</strong><small>{row.description}</small></div>
            <div className="payment-amount"><strong>{money(Number(row.amount_requested || 0))}</strong><span>{PAYMENT_STATUS_LABELS[row.status] || row.status}</span></div>
            {open ? <ChevronUp/> : <ChevronDown/>}
          </button>
          {open ? <div className="payment-workflow-detail">
            <div className="payment-timeline">
              <div className={row.submitted_at ? "done" : ""}><i>1</i><div><strong>Ban điều hành gửi</strong><span>{dateTime(row.submitted_at)}</span></div></div>
              <div className={row.khkt_reviewed_at ? "done" : row.status === "khkt_review" ? "active" : ""}><i>2</i><div><strong>Phòng KTKT kiểm tra</strong><span>{dateTime(row.khkt_reviewed_at)} {elapsed(row.submitted_at,row.khkt_reviewed_at) ? `· ${elapsed(row.submitted_at,row.khkt_reviewed_at)}` : ""}</span></div></div>
              <div className={row.director_approved_at ? "done" : row.status === "director_review" ? "active" : ""}><i>3</i><div><strong>Ban Giám đốc duyệt</strong><span>{dateTime(row.director_approved_at)} {elapsed(row.khkt_reviewed_at,row.director_approved_at) ? `· ${elapsed(row.khkt_reviewed_at,row.director_approved_at)}` : ""}</span></div></div>
              <div className={row.finance_paid_at ? "done" : row.status === "finance_payment" ? "active" : ""}><i>4</i><div><strong>Tài chính thanh toán</strong><span>{dateTime(row.finance_paid_at)} {elapsed(row.director_approved_at,row.finance_paid_at) ? `· ${elapsed(row.director_approved_at,row.finance_paid_at)}` : ""}</span></div></div>
            </div>
            <div className="payment-detail-grid"><div><span>Giá trị hóa đơn</span><strong>{money(Number(row.invoice_amount || 0))}</strong></div><div><span>Đề nghị thanh toán</span><strong>{money(Number(row.amount_requested || 0))}</strong></div><div><span>Đã thanh toán</span><strong>{money(Number(row.amount_paid || 0))}</strong></div><div><span>Hợp đồng</span><strong>{row.commercial_contracts?.contract_no || "-"}</strong></div></div>
            {row.returned_reason ? <div className="payment-return-note"><RotateCcw size={16}/><div><strong>Lý do trả lại</strong><p>{row.returned_reason}</p></div></div> : null}
            <section className="payment-documents"><div className="payment-subhead"><strong>Hồ sơ đính kèm</strong><label className="payment-upload-button"><FileUp size={16}/><span>{busyId === row.id + "upload" ? "Đang tải..." : "Thêm file"}</span><input type="file" accept=".pdf,.xlsx,.xls,.docx,.jpg,.jpeg,.png,.webp" onChange={(event) => uploadDocument(row.id, event.target.files?.[0] || null)} disabled={Boolean(busyId)} /></label></div><div className="payment-document-list">{(row.documents || []).map((doc: any) => <a key={doc.id} href={doc.signedUrl || "#"} target="_blank" rel="noreferrer"><FileUp size={15}/><span>{doc.file_name}</span></a>)}{!row.documents?.length ? <small>Chưa có file hồ sơ.</small> : null}</div></section>
            {needsReturnNote ? <label className="field payment-return-field"><span>Ý kiến / lý do nếu trả lại</span><textarea value={returnNotes[row.id] || ""} onChange={(event) => setReturnNotes((prev) => ({ ...prev, [row.id]: event.target.value }))} placeholder="Ghi rõ nội dung cần bổ sung hoặc lý do không duyệt..." /></label> : null}
            <div className="payment-actions">{actionButtons(row)}{busyId?.startsWith(row.id) ? <span className="payment-busy"><Clock3 size={15}/> Đang xử lý...</span> : null}</div>
            {row.events?.length ? <details className="payment-history"><summary>Lịch sử xử lý ({row.events.length})</summary>{row.events.map((event: any) => <div key={event.id}><span>{dateTime(event.created_at)}</span><strong>{event.actor_name || "Hệ thống"}</strong><p>{event.note || event.action}</p></div>)}</details> : null}
          </div> : null}
        </article>;
      })}
      {!requests.filter((row) => row.request_type === "subcontractor").length ? <div className="panel commercial-empty-card">Chưa có hồ sơ thanh toán nhà thầu phụ.</div> : null}
    </div>

    {notice ? <div className="operation-popup ok"><div className="operation-popup-icon"><Check/></div><div className="operation-popup-copy"><strong>{notice}</strong></div><button className="operation-popup-close" onClick={() => setNotice("")}><X size={17}/></button></div> : null}
  </>;
}