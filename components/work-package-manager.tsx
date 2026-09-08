"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, Clock3, LoaderCircle, Plus, X } from "lucide-react";
import type { SessionUser } from "@/lib/types";

function date(value?: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(`${value}T12:00:00+07:00`));
}

export function WorkPackageManager({ user, packages }: { user: SessionUser; packages: any[] }) {
  const router = useRouter();
  const [openId, setOpenId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const canCreate = ["commander", "khkt"].includes(user.role);

  async function createPackage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage(""); const f = new FormData(event.currentTarget);
    try {
      const r = await fetch("/api/commercial/work-packages", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ code: f.get("code"), title: f.get("title"), areaLabel: f.get("areaLabel"), ownerType: f.get("ownerType"), ownerName: f.get("ownerName"), plannedQuantity: f.get("plannedQuantity"), unit: f.get("unit"), weightPercent: f.get("weightPercent"), plannedStart: f.get("plannedStart") || undefined, plannedFinish: f.get("plannedFinish") || undefined }) });
      const j = await r.json(); if (!r.ok) throw new Error(j.error || "Không tạo được đầu mục."); event.currentTarget.reset(); setMessage("Đã giao đầu mục tiến độ"); router.refresh();
    } catch (e) { setMessage(e instanceof Error ? e.message : "Không tạo được đầu mục."); } finally { setBusy(false); }
  }

  async function updatePackage(event: FormEvent<HTMLFormElement>, id: string) {
    event.preventDefault(); setBusy(true); setMessage(""); const f = new FormData(event.currentTarget);
    try {
      const r = await fetch(`/api/commercial/work-packages/${id}/update`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ updateDate: f.get("updateDate"), dailyQuantity: f.get("dailyQuantity"), cumulativeQuantity: f.get("cumulativeQuantity"), note: f.get("note") }) });
      const j = await r.json(); if (!r.ok) throw new Error(j.error || "Không cập nhật được tiến độ."); event.currentTarget.reset(); setOpenId(null); setMessage("Đã cập nhật tiến độ trong ngày"); router.refresh();
    } catch (e) { setMessage(e instanceof Error ? e.message : "Không cập nhật được tiến độ."); } finally { setBusy(false); }
  }

  return <>
    {canCreate ? <form className="panel commercial-form" onSubmit={createPackage}><div className="panel-head"><div><span className="eyebrow">GIAO TIẾN ĐỘ CHI TIẾT</span><h2>Thêm đầu mục công việc chính</h2></div></div><div className="panel-body commercial-form-grid">
      <label className="field"><span>Mã đầu mục</span><input name="code" required placeholder="VD: X1-COC-01" /></label><label className="field commercial-span-2"><span>Tên công việc</span><input name="title" required placeholder="VD: Thi công cọc Xưởng 1" /></label><label className="field"><span>Hạng mục / khu vực</span><input name="areaLabel" placeholder="Xưởng 1" /></label>
      <label className="field"><span>Giao cho</span><select name="ownerType" defaultValue="team"><option value="team">Đội thi công</option><option value="subcontractor">Nhà thầu phụ</option><option value="ban">Ban điều hành</option></select></label><label className="field"><span>Tên đội / nhà thầu</span><input name="ownerName" required placeholder="VD: Bùi Văn Đức" /></label><label className="field"><span>Khối lượng giao</span><input name="plannedQuantity" type="number" min="0.001" step="0.001" required /></label><label className="field"><span>Đơn vị</span><input name="unit" required placeholder="cọc / m3 / tấn..." /></label><label className="field"><span>Trọng số tiến độ (%)</span><input name="weightPercent" type="number" min="0" max="100" step="0.1" defaultValue="0" /></label>
      <label className="field"><span>Ngày bắt đầu</span><input name="plannedStart" type="date" /></label><label className="field"><span>Ngày phải hoàn thành</span><input name="plannedFinish" type="date" /></label><div className="commercial-form-actions"><button className="button primary" disabled={busy} type="submit">{busy ? <><LoaderCircle className="route-loading-spinner" size={17}/> Đang lưu...</> : "Giao đầu mục"}</button></div>
    </div></form> : null}

    <section className="work-package-grid">
      {packages.map((item) => {
        const leaderOwns = user.role === "leader" && item.owner_type === "team" && item.owner_name === user.fullName;
        const canUpdate = ["commander", "khkt"].includes(user.role) || leaderOwns;
        const level = item.overdue ? "late" : item.percent >= 100 ? "done" : item.percent > 0 ? "running" : "not-started";
        return <article className={`work-package-card ${level}`} key={item.id}>
          <header><div><span>{item.code}</span><h3>{item.title}</h3><p>{item.area_label || "Toàn dự án"} · {item.owner_name}</p></div>{item.overdue ? <AlertTriangle size={22}/> : item.percent >= 100 ? <CheckCircle2 size={22}/> : <Clock3 size={22}/>}</header>
          <div className="work-package-stats"><div><span>Khối lượng giao</span><strong>{Number(item.planned_quantity).toLocaleString("vi-VN")} {item.unit}</strong></div><div><span>Hôm nay gần nhất</span><strong>{Number(item.latest?.daily_quantity || 0).toLocaleString("vi-VN")} {item.unit}</strong></div><div><span>Lũy kế</span><strong>{Number(item.current).toLocaleString("vi-VN")} {item.unit}</strong></div><div><span>Trọng số</span><strong>{Number(item.weight_percent || 0).toLocaleString("vi-VN")}%</strong></div></div>
          <div className="work-package-progress"><div className="progress-track large"><i style={{ width: `${Math.min(100, Math.max(0, item.percent))}%` }} /></div><strong>{item.percent.toFixed(1)}%</strong></div>
          <div className="work-package-dates"><span>Bắt đầu: <b>{date(item.planned_start)}</b></span><span>Cam kết: <b>{date(item.planned_finish)}</b></span><span>Cập nhật: <b>{item.latest ? date(item.latest.update_date) : "Chưa có"}</b></span></div>
          {item.overdue ? <div className="work-package-alert"><AlertTriangle size={16}/><span>Đang chậm so với ngày hoàn thành cam kết.</span></div> : null}
          {canUpdate ? <button className="button secondary" onClick={() => setOpenId(openId === item.id ? null : item.id)}><Plus size={16}/> Cập nhật hôm nay</button> : null}
          {openId === item.id ? <form className="work-package-update-form" onSubmit={(event) => updatePackage(event, item.id)}><label><span>Ngày</span><input name="updateDate" type="date" required /></label><label><span>Khối lượng hôm nay</span><input name="dailyQuantity" type="number" min="0" step="0.001" required /></label><label><span>Lũy kế đến hết hôm nay</span><input name="cumulativeQuantity" type="number" min="0" max={Number(item.planned_quantity)} step="0.001" defaultValue={Number(item.current)} required /></label><label className="span-2"><span>Ghi chú</span><input name="note" /></label><button className="button primary" type="submit" disabled={busy}>Lưu tiến độ</button></form> : null}
          {item.updates?.length ? <details className="work-package-history"><summary>Lịch sử cập nhật ({item.updates.length})</summary>{item.updates.map((u:any)=><div key={u.id}><span>{date(u.update_date)}</span><b>+{Number(u.daily_quantity).toLocaleString("vi-VN")} · Lũy kế {Number(u.cumulative_quantity).toLocaleString("vi-VN")} {item.unit}</b><small>{u.note || ""}</small></div>)}</details> : null}
        </article>;
      })}
      {!packages.length ? <div className="panel commercial-empty-card">Chưa có đầu mục tiến độ chi tiết.</div> : null}
    </section>
    {message ? <div className="operation-popup ok"><div className="operation-popup-icon"><CheckCircle2/></div><div className="operation-popup-copy"><strong>{message}</strong></div><button className="operation-popup-close" onClick={() => setMessage("")}><X size={17}/></button></div> : null}
  </>;
}