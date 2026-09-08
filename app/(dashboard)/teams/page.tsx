import Link from "next/link";
import { ArrowRight, CheckCircle2, CircleDashed, HardHat, Rows3, Users } from "lucide-react";
import { requireCommander } from "@/lib/auth";
import { getTeamSummary } from "@/lib/data";
import { formatPercent, initials } from "@/lib/format";

export default async function TeamsPage() {
  await requireCommander();
  const teams = await getTeamSummary();

  return (
    <>
      <section className="page-title-row">
        <div><span className="eyebrow">06 ĐỘI THI CÔNG</span><h1>Tình hình từng đội</h1><p>Nhân lực hôm nay, khu vực phụ trách, số móng và trạng thái báo cáo.</p></div>
        <div className="page-title-icon"><Users size={25} /></div>
      </section>
      <section className="team-card-grid">
        {teams.map((team) => <article className="team-card panel" key={team.id}>
          <div className="team-card-head"><div className="large-avatar">{initials(team.full_name)}</div><div><h2>{team.full_name}</h2><span>Đội trưởng</span></div><div className={team.reported ? "reported yes" : "reported no"}>{team.reported ? <CheckCircle2 size={17} /> : <CircleDashed size={17} />}{team.reported ? "Đã báo cáo" : "Chưa báo cáo"}</div></div>
          <div className="scope-chips">{team.zones.map((zone) => <span key={zone.id}>{zone.scope_label}</span>)}</div>
          <div className="team-metrics"><div><HardHat size={17} /><strong>{team.workers}</strong><span>công nhân</span></div><div><Users size={17} /><strong>{team.technicalStaff}</strong><span>kỹ thuật</span></div><div><Rows3 size={17} /><strong>{team.foundationCount}</strong><span>móng</span></div></div>
          <div className="team-progress-row"><span>Tiến độ móng bình quân</span><strong>{formatPercent(team.progress)}%</strong></div><div className="progress-track large"><i style={{ width: `${Math.min(100, team.progress)}%` }} /></div>
          <Link className="team-detail-link" href={`/teams/${team.id}`}>Xem chi tiết đội <ArrowRight size={14}/></Link>
        </article>)}
      </section>
    </>
  );
}
