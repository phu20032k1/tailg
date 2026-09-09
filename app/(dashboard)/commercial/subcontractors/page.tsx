import { ClipboardCheck } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getCommercialData } from "@/lib/commercial";
import { PaymentWorkflow } from "@/components/payment-workflow";
import { SubcontractorCompanyDashboard } from "@/components/subcontractor-company-dashboard";

export const dynamic = "force-dynamic";

export default async function SubcontractorPaymentsPage() {
  const user = await requireUser();
  if (!["commander","leader","khkt","director","finance"].includes(user.role)) {
    return <div className="panel empty-state">Tài khoản này không có quyền theo dõi thanh toán nhà thầu phụ.</div>;
  }
  const data = await getCommercialData();
  return (
    <div className="commercial-page">
      <section className="commercial-page-head"><div><span className="eyebrow">THANH TOÁN NHÀ THẦU PHỤ</span><h1>Khối lượng · hồ sơ · phê duyệt · thanh toán</h1><p>Theo dõi riêng từng hợp đồng và tổng hợp theo công ty: giá trị hợp đồng, nghiệm thu, thanh toán, BOQ/ngân sách và hiệu quả hạng mục.</p></div><ClipboardCheck size={30}/></section>
      {user.role !== "leader" ? <SubcontractorCompanyDashboard user={user} companies={data.subcontractCompanies as any[]} summary={data.subcontractSummary as any}/> : null}
      <PaymentWorkflow user={user} contracts={data.contracts as any} requests={data.requests as any} packages={data.packages as any}/>
    </div>
  );
}
