import { ClipboardCheck } from "lucide-react";
import { requireCommercialUser } from "@/lib/auth";
import { getCommercialData } from "@/lib/commercial";
import { PaymentWorkflow } from "@/components/payment-workflow";

export const dynamic = "force-dynamic";

export default async function SubcontractorPaymentsPage() {
  const user = await requireCommercialUser();
  const data = await getCommercialData();
  return (
    <div className="commercial-page">
      <section className="commercial-page-head"><div><span className="eyebrow">THANH TOÁN NHÀ THẦU PHỤ</span><h1>Phê duyệt hồ sơ thanh toán Online</h1><p>Ban điều hành khởi tạo hồ sơ, Phòng KTKT kiểm tra, Ban Giám đốc duyệt và Phòng Tài chính - Kế toán xác nhận thanh toán.</p></div><ClipboardCheck size={30}/></section>
      <PaymentWorkflow user={user} contracts={data.contracts as any} requests={data.requests as any}/>
    </div>
  );
}