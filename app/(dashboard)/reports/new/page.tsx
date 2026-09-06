import { ClipboardPlus } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getFormMeta } from "@/lib/data";
import { ReportForm } from "@/components/report-form";

export default async function NewReportPage() {
  const user = await requireUser();
  const meta = await getFormMeta(user);

  return (
    <>
      <section className="page-title-row">
        <div><span className="eyebrow">NHẬT KÝ THI CÔNG</span><h1>Nhập báo cáo hằng ngày</h1><p>Giai đoạn 1 chỉ tập trung nhân lực + công việc móng + tên móng + % + ảnh.</p></div>
        <div className="page-title-icon"><ClipboardPlus size={25} /></div>
      </section>
      <div className="panel"><div className="panel-body"><ReportForm user={user} zones={meta.zones} leaders={meta.leaders} /></div></div>
    </>
  );
}
