import { Calculator } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getMaterialTakeoffData } from "@/lib/material-takeoff";
import { MaterialTakeoffManager } from "@/components/material-takeoff-manager";

export const dynamic = "force-dynamic";

export default async function MaterialAnalysisPage() {
  const user = await requireUser();
  if (!["commander", "khkt", "director"].includes(user.role)) return <div className="panel empty-state">Tài khoản này không có quyền xem phân tích vật tư.</div>;
  const data = await getMaterialTakeoffData();
  return <div className="commercial-page material-takeoff-page">
    <section className="commercial-page-head"><div><span className="eyebrow">PHÂN TÍCH KHỐI LƯỢNG → VẬT TƯ</span><h1>Một nguồn dữ liệu thiết kế, tự tính nhu cầu vật tư</h1><p>Nhập khối lượng thiết kế một lần. Hệ thống nhân với định mức hao phí đã được duyệt để ra gạch, cát, xi măng, thép… rồi so sánh với số lượng thực tế nhập về dự án.</p></div><Calculator size={30}/></section>
    <section className="commercial-kpi-grid commercial-kpi-4"><article><span>Đầu việc thiết kế</span><strong>{data.totals.workItems}</strong><small>Nguồn dữ liệu nhập một lần</small></article><article><span>Dòng định mức</span><strong>{data.totals.normRows}</strong><small>Hao phí vật tư theo công tác</small></article><article><span>Nhóm vật tư</span><strong>{data.totals.materialTypes}</strong><small>Được tổng hợp tự động</small></article><article className={data.totals.warnings?"danger":""}><span>Cảnh báo</span><strong>{data.totals.warnings}</strong><small>Sắp đủ hoặc vượt thiết kế</small></article></section>
    <MaterialTakeoffManager user={user} data={data}/>
  </div>;
}
