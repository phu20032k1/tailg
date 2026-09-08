"use client";

import { CalendarDays } from "lucide-react";
import { useRouter } from "next/navigation";

export function PeriodFilter({
  basePath,
  mode,
  selectedDate,
  periodTitle,
  periodNote
}: {
  basePath: string;
  mode: "day" | "week";
  selectedDate: string;
  periodTitle: string;
  periodNote: string;
}) {
  const router = useRouter();

  function go(nextMode: "day" | "week", nextDate = selectedDate) {
    router.push(`${basePath}?view=${nextMode}&date=${encodeURIComponent(nextDate)}`);
  }

  return (
    <section className="commander-period-bar">
      <div className="period-tabs" role="tablist" aria-label="Khoảng thời gian">
        <button type="button" className={mode === "day" ? "active" : ""} onClick={() => go("day")}>Theo ngày</button>
        <button type="button" className={mode === "week" ? "active" : ""} onClick={() => go("week")}>Theo tuần</button>
      </div>
      <label className="period-auto-date">
        <CalendarDays size={18} />
        <span>{mode === "week" ? "Chọn ngày trong tuần" : "Ngày báo cáo"}</span>
        <input type="date" value={selectedDate} onChange={(event) => go(mode, event.currentTarget.value)} />
      </label>
      <div className="period-caption">
        <strong>{periodTitle}</strong>
        <span>{periodNote}</span>
      </div>
    </section>
  );
}
