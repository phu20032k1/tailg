import { redirect } from "next/navigation";
import { ClipboardPlus } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getFormMeta } from "@/lib/data";
import { DailyReportForm } from "@/components/daily-report-form";

export default async function NewReportPage() {
  const user = await requireUser();
  if (user.role !== "leader") redirect("/");

  const meta = await getFormMeta(user);
  const leaders = meta.leaders
    .filter((item) => item.role === "leader")
    .map((item) => ({ ...item, role: "leader" as const }));

  return (
    <>
      <section className="page-title-row">
        <div>
          <span className="eyebrow">BÁO CÁO HẰNG NGÀY</span>
          <h1>Báo cáo thi công</h1>
          <p>Có thể chọn ngày hiện tại hoặc ngày trước đây, nhập công việc, nhân lực, thời tiết và ảnh hiện trường.</p>
        </div>
        <div className="page-title-icon"><ClipboardPlus size={25} /></div>
      </section>
      <div className="panel"><div className="panel-body"><DailyReportForm user={user} leaders={leaders} foundations={meta.foundations} /></div></div>
    </>
  );
}
