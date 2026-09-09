import { ChartNoAxesCombined } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getProgressPlanningData } from "@/lib/progress-planning";
import { WorkPackageManager } from "@/components/work-package-manager";
import { ProjectGantt } from "@/components/project-gantt";

export const dynamic = "force-dynamic";

export default async function ProjectProgressPage(){
  const user=await requireUser();
  const data=await getProgressPlanningData(user);
  const packages=data.packages as any[];
  const weighted=packages.filter((item)=>Number(item.weight_percent||0)>0);
  const weightTotal=weighted.reduce((s,item)=>s+Number(item.weight_percent||0),0);
  const overall=weightTotal>0?weighted.reduce((s,item)=>s+Number(item.percent||0)*Number(item.weight_percent||0),0)/weightTotal:packages.length?packages.reduce((s,item)=>s+Number(item.percent||0),0)/packages.length:0;
  const late=packages.filter((item)=>item.overdue).length;
  const done=packages.filter((item)=>item.percent>=100).length;
  const owners=new Set(packages.map((item)=>item.owner_name)).size;
  return <div className="commercial-page"><section className="commercial-page-head"><div><span className="eyebrow">TIẾN ĐỘ TỔNG THỂ</span><h1>{user.role==="leader"?"Tiến độ các đầu mục được giao":"Tiến độ ngang dự án · giao việc · deadline"}</h1><p>Mỗi đầu mục có khối lượng, ngày bắt đầu, deadline, người được giao, ghi chú tùy chỉnh và thanh tiến độ ngang kiểu Project.</p></div><ChartNoAxesCombined size={30}/></section>
  <section className="commercial-kpi-grid"><article><span>Tiến độ tổng hợp</span><strong>{overall.toFixed(1)}%</strong><small>{weightTotal>0?`Tính theo ${weightTotal.toFixed(1)}% trọng số đã khai báo`:"Chưa khai báo trọng số — đang lấy bình quân đầu mục"}</small></article><article><span>Đầu mục hoàn thành</span><strong>{done}/{packages.length}</strong><small>Đạt 100% khối lượng giao</small></article><article className={late?"danger":""}><span>Đầu mục chậm</span><strong>{late}</strong><small>Quá deadline nhưng chưa hoàn thành</small></article><article><span>Đơn vị thực hiện</span><strong>{owners}</strong><small>Đội / Ban / nhà thầu phụ</small></article></section>
  <ProjectGantt user={user} packages={packages} users={data.users as any[]} columns={data.columns as any[]}/>
  <WorkPackageManager user={user} packages={packages}/></div>;
}
