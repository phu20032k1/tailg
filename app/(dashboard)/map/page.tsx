import Link from "next/link";
import { Map } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getDashboardData, getProgressItems, getProgressMap, getUsers, getZones } from "@/lib/data";
import { SiteMap } from "@/components/site-map";
import { ProgressStageManager } from "@/components/progress-stage-manager";
import { ProgressMapUpload } from "@/components/progress-map-upload";
import { formatPercent } from "@/lib/format";
import { WORK_STAGE_ORDER } from "@/lib/project-order";

export default async function MapPage({ searchParams }: { searchParams?: Promise<Record<string,string|string[]|undefined>> }) {
  const user = await requireUser();
  const params=(await searchParams)||{};
  const stage=typeof params.stage==="string"&&WORK_STAGE_ORDER.includes(params.stage)?params.stage:WORK_STAGE_ORDER[0];
  const [data,items,map,users,zones]=await Promise.all([
    getDashboardData(user),
    getProgressItems(user,stage),
    getProgressMap(stage),
    getUsers(),
    getZones()
  ]);
  const today=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Ho_Chi_Minh"}).format(new Date());
  const visibleZones=user.role==="commander"?zones:zones.filter(zone=>zone.owner_id===user.id);

  return (
    <>
      <section className="page-title-row">
        <div><span className="eyebrow">MẶT BẰNG & TIẾN ĐỘ CAM KẾT</span><h1>{user.role === "commander" ? "Mặt bằng tiến độ tổng hợp" : "Khu vực phụ trách"}</h1><p>Theo dõi riêng từng giai đoạn từ móng, cột, sàn đến sàn nền; so sánh ngày cam kết và ngày hoàn thành thực tế.</p></div>
        <div className="page-title-icon"><Map size={25} /></div>
      </section>

      <section className="panel"><div className="panel-head"><div><span className="eyebrow">TỔNG QUAN PHÂN KHU</span><h2>Tiến độ hiện tại theo khu vực</h2></div></div><div className="panel-body"><SiteMap zones={data.zones} /></div></section>

      <section className="zone-detail-grid section-gap">
        {data.zones.map((zone) => <article className="panel" key={zone.id}><div className="panel-body"><span className="eyebrow">{zone.group_name}</span><h3>{zone.name}</h3><p>{zone.scope_label}</p><div className="progress-number">{formatPercent(zone.progress)}%</div><div className="progress-track large"><i style={{ width: `${Math.min(100, zone.progress)}%` }} /></div></div></article>)}
      </section>

      <section className="panel section-gap"><div className="panel-head"><div><span className="eyebrow">GIAI ĐOẠN THI CÔNG</span><h2>Chọn mặt bằng cần theo dõi</h2></div></div><div className="panel-body">
        <div className="progress-stage-tabs">{WORK_STAGE_ORDER.map(item=><Link key={item} className={item===stage?"active":""} href={`/map?stage=${encodeURIComponent(item)}`}>{item}</Link>)}</div>
        {user.role==="commander"?<ProgressMapUpload stage={stage}/>:null}
      </div></section>

      <div className="section-gap">
        <ProgressStageManager items={items} zones={visibleZones} users={users} commander={user.role==="commander"} stage={stage} today={today} mapUrl={map?.signedUrl||null}/>
      </div>
    </>
  );
}
