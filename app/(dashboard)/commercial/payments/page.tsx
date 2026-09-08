import { Banknote, FileCheck2, HandCoins, Landmark, WalletCards } from "lucide-react";
import { requireCommercialUser } from "@/lib/auth";
import { getCommercialData } from "@/lib/commercial";
import { OwnerReceiptForm } from "@/components/owner-receipt-form";

export const dynamic = "force-dynamic";

function money(value: number) {
  return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(value || 0) + " ₫";
}
function date(value?: string | null) {
  if (!value) return "-";
  const parsed = value.includes("T") ? new Date(value) : new Date(`${value}T12:00:00+07:00`);
  return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Asia/Ho_Chi_Minh" }).format(parsed);
}

export default async function OwnerPaymentsPage() {
  const user = await requireCommercialUser();
  const data = await getCommercialData();
  const contract = data.ownerContract;
  const receipts = data.requests.filter((item: any) => item.request_type === "owner_receivable");
  const invoiceIssued = receipts.reduce((sum: number, item: any) => sum + Number(item.invoice_amount || 0), 0);
  const requested = receipts.reduce((sum: number, item: any) => sum + Number(item.amount_requested || 0), 0);
  const received = receipts.reduce((sum: number, item: any) => sum + Number(item.amount_paid || 0), 0);
  const contractValue = Number(contract?.after_tax_value || 0);
  const remaining = Math.max(0, contractValue - received);
  const receivePercent = contractValue > 0 ? (received / contractValue) * 100 : 0;

  return (
    <div className="commercial-page">
      <section className="commercial-page-head"><div><span className="eyebrow">THANH TOÁN CHỦ ĐẦU TƯ</span><h1>Theo dõi hợp đồng và dòng tiền về</h1><p>Kế hoạch thanh toán, hóa đơn, giá trị đề nghị, tiền đã thu và số còn lại của toàn dự án.</p></div><Landmark size={30}/></section>

      <section className="commercial-kpi-grid commercial-kpi-5">
        <article><WalletCards size={21}/><span>Giá trị hợp đồng</span><strong>{money(contractValue)}</strong><small>Sau thuế</small></article>
        <article><FileCheck2 size={21}/><span>Đã xuất hóa đơn</span><strong>{money(invoiceIssued)}</strong><small>{contractValue ? Math.round(invoiceIssued / contractValue * 100) : 0}% hợp đồng</small></article>
        <article><HandCoins size={21}/><span>Đã đề nghị thanh toán</span><strong>{money(requested)}</strong><small>Dữ liệu thực tế đã ghi nhận</small></article>
        <article><Banknote size={21}/><span>Tiền đã về</span><strong>{money(received)}</strong><small>{receivePercent.toFixed(1)}% giá trị hợp đồng</small></article>
        <article><WalletCards size={21}/><span>Còn phải thu</span><strong>{money(remaining)}</strong><small>{Math.max(0, 100 - receivePercent).toFixed(1)}% còn lại</small></article>
      </section>

      <section className="panel">
        <div className="panel-head"><div><span className="eyebrow">KẾ HOẠCH</span><h2>Kế hoạch thanh toán theo tháng</h2></div></div>
        <div className="commercial-table-wrap"><table className="commercial-table commercial-payment-table"><thead><tr><th>STT</th><th>Kỳ</th><th>Ngày dự kiến</th><th>Giá trị thanh toán dự kiến</th><th>Giá trị hóa đơn dự kiến</th><th>Ghi chú</th></tr></thead><tbody>{data.schedule.map((item: any, index: number) => <tr key={item.id}><td>{index + 1}</td><td><strong>{item.period_label}</strong></td><td>{date(item.planned_date)}</td><td>{money(Number(item.planned_amount))}</td><td>{money(Number(item.invoice_planned_amount))}</td><td>{item.note || ""}</td></tr>)}</tbody></table></div>
      </section>

      <section className="panel">
        <div className="panel-head"><div><span className="eyebrow">THỰC TẾ</span><h2>Lịch sử hóa đơn và tiền về</h2></div></div>
        <div className="commercial-table-wrap"><table className="commercial-table"><thead><tr><th>Ngày</th><th>Mã</th><th>Nội dung</th><th>Xuất hóa đơn</th><th>Đề nghị</th><th>Đã thu</th></tr></thead><tbody>{receipts.map((item: any) => <tr key={item.id}><td>{date(item.finance_paid_at || item.submitted_at)}</td><td><strong>{item.request_code}</strong></td><td>{item.description}</td><td>{money(Number(item.invoice_amount))}</td><td>{money(Number(item.amount_requested))}</td><td><strong>{money(Number(item.amount_paid))}</strong></td></tr>)}{!receipts.length ? <tr><td colSpan={6} className="commercial-empty-cell">Chưa có dữ liệu thu tiền thực tế.</td></tr> : null}</tbody></table></div>
      </section>

      {contract && ["commander", "finance"].includes(user.role) ? <OwnerReceiptForm contractId={contract.id}/> : null}
    </div>
  );
}