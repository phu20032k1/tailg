import type { Metadata } from "next";
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

export const metadata: Metadata = {
  title: "TAILG · Điều hành công trường",
  description: "Báo cáo thi công hằng ngày và tổng hợp điều hành dự án TAILG."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
