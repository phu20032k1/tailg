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
            <strong>TAILG · Điều hành công trường</strong>
            <span>LICOGI 18.3 · GIAI ĐOẠN TRIỂN KHAI THỰC TẾ</span>
          </div>
        </div>

        <div className="login-copy">
          <span className="eyebrow">BÁO CÁO THI CÔNG HẰNG NGÀY</span>
          <h1>6 đội báo cáo mỗi ngày.<br />Ban điều hành theo dõi tập trung.</h1>
          <p>
            Nhân lực, máy móc, công việc, tiến độ và ảnh hiện trường được cập nhật theo từng đội,
            giúp Chỉ huy trưởng kiểm tra nhanh tình hình thi công trong ngày và tổng hợp báo cáo tuần.
          </p>
        </div>

        <div className="login-map" aria-hidden="true">
          <div className="login-zone red">Xưởng 1 · 4 khu thi công</div>
          <div className="login-zone blue">Xưởng 2</div>
          <div className="login-zone teal">Xưởng 3 · 2 khu thi công</div>
          <div className="login-zone amber">Nhà phụ trợ · Hạ tầng</div>
        </div>
      </section>

      <section className="login-panel">
        <LoginForm />
      </section>
    </main>
  );
}
