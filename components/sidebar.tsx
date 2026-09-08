"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  BarChart3,
  Building2,
  ClipboardPlus,
  FileBarChart,
  History,
  LayoutDashboard,
  Map,
  Menu,
  Rows3,
  Users,
  X
} from "lucide-react";
import type { SessionUser } from "@/lib/types";

const commanderNav = [
  { href: "/", label: "Tổng quan", icon: LayoutDashboard },
  { href: "/reports", label: "Nhật ký 6 đội", icon: History },
  { href: "/manpower", label: "Tổng hợp nhân lực", icon: BarChart3 },
  { href: "/weekly-report", label: "Báo cáo tuần", icon: FileBarChart },
  { href: "/map", label: "Mặt bằng tiến độ", icon: Map },
  { href: "/foundations", label: "Danh mục móng", icon: Rows3 },
  { href: "/teams", label: "6 đội thi công", icon: Users }
];

const leaderNav = [
  { href: "/", label: "Tổng quan đội", icon: LayoutDashboard },
  { href: "/reports/new", label: "Nhập báo cáo", icon: ClipboardPlus },
  { href: "/reports", label: "Lịch sử báo cáo", icon: History },
  { href: "/manpower", label: "Nhân lực đội", icon: BarChart3 },
  { href: "/map", label: "Khu vực của tôi", icon: Map },
  { href: "/foundations", label: "Móng của tôi", icon: Rows3 }
];

export function Sidebar({ user }: { user: SessionUser }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const items = user.role === "commander" ? commanderNav : leaderNav;

  return (
    <aside className={mobileOpen ? "sidebar mobile-open" : "sidebar"}>
      <div className="sidebar-mobile-head">
        <div className="sidebar-mobile-brand">
          <span className="brand-logo small">T</span>
          <div><strong>TAILG</strong><span>Điều hành công trường</span></div>
        </div>
        <button
          className="mobile-menu-button"
          type="button"
          onClick={() => setMobileOpen((value) => !value)}
          aria-label={mobileOpen ? "Đóng menu" : "Mở menu"}
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <X size={23} /> : <Menu size={23} />}
        </button>
      </div>

      <div className="sidebar-desktop-content">
        <div className="sidebar-brand">
          <span className="brand-logo small">T</span>
          <div><strong>TAILG</strong><span>Điều hành công trường</span></div>
        </div>

        <div className="sidebar-project">
          <Building2 size={18} />
          <div><span>Dự án</span><strong>Nhà máy TAILG Việt Nam</strong></div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {items.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              className={active ? "nav-link active" : "nav-link"}
              href={item.href}
              key={item.href}
              onClick={() => setMobileOpen(false)}
            >
              <Icon size={19} strokeWidth={1.9} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
