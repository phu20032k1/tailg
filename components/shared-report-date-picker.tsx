"use client";

import { useRouter } from "next/navigation";
import { CalendarDays } from "lucide-react";

export function SharedReportDatePicker({date}:{date:string}){
  const router=useRouter();
  return <label className="shared-report-date"><CalendarDays size={17}/><span>Ngày báo cáo</span><input type="date" value={date} onChange={(event)=>router.push(`/project-reports?date=${event.target.value}`)}/></label>;
}
