import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TAILG Site Control",
  description: "Điều hành nhân lực, công việc móng và ảnh hiện trường dự án TAILG."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
