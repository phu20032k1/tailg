import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./v3.css";
import "./bright-theme.css";
import "./polish.css";
import "./foundation-v4.css";
import "./chat.css";
import "./commander-dashboard.css";
import "./input-fix.css";
import "./photo-viewer.css";
import "./team-detail.css";
import "./report-improvements.css";
import "./management-report.css";
import "./management-report-auto.css";
import "./mobile-tabbar.css";
import "./professional-ui.css";
import "./commercial.css";
import "./material-workflow.css";
import "./subcontractor-quantity.css";
import "./sidebar-overflow.css";

export const metadata: Metadata = {
  title: "TAILG · Điều hành công trường",
  description: "Báo cáo thi công hằng ngày và tổng hợp điều hành dự án TAILG."
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
