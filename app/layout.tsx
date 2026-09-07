import type { Metadata } from "next";
import "./globals.css";
import "./v3.css";

export const metadata: Metadata = {
  title: "TAILG Site Control",
  description: "Điều hành báo cáo ngày, nhân lực, máy móc, công việc, ảnh và báo cáo tuần dự án TAILG."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
