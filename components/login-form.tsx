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
        setError(result.error || "Không đăng nhập được. Vui lòng kiểm tra lại tài khoản và mã PIN.");
        return;
      }

      router.replace("/");
      router.refresh();
    } catch {
      setError("Không đăng nhập được lúc này. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="login-card" onSubmit={submit}>
      <h2>Đăng nhập</h2>
      <p className="muted">Chọn tài khoản và nhập mã PIN.</p>

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
        <input name="pin" type="password" inputMode="numeric" autoComplete="current-password" placeholder="Nhập mã PIN" required />
      </label>

      {error ? <div className="form-error"><strong>{error}</strong></div> : null}

      <button className="button primary wide" disabled={loading} type="submit">
        {loading ? "Đang đăng nhập..." : "Đăng nhập"}
      </button>
    </form>
  );
}
