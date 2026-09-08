import Link from "next/link";
import { AlertTriangle, ArrowRight, BadgeDollarSign, Building2, ClipboardCheck, PackageCheck, ReceiptText, WalletCards } from "lucide-react";
import { requireCommercialUser } from "@/lib/auth";
import { getCommercialData, PAYMENT_STATUS_LABELS } from "@/lib/commercial";

export const dynamic = "force-dynamic";

function money(value: number) {
  return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(value || 0) + " ₫";
}

function shortDate(value?: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(`${value}T12:00:00+07:00`));
}

export default async function CommercialDashboardPage() {
  const user = await requireCommercialUser();
  const data = await getCommercialData();
  const upcoming = data.schedule.filter((item: any) => Number(item.planned_amount || 0) > 0).slice(0, 6);
  const warnings = data.materials.filter((item: any) => item.overBudget || item.percent >= 90).slice(0, 6);

  return (
    <div className="commercial-page">
      <section className="commercial-hero">
        <div><span className="eyebrow">QUẢN LÝ KINH TẾ · KỸ THUẬT · TÀI CHÍNH</span><h1>Tổng quan dự án TAILG</h1><p>Theo dõi thanh toán, thầu phụ, vật tư, chi phí và tiến độ chi tiết trên cùng một nguồn dữ liệu.</p></div>
        <div className="commercial-role-box"><span>Đang truy cập với quyền</span><strong>{user.fullName}</strong></div>
      </section>

      <section className="commercial-kpi-grid">
        <article><Building2 size={21}/><span>Giá trị hợp đồng CĐT</span><strong>{money(data.summary.ownerContractValue)}</strong><small>Theo kế hoạch thanh toán đã nhập</small></article>
        <article><ReceiptText size={21}/><span>Hồ sơ đang xử lý</span><strong>{data.summary.activeRequests}</strong><small>{money(data.summary.pendingPayment)} đang chờ xử lý</small></article>
        <article><BadgeDollarSign size={21}/><span>Đã thanh toán thầu phụ</span><strong>{money(data.summary.totalPaid)}</strong><small>Các hồ sơ đã xác nhận thanh toán</small></article>
        <article className={data.summary.materialWarnings ? "warning" : ""}><PackageCheck size={21}/><span>Cảnh báo vật tư</span><strong>{data.summary.materialWarnings}</strong><small>Đạt từ 90% định mức hoặc vượt mức</small></article>
      </section>

      <section className="commercial-link-grid">
        <Link href="/commercial/payments"><WalletCards/><div><strong>Thanh toán chủ đầu tư</strong><span>Kế hoạch thu tiền, xuất hóa đơn và số còn lại.</span></div><ArrowRight/></Link>
        <Link href="/commercial/subcontractors"><ClipboardCheck/><div><strong>Thanh toán nhà thầu phụ</strong><span>Ban điều hành → KTKT → Ban Giám đốc → Tài chính.</span></div><ArrowRight/></Link>
        <Link href="/commercial/materials"><PackageCheck/><div><strong>Quản lý vật tư</strong><span>Định mức, các lần nhập, số còn lại và cảnh báo dừng.</span></div><ArrowRight/></Link>
        <Link href="/commercial/costs"><BadgeDollarSign/><div><strong>Theo dõi chi phí</strong><span>Ban điều hành, từng đội và từng nhà thầu phụ.</span></div><ArrowRight/></Link>
      </section>

      <section className="commercial-two-col">
        <article className="panel">
          <div className="panel-head"><div><span className="eyebrow">CHỦ ĐẦU TƯ</span><h2>Kế hoạch thanh toán</h2></div><Link className="text-link" href="/commercial/payments">Xem đầy đủ <ArrowRight size={14}/></Link></div>
          <div className="commercial-table-wrap"><table className="commercial-table"><thead><tr><th>Kỳ</th><th>Ngày dự kiến</th><th>Giá trị thanh toán</th><th>Giá trị hóa đơn dự kiến</th></tr></thead><tbody>{upcoming.map((item: any) => <tr key={item.id}><td><strong>{item.period_label}</strong></td><td>{shortDate(item.planned_date)}</td><td>{money(Number(item.planned_amount))}</td><td>{money(Number(item.invoice_planned_amount))}</td></tr>)}</tbody></table></div>
        </article>

        <article className="panel">
          <div className="panel-head"><div><span className="eyebrow">THẦU PHỤ</span><h2>Hồ sơ gần đây</h2></div><Link className="text-link" href="/commercial/subcontractors">Mở luồng duyệt <ArrowRight size={14}/></Link></div>
          <div className="commercial-request-mini-list">{data.requests.slice(0, 6).map((item: any) => <div key={item.id}><div><strong>{item.request_code}</strong><span>{item.contractor_name || item.commercial_contracts?.counterparty || "Hồ sơ thanh toán"}</span></div><div><b>{money(Number(item.amount_requested))}</b><small>{PAYMENT_STATUS_LABELS[item.status] || item.status}</small></div></div>)}{!data.requests.length ? <p className="commercial-empty">Chưa có hồ sơ thanh toán thầu phụ.</p> : null}</div>
        </article>
      </section>

      <section className="panel">
        <div className="panel-head"><div><span className="eyebrow">VẬT TƯ</span><h2>Vật tư cần chú ý</h2></div><Link className="text-link" href="/commercial/materials">Xem định mức <ArrowRight size={14}/></Link></div>
        <div className="commercial-warning-grid">{warnings.map((item: any) => <div className={item.overBudget ? "danger" : "warning"} key={item.id}><AlertTriangle size={18}/><div><strong>{item.material_name}</strong><span>{item.received.toLocaleString("vi-VN")} / {Number(item.budget_quantity).toLocaleString("vi-VN")} {item.unit}</span></div><b>{Math.round(item.percent)}%</b></div>)}{!warnings.length ? <p className="commercial-empty">Chưa có vật tư nào chạm ngưỡng cảnh báo.</p> : null}</div>
      </section>
    </div>
  );
}