import { Rows3 } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getFoundations, getUsers, getZones } from "@/lib/data";
import { formatPercent } from "@/lib/format";

export default async function FoundationsPage() {
  const user = await requireUser();
  const [foundations, zones, users] = await Promise.all([getFoundations(user), getZones(), getUsers()]);
  const zoneMap = new Map(zones.map((zone) => [zone.id, zone]));
  const userMap = new Map(users.map((item) => [item.id, item]));

  return (
    <>
      <section className="page-title-row">
        <div><span className="eyebrow">UNIQUE FOUNDATION OWNER</span><h1>{user.role === "commander" ? "Danh mục móng toàn dự án" : "Danh mục móng của đội"}</h1><p>Mỗi mã móng chỉ có một đội chủ quản. Backend chặn nhập chồng.</p></div>
        <div className="page-title-icon"><Rows3 size={25} /></div>
      </section>
      <div className="foundation-grid">
        {foundations.map((foundation) => <article className="foundation-card" key={foundation.id}><div className="foundation-code">{foundation.code}</div><span>{zoneMap.get(foundation.zone_id)?.name || foundation.zone_id}</span><small>{userMap.get(foundation.owner_id)?.full_name}</small><strong>{foundation.current_stage}</strong><div className="foundation-progress"><div className="progress-track"><i style={{ width: `${Math.min(100, foundation.progress)}%` }} /></div><b>{formatPercent(foundation.progress)}%</b></div></article>)}
      </div>
      {!foundations.length ? <div className="panel empty-state">Chưa có móng nào được nhập.</div> : null}
    </>
  );
}
