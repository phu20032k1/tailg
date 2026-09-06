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
    setLoading(false);

    if (!response.ok) {
      setError(result.error || "Không đăng nhập được.");
      return;
    }

    router.replace("/");
    router.refresh();
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
        <input name="pin" type="password" inputMode="numeric" placeholder="PIN đã đặt trong seed.sql" required />
      </label>

      {error ? <div className="form-error">{error}</div> : null}

      <button className="button primary wide" disabled={loading} type="submit">
        {loading ? "Đang đăng nhập..." : "Vào hệ thống →"}
      </button>

      <p className="form-help">
        PIN được đặt khi chạy <code>supabase/seed.sql</code> và không lưu dạng chữ thường trong database.
      </p>
    </form>
  );
}
