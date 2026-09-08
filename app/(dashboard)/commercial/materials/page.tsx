import { PackageCheck } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getMaterialManagementData } from "@/lib/materials";
import { MaterialManager } from "@/components/material-manager";

export const dynamic = "force-dynamic";

export default async function MaterialsPage() {
  const user = await requireUser();
  if (!["commander","leader","khkt","director"].includes(user.role)) {
    return <div className="panel empty-state">Tài khoản này không có quyền theo dõi vật tư.</div>;
  }
  const data = await getMaterialManagementData(user);
  return <div className="commercial-page material-workflow-page">
    <section className="commercial-page-head"><div><span className="eyebrow">QUẢN LÝ VẬT TƯ</span><h1>Định mức · đề nghị · phê duyệt · nhập thực tế</h1><p>Quản lý từ tổng dự án → hạng mục → từng đội. Đội gửi nhu cầu, Ban điều hành xác nhận, Phòng KTKT kiểm tra rồi mới ghi nhận nhập thực tế.</p></div><PackageCheck size={30}/></section>
    <section className="commercial-kpi-grid commercial-kpi-4">
      <article><span>Định mức đội</span><strong>{data.summary.budgets}</strong><small>Khoản đã phân bổ cho 6 đội</small></article>
      <article className={data.summary.pending ? "warning" : ""}><span>Đang chờ xử lý</span><strong>{data.summary.pending}</strong><small>Ban điều hành / Phòng KTKT</small></article>
      <article><span>Đã được duyệt</span><strong>{data.summary.approved}</strong><small>Chờ nhập hoặc đã hoàn tất</small></article>
      <article className={data.summary.warnings ? "danger" : ""}><span>Cảnh báo định mức</span><strong>{data.summary.warnings}</strong><small>Sắp chạm / vượt phân bổ</small></article>
    </section>
    <MaterialManager user={user} materials={data.materials as any} requests={data.materialRequests as any} leaders={data.leaders as any}/>
  </div>;
}
