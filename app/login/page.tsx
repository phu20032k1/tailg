import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { LoginForm } from "@/components/login-form";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/");

  return (
    <main className="login-page">
      <section className="login-story">
        <div className="brand-lockup">
          <span className="brand-logo">T</span>
          <div>
            <strong>TAILG Site Control</strong>
            <span>LICOGI 18.3 · PILOT GIAI ĐOẠN MÓNG</span>
          </div>
        </div>

        <div className="login-copy">
          <span className="eyebrow">ĐIỀU HÀNH THI CÔNG HẰNG NGÀY</span>
          <h1>6 đội nhập liệu.<br />1 Dashboard tổng hợp.</h1>
          <p>
            Nhân công, công việc, tên móng, phần trăm tiến độ và ảnh hiện trường
            được lưu tập trung trên PostgreSQL + Supabase Storage.
          </p>
        </div>

        <div className="login-map" aria-hidden="true">
          <div className="login-zone red">Xưởng 1 · 4 khu</div>
          <div className="login-zone blue">Xưởng 2</div>
          <div className="login-zone teal">Xưởng 3 · 2 khu</div>
          <div className="login-zone amber">Phụ trợ & hạ tầng</div>
        </div>
      </section>

      <section className="login-panel">
        <LoginForm />
      </section>
    </main>
  );
}
