import { Map } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getDashboardData } from "@/lib/data";
import { SiteMap } from "@/components/site-map";
import { formatPercent } from "@/lib/format";

export default async function MapPage() {
  const user = await requireUser();
  const data = await getDashboardData(user);

  return (
    <>
      <section className="page-title-row">
        <div><span className="eyebrow">PHÂN KHU THI CÔNG</span><h1>{user.role === "commander" ? "Mặt bằng tiến độ tổng hợp" : "Khu vực phụ trách"}</h1><p>Xưởng 1 chia 4 phần, Xưởng 3 chia 2 phần; hạng mục phụ trợ theo phân công đội.</p></div>
        <div className="page-title-icon"><Map size={25} /></div>
      </section>
      <section className="panel"><div className="panel-body"><SiteMap zones={data.zones} /></div></section>
      <section className="zone-detail-grid section-gap">
        {data.zones.map((zone) => <article className="panel" key={zone.id}><div className="panel-body"><span className="eyebrow">{zone.group_name}</span><h3>{zone.name}</h3><p>{zone.scope_label}</p><div className="progress-number">{formatPercent(zone.progress)}%</div><div className="progress-track large"><i style={{ width: `${Math.min(100, zone.progress)}%` }} /></div></div></article>)}
      </section>
    </>
  );
}
