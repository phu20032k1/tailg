"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Building2,
  ClipboardPlus,
  FileBarChart,
  History,
  LayoutDashboard,
  LogOut,
  Map,
  Rows3,
  Users
} from "lucide-react";
import type { SessionUser } from "@/lib/types";

const commanderNav = [
  { href: "/", label: "Tổng quan", icon: LayoutDashboard },
  { href: "/reports/new", label: "Nhập báo cáo ngày", icon: ClipboardPlus },
  { href: "/reports", label: "Nhật ký 6 đội", icon: History },
  { href: "/manpower", label: "Tổng hợp nhân lực", icon: BarChart3 },
  { href: "/weekly-report", label: "Báo cáo tuần", icon: FileBarChart },
  { href: "/map", label: "Mặt bằng tiến độ", icon: Map },
  { href: "/foundations", label: "Danh mục móng", icon: Rows3 },
  { href: "/teams", label: "6 đội thi công", icon: Users }
];

const leaderNav = [
  { href: "/", label: "Tổng quan đội", icon: LayoutDashboard },
  { href: "/reports/new", label: "Nhập báo cáo ngày", icon: ClipboardPlus },
  { href: "/reports", label: "Lịch sử nhập", icon: History },
  { href: "/manpower", label: "Nhân lực đội", icon: BarChart3 },
  { href: "/map", label: "Khu vực của tôi", icon: Map },
  { href: "/foundations", label: "Móng của tôi", icon: Rows3 }
];

export function Sidebar({ user }: { user: SessionUser }) {
  const pathname = usePathname();
  const items = user.role === "commander" ? commanderNav : leaderNav;

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <span className="brand-logo small">T</span>
        <div><strong>TAILG</strong><span>Điều hành công trường</span></div>
      </div>

      <div className="sidebar-project">
        <Building2 size={18} />
        <div><span>Dự án</span><strong>Nhà máy TAILG Việt Nam</strong></div>
      </div>

      <nav className="sidebar-nav">
        {items.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return <Link className={active ? "nav-link active" : "nav-link"} href={item.href} key={item.href}><Icon size={18} strokeWidth={1.8} /><span>{item.label}</span></Link>;
        })}
      </nav>

      <div className="sidebar-bottom">
        <div className="cloud-status"><span className="status-dot" /><div><strong>Dữ liệu trực tuyến</strong><span>Đã kết nối máy chủ</span></div></div>
        <form action="/api/auth/logout" method="post"><button className="logout-button" type="submit"><LogOut size={17} />Đăng xuất</button></form>
      </div>
    </aside>
  );
}
