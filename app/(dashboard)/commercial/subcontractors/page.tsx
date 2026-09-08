import { ClipboardCheck } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getCommercialData } from "@/lib/commercial";
import { PaymentWorkflow } from "@/components/payment-workflow";

export const dynamic = "force-dynamic";

export default async function SubcontractorPaymentsPage() {
  const user = await requireUser();
  if (!["commander","leader","khkt","director","finance"].includes(user.role)) {
    return <div className="panel empty-state">Tài khoản này không có quyền theo dõi thanh toán nhà thầu phụ.</div>;
  }
  const data = await getCommercialData();
  return (
    <div className="commercial-page">
      <section className="commercial-page-head"><div><span className="eyebrow">THANH TOÁN NHÀ THẦU PHỤ</span><h1>Khối lượng · hồ sơ · phê duyệt · thanh toán</h1><p>Kiểm soát khối lượng theo đầu việc trước khi thanh toán; Ban điều hành khởi tạo, Phòng KTKT kiểm tra, Ban Giám đốc duyệt và Phòng Tài chính - Kế toán xác nhận thanh toán.</p></div><ClipboardCheck size={30}/></section>
      <PaymentWorkflow user={user} contracts={data.contracts as any} requests={data.requests as any} packages={data.packages as any}/>
    </div>
  );
}
