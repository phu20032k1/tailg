"use client";

import { FormEvent, useState } from "react";
import { FileImage, FileText, Loader2, UploadCloud } from "lucide-react";
import { useRouter } from "next/navigation";

export function WeeklyAssetForm({ from, to }: { from: string; to: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const form = new FormData(event.currentTarget);
      form.set("weekStart", from);
      form.set("weekEnd", to);
      const response = await fetch("/api/weekly-report/assets", { method: "POST", body: form });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Không tải được tài liệu.");
      setMessage("Đã lưu PDF nguồn + ảnh crop để đưa vào báo cáo tuần.");
      event.currentTarget.reset();
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không tải được tài liệu.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="weekly-asset-form" onSubmit={submit}>
      <label className="field"><span>Tên mặt bằng</span><input name="title" defaultValue="Mặt bằng tiến độ thi công" required /></label>
      <input type="hidden" name="assetType" value="plan" />
      <div className="asset-upload-grid">
        <label className="mini-upload"><FileText size={22} /><strong>PDF nguồn</strong><span>Lưu để truy vết, tối đa 30 MB</span><input name="pdf" type="file" accept="application/pdf" /></label>
        <label className="mini-upload"><FileImage size={22} /><strong>Ảnh đã crop</strong><span>Ảnh này sẽ vào PowerPoint</span><input name="image" type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" required /></label>
      </div>
      <button className="button secondary" disabled={loading} type="submit">{loading ? <><Loader2 className="spin" size={17} /> Đang tải...</> : <><UploadCloud size={17} /> Lưu mặt bằng</>}</button>
      {message ? <small className="form-note">{message}</small> : null}
    </form>
  );
}
