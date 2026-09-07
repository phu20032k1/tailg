import { CalendarDays, Cloud } from "lucide-react";
import type { SessionUser } from "@/lib/types";
import { initials } from "@/lib/format";

export function AppHeader({ user }: { user: SessionUser }) {
  const today = new Intl.DateTimeFormat("vi-VN", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Asia/Ho_Chi_Minh"
  }).format(new Date());

  return (
    <header className="app-header">
      <div>
        <span className="eyebrow">
          {user.role === "commander" ? "Chỉ huy trưởng" : "Đội trưởng"}
        </span>
        <h2>{user.fullName}</h2>
      </div>

      <div className="header-actions">
        <div className="header-chip">
          <Cloud size={16} />
          <span>Đã kết nối</span>
        </div>
        <div className="header-chip desktop-only">
          <CalendarDays size={16} />
          <span>{today}</span>
        </div>
        <div className="user-avatar" title={user.fullName}>{initials(user.fullName)}</div>
      </div>
    </header>
  );
}
