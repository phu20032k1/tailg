import { ClipboardPlus } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getFormMeta } from "@/lib/data";
import { DailyReportForm } from "@/components/daily-report-form";

export default async function NewReportPage() {
  const user = await requireUser();
  const meta = await getFormMeta(user);

  return (
    <>
      <section className="page-title-row">
        <div>
          <span className="eyebrow">BÁO CÁO TRƯỚC 07:30</span>
          <h1>Báo cáo thi công hằng ngày</h1>
          <p>Dán tin nhắn nhóm dự án → rà lại nhân lực, máy móc, công việc → tải ảnh đại diện → lưu một lần.</p>
        </div>
        <div className="page-title-icon"><ClipboardPlus size={25} /></div>
      </section>
      <div className="panel"><div className="panel-body"><DailyReportForm user={user} leaders={meta.leaders} /></div></div>
    </>
  );
}
