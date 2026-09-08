"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  BarChart3,
  Building2,
  ClipboardPlus,
  FileBarChart,
  FileText,
  History,
  LayoutDashboard,
  Map,
  MoreHorizontal,
  Rows3,
  Users,
  X,
  WalletCards,
  HandCoins,
  PackageCheck,
  ReceiptText,
  ChartNoAxesCombined,
  UserCog
} from "lucide-react";
import type { SessionUser } from "@/lib/types";

type NavItem = {
  href: string;
  label: string;
  mobileLabel: string;
  icon: typeof LayoutDashboard;
};

const commanderNav: NavItem[] = [
  { href: "/", label: "Tổng quan", mobileLabel: "Tổng quan", icon: LayoutDashboard },
  { href: "/reports", label: "Nhật ký 6 đội", mobileLabel: "Nhật ký", icon: History },
  { href: "/management-report", label: "Báo cáo ngày BĐH", mobileLabel: "Báo cáo ngày", icon: FileText },
  { href: "/manpower", label: "Tổng hợp nhân lực", mobileLabel: "Nhân lực", icon: BarChart3 },
  { href: "/weekly-report", label: "Báo cáo tuần", mobileLabel: "Báo cáo tuần", icon: FileBarChart },
  { href: "/map", label: "Mặt bằng tiến độ", mobileLabel: "Mặt bằng", icon: Map },
  { href: "/foundations", label: "Danh mục móng", mobileLabel: "Móng", icon: Rows3 },
  { href: "/teams", label: "6 đội thi công", mobileLabel: "6 đội", icon: Users },
  { href: "/commercial", label: "Kinh tế - thanh toán", mobileLabel: "Kinh tế", icon: WalletCards },
  { href: "/commercial/payments", label: "Thanh toán chủ đầu tư", mobileLabel: "Thanh toán CĐT", icon: HandCoins },
  { href: "/commercial/subcontractors", label: "Thanh toán thầu phụ", mobileLabel: "Thầu phụ", icon: ReceiptText },
  { href: "/commercial/materials", label: "Quản lý vật tư", mobileLabel: "Vật tư", icon: PackageCheck },
  { href: "/commercial/costs", label: "Theo dõi chi phí", mobileLabel: "Chi phí", icon: BarChart3 },
  { href: "/commercial/progress", label: "Tiến độ tổng thể", mobileLabel: "Tiến độ", icon: ChartNoAxesCombined },
  { href: "/accounts", label: "Tài khoản phòng ban", mobileLabel: "Tài khoản", icon: UserCog }
];

const leaderNav: NavItem[] = [
  { href: "/", label: "Tổng quan đội", mobileLabel: "Tổng quan", icon: LayoutDashboard },
  { href: "/reports/new", label: "Nhập báo cáo", mobileLabel: "Nhập báo cáo", icon: ClipboardPlus },
  { href: "/reports", label: "Lịch sử báo cáo", mobileLabel: "Lịch sử", icon: History },
  { href: "/manpower", label: "Nhân lực đội", mobileLabel: "Nhân lực", icon: BarChart3 },
  { href: "/map", label: "Khu vực của tôi", mobileLabel: "Khu vực", icon: Map },
  { href: "/foundations", label: "Móng của tôi", mobileLabel: "Móng", icon: Rows3 },
  { href: "/commercial/progress", label: "Tiến độ được giao", mobileLabel: "Tiến độ", icon: ChartNoAxesCombined }
];

const khktNav: NavItem[] = [
  { href: "/commercial", label: "Tổng quan Kinh tế - KTKT", mobileLabel: "Tổng quan", icon: LayoutDashboard },
  { href: "/commercial/payments", label: "Thanh toán chủ đầu tư", mobileLabel: "Thanh toán CĐT", icon: HandCoins },
  { href: "/commercial/subcontractors", label: "Kiểm tra thanh toán thầu phụ", mobileLabel: "Thầu phụ", icon: ReceiptText },
  { href: "/commercial/materials", label: "Quản lý vật tư", mobileLabel: "Vật tư", icon: PackageCheck },
  { href: "/commercial/costs", label: "Theo dõi chi phí", mobileLabel: "Chi phí", icon: BarChart3 },
  { href: "/commercial/progress", label: "Tiến độ tổng thể", mobileLabel: "Tiến độ", icon: ChartNoAxesCombined },
  { href: "/management-report", label: "Báo cáo thi công", mobileLabel: "Báo cáo", icon: FileText }
];

const directorNav: NavItem[] = [
  { href: "/commercial", label: "Tổng quan dự án", mobileLabel: "Tổng quan", icon: LayoutDashboard },
  { href: "/commercial/payments", label: "Thanh toán chủ đầu tư", mobileLabel: "Thanh toán CĐT", icon: HandCoins },
  { href: "/commercial/subcontractors", label: "Phê duyệt thanh toán", mobileLabel: "Phê duyệt", icon: ReceiptText },
  { href: "/commercial/progress", label: "Tiến độ tổng thể", mobileLabel: "Tiến độ", icon: ChartNoAxesCombined },
  { href: "/management-report", label: "Báo cáo thi công", mobileLabel: "Báo cáo", icon: FileText }
];

const financeNav: NavItem[] = [
  { href: "/commercial", label: "Tổng quan tài chính", mobileLabel: "Tổng quan", icon: LayoutDashboard },
  { href: "/commercial/payments", label: "Thanh toán chủ đầu tư", mobileLabel: "Thanh toán CĐT", icon: HandCoins },
  { href: "/commercial/subcontractors", label: "Thanh toán thầu phụ", mobileLabel: "Thầu phụ", icon: ReceiptText },
  { href: "/commercial/costs", label: "Theo dõi chi phí", mobileLabel: "Chi phí", icon: BarChart3 }
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

function navFor(user: SessionUser) {
  if (user.role === "commander") return commanderNav;
  if (user.role === "khkt") return khktNav;
  if (user.role === "director") return directorNav;
  if (user.role === "finance") return financeNav;
  return leaderNav;
}

export function Sidebar({ user }: { user: SessionUser }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const items = navFor(user);
  const primaryItems = items.slice(0, 4);
  const moreItems = items.slice(4);
  const moreActive = moreItems.some((item) => isActive(pathname, item.href));

  return (
    <>
      <aside className="sidebar">
        <div className="sidebar-desktop-content">
          <div className="sidebar-brand"><span className="brand-logo small">T</span><div><strong>TAILG</strong><span>Điều hành công trường</span></div></div>
          <div className="sidebar-project"><Building2 size={18}/><div><span>Dự án</span><strong>Nhà máy TAILG Việt Nam</strong></div></div>
        </div>
        <nav className="sidebar-nav">
          {items.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;
            return <Link className={active ? "nav-link active" : "nav-link"} href={item.href} key={item.href}><Icon size={19} strokeWidth={1.9}/><span>{item.label}</span></Link>;
          })}
        </nav>
      </aside>

      <nav className="mobile-tabbar" aria-label="Điều hướng chính trên điện thoại">
        {primaryItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(pathname, item.href);
          return <Link className={active ? "mobile-tab-item active" : "mobile-tab-item"} href={item.href} key={item.href} onClick={() => setMobileOpen(false)}><Icon aria-hidden="true"/><span>{item.mobileLabel}</span></Link>;
        })}
        {moreItems.length ? <button className={moreActive || mobileOpen ? "mobile-tab-item active" : "mobile-tab-item"} type="button" onClick={() => setMobileOpen(true)} aria-label="Mở thêm chức năng" aria-expanded={mobileOpen}><MoreHorizontal aria-hidden="true"/><span>Thêm</span></button> : null}
      </nav>

      {mobileOpen ? <div className="mobile-more-layer" role="presentation" onClick={() => setMobileOpen(false)}><section className="mobile-more-sheet" role="dialog" aria-modal="true" aria-label="Thêm chức năng" onClick={(event) => event.stopPropagation()}><div className="mobile-more-handle"/><div className="mobile-more-head"><div><strong>Thêm chức năng</strong><span>Chọn nội dung bạn muốn mở</span></div><button className="mobile-more-close" type="button" onClick={() => setMobileOpen(false)} aria-label="Đóng"><X size={20}/></button></div><div className="mobile-more-grid">{moreItems.map((item) => { const Icon = item.icon; const active = isActive(pathname, item.href); return <Link className={active ? "mobile-more-link active" : "mobile-more-link"} href={item.href} key={item.href} onClick={() => setMobileOpen(false)}><Icon aria-hidden="true"/><span>{item.label}</span></Link>; })}</div></section></div> : null}
    </>
  );
}