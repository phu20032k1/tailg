"use client";

import { Download, FileSpreadsheet, Printer, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useTransition } from "react";

export function ManagementReportControls({ date }: { date: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const timer = window.setInterval(() => router.refresh(), 30000);
    return () => window.clearInterval(timer);
  }, [router]);

  function changeDate(nextDate: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(nextDate)) return;
    startTransition(() => router.replace(`/management-report?date=${nextDate}`));
  }

  return (
    <div className="management-report-controls no-print">
      <div className="management-auto-refresh"><RefreshCw size={14}/><span>Tự cập nhật 30 giây/lần</span></div>
      <label>
        <span>Ngày tổng hợp</span>
        <input
          type="date"
          value={date}
          onChange={(event) => changeDate(event.target.value)}
          aria-label="Ngày tổng hợp báo cáo"
        />
      </label>
      <a className="button secondary" href={`/api/management-report/xlsx?date=${date}`}>
        <FileSpreadsheet size={17} /> Tải file tổng hợp
      </a>
      <button className="button primary" type="button" onClick={() => window.print()} disabled={pending}>
        {pending ? <Download size={17} /> : <Printer size={17} />} Xuất PDF
      </button>
    </div>
  );
}
