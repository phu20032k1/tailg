"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

const ACCOUNTS = [
  ["tung", "Phan Viết Tùng · Chỉ huy trưởng"],
  ["duc", "Bùi Văn Đức · Đội trưởng"],
  ["toan", "Tăng Văn Toán · Đội trưởng"],
  ["toan-tran", "Trần Văn Toãn · Đội trưởng"],
  ["tuan", "Nguyễn Văn Tuần · Đội trưởng"],
  ["quang", "Nguyễn Ánh Quang · Đội trưởng"],
  ["tho", "Nguyễn Duy Thọ · Đội trưởng"]
];

export function LoginForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const form = new FormData(event.currentTarget);
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          username: form.get("username"),
          pin: form.get("pin")
        })
      });

      const result = await response.json();
      if (!response.ok) {
        setError(result.error || "Không đăng nhập được.");
        return;
      }

      router.replace("/");
      router.refresh();
    } catch {
      setError("Không gọi được máy chủ đăng nhập. Kiểm tra deployment Vercel.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="login-card" onSubmit={submit}>
      <span className="badge success">POSTGRESQL + SUPABASE STORAGE</span>
      <h2>Đăng nhập công trường</h2>
      <p className="muted">
        Chọn đúng tài khoản. Dữ liệu của đội được phân quyền ở backend.
      </p>

      <label className="field">
        <span>Tài khoản</span>
        <select name="username" defaultValue="tung">
          {ACCOUNTS.map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </label>

      <label className="field">
        <span>Mã PIN</span>
        <input name="pin" type="password" inputMode="numeric" autoComplete="current-password" placeholder="Nhập PIN tài khoản" required />
      </label>

      {error ? (
        <div className="form-error">
          <strong>Không đăng nhập được.</strong>
          <div>{error}</div>
          <a href="/api/health" target="_blank" rel="noreferrer">Mở kiểm tra Supabase / API →</a>
        </div>
      ) : null}

      <button className="button primary wide" disabled={loading} type="submit">
        {loading ? "Đang đăng nhập..." : "Vào hệ thống →"}
      </button>

      <p className="form-help">
        PIN được tạo trong <code>supabase/seed.sql</code>. Trang kiểm tra kết nối không hiển thị secret.
      </p>
    </form>
  );
}
