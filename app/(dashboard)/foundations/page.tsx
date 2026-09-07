import { Rows3 } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getFoundations, getUsers, getZones } from "@/lib/data";
import { FoundationManager } from "@/components/foundation-manager";

export default async function FoundationsPage() {
  const user = await requireUser();
  const [foundations, zones, users] = await Promise.all([getFoundations(user), getZones(), getUsers()]);
  return <>
    <section className="page-title-row">
      <div><span className="eyebrow">DANH MỤC MÓNG</span><h1>{user.role === "commander" ? "Quản lý móng toàn dự án" : "Móng được giao cho đội"}</h1><p>{user.role === "commander" ? "Thêm mã móng, giao đội phụ trách và theo dõi tiến độ tại một nơi." : "Theo dõi danh sách móng, công việc và tiến độ thuộc phạm vi đội phụ trách."}</p></div>
      <div className="page-title-icon"><Rows3 size={25}/></div>
    </section>
    <FoundationManager foundations={foundations} zones={zones} users={users} commander={user.role === "commander"}/>
  </>;
}
