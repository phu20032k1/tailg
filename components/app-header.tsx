import Link from "next/link";
import { BellRing, CalendarDays, LogOut } from "lucide-react";
import type { SessionUser } from "@/lib/types";
import { initials } from "@/lib/format";
import { getDeadlineAlerts } from "@/lib/progress-planning";

const ROLE_LABELS: Record<SessionUser["role"], string> = {
  commander: "Chỉ huy trưởng",
  leader: "Đội trưởng",
  khkt: "Phòng Kinh tế - Kỹ thuật",
  director: "Ban Giám đốc",
  finance: "Phòng Tài chính - Kế toán"
};

export async function AppHeader({ user }: { user: SessionUser }) {
  const today = new Intl.DateTimeFormat("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Asia/Ho_Chi_Minh" }).format(new Date());
  const deadlineAlerts = await getDeadlineAlerts(user);

  return <header className="app-header">
    <div className="header-user-block"><span className="eyebrow">{ROLE_LABELS[user.role]}</span><h2>{user.fullName}</h2></div>
    <div className="header-actions">
      {deadlineAlerts.length ? <Link className="deadline-chip" href="/commercial/progress" title={deadlineAlerts.map((item:any)=>`${item.code} · ${item.title}`).join("\n")}><BellRing size={17}/><span>Việc đến hạn</span><b>{deadlineAlerts.length}</b></Link> : null}
      <div className="header-chip desktop-only"><CalendarDays size={17}/><span>{today}</span></div>
      <div className="user-avatar" title={user.fullName}>{initials(user.fullName)}</div>
      <form action="/api/auth/logout" method="post" className="header-logout-form"><button className="header-logout-button" type="submit" aria-label="Đăng xuất"><LogOut size={18}/><span>Đăng xuất</span></button></form>
    </div>
  </header>;
}
