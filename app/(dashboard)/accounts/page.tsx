import { UserCog } from "lucide-react";
import { requireCommander } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { DepartmentAccountSetup } from "@/components/department-account-setup";

export const dynamic = "force-dynamic";

export default async function AccountsPage(){
  await requireCommander();
  const db=getSupabaseAdmin();
  const {data,error}=await db.from("app_users").select("id,username,full_name,role,active").in("username",["khkt","giamdoc","taichinh"]);
  if(error) throw error;
  return <div className="commercial-page"><section className="commercial-page-head"><div><span className="eyebrow">TÀI KHOẢN PHÒNG BAN</span><h1>Phân quyền Kinh tế - Kỹ thuật, Giám đốc và Tài chính</h1><p>Ba tài khoản dùng riêng cho luồng theo dõi thanh toán, phê duyệt nhà thầu phụ, vật tư, chi phí và tiến độ dự án.</p></div><UserCog size={30}/></section><DepartmentAccountSetup existing={data||[]}/></div>;
}