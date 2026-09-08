import { PackageCheck } from "lucide-react";
import { requireCommercialUser } from "@/lib/auth";
import { getCommercialData } from "@/lib/commercial";
import { MaterialManager } from "@/components/material-manager";

export const dynamic = "force-dynamic";

export default async function MaterialsPage() {
  const user = await requireCommercialUser();
  const data = await getCommercialData();
  const total = data.materials.length;
  const warning = data.materials.filter((item: any) => item.percent >= 90 && !item.overBudget).length;
  const stop = data.materials.filter((item: any) => item.overBudget || item.percent >= 100).length;

  return <div className="commercial-page">
    <section className="commercial-page-head"><div><span className="eyebrow">QUẢN LÝ VẬT TƯ</span><h1>Định mức và khối lượng nhập</h1><p>Theo dõi từng vật tư theo định mức ban đầu, các lần nhập và tự dừng khi vượt khối lượng được duyệt.</p></div><PackageCheck size={30}/></section>
    <section className="commercial-kpi-grid commercial-kpi-3"><article><span>Danh mục vật tư</span><strong>{total}</strong><small>Đang theo dõi</small></article><article className={warning ? "warning" : ""}><span>Sắp chạm định mức</span><strong>{warning}</strong><small>Từ 90% đến dưới 100%</small></article><article className={stop ? "danger" : ""}><span>Dừng nhập</span><strong>{stop}</strong><small>Đã chạm hoặc vượt định mức</small></article></section>
    <MaterialManager user={user} materials={data.materials as any}/>
  </div>;
}