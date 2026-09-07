import { formatPercent } from "@/lib/format";
import type { Zone } from "@/lib/types";

type ZoneProgress = Zone & { progress: number };

function ZoneCard({ zone }: { zone: ZoneProgress }) {
  return (
    <article className={`site-zone group-${zone.group_name.toLowerCase().replace(/\s+/g, "-")}`}>
      <div className="zone-top">
        <div>
          <span>{zone.group_name}</span>
          <strong>{zone.name}</strong>
        </div>
        <b>{formatPercent(zone.progress)}%</b>
      </div>
      <p>{zone.scope_label}</p>
      <div className="progress-track">
        <i style={{ width: `${Math.min(100, Math.max(0, zone.progress))}%` }} />
      </div>
    </article>
  );
}

export function SiteMap({ zones }: { zones: ZoneProgress[] }) {
  const x1 = zones.filter((zone) => zone.group_name === "Xưởng 1");
  const x2 = zones.filter((zone) => zone.group_name === "Xưởng 2");
  const x3 = zones.filter((zone) => zone.group_name === "Xưởng 3");
  const other = zones.filter((zone) => !["Xưởng 1", "Xưởng 2", "Xưởng 3"].includes(zone.group_name));
  const compact = zones.length <= 2;

  return (
    <div className={compact ? "site-map-v2 compact-map" : "site-map-v2"}>
      {x2.length ? <div className="map-column">{x2.map((z) => <ZoneCard key={z.id} zone={z} />)}</div> : null}
      {x1.length ? <div className="x1-grid">{x1.map((z) => <ZoneCard key={z.id} zone={z} />)}</div> : null}
      {x3.length ? <div className="map-column">{x3.map((z) => <ZoneCard key={z.id} zone={z} />)}</div> : null}
      {other.length ? <div className="aux-grid">{other.map((z) => <ZoneCard key={z.id} zone={z} />)}</div> : null}
    </div>
  );
}
