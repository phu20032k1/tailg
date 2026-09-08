"use client";

import { Download, FileSpreadsheet, Printer } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

export function ManagementReportControls({ date }: { date: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function changeDate(nextDate: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(nextDate)) return;
    startTransition(() => router.replace(`/management-report?date=${nextDate}`));
  }

  return (
    <div className="management-report-controls no-print">
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
