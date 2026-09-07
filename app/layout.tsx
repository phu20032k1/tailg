import type { Metadata } from "next";
import "./globals.css";
import "./v3.css";
import "./bright-theme.css";

export const metadata: Metadata = {
  title: "TAILG · Điều hành công trường",
  description: "Nền tảng báo cáo ngày, nhân lực, máy móc, công việc, ảnh hiện trường và báo cáo tuần dự án TAILG."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
