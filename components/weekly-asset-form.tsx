"use client";

import { FormEvent, useEffect, useState } from "react";
import { CheckCircle2, FileImage, FileText, Loader2, UploadCloud, X } from "lucide-react";
import { useRouter } from "next/navigation";

type Notice = {
  type: "ok" | "error";
  title: string;
  text?: string;
};

export function WeeklyAssetForm({ from, to }: { from: string; to: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [formKey, setFormKey] = useState(0);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), notice.type === "ok" ? 2800 : 5000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setNotice(null);
    try {
      const form = new FormData(event.currentTarget);
      form.set("weekStart", from);
      form.set("weekEnd", to);
      const response = await fetch("/api/weekly-report/assets", { method: "POST", body: form });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Không tải được tài liệu.");
      event.currentTarget.reset();
      setFormKey((value) => value + 1);
      setNotice({ type: "ok", title: "Đã lưu mặt bằng", text: "Tài liệu đã được thêm vào báo cáo tuần." });
      router.refresh();
    } catch (error) {
      setNotice({
        type: "error",
        title: "Chưa lưu được mặt bằng",
        text: error instanceof Error ? error.message : "Vui lòng thử lại."
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <form key={formKey} className="weekly-asset-form" onSubmit={submit}>
        <label className="field"><span>Tên mặt bằng</span><input name="title" defaultValue="Mặt bằng tiến độ thi công" required /></label>
        <input type="hidden" name="assetType" value="plan" />
        <div className="asset-upload-grid">
          <label className="mini-upload"><FileText size={22} /><strong>PDF nguồn</strong><span>Tối đa 30 MB</span><input name="pdf" type="file" accept="application/pdf" /></label>
          <label className="mini-upload"><FileImage size={22} /><strong>Ảnh mặt bằng</strong><span>Ảnh dùng trong báo cáo tuần</span><input name="image" type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" required /></label>
        </div>
        <button className="button secondary" disabled={loading} type="submit">{loading ? <><Loader2 className="spin" size={17} /> Đang lưu...</> : <><UploadCloud size={17} /> Lưu mặt bằng</>}</button>
      </form>

      {notice ? (
        <div className={`operation-popup ${notice.type}`} role="status" aria-live="polite">
          <div className="operation-popup-icon">{notice.type === "ok" ? <CheckCircle2 size={24} /> : <X size={24} />}</div>
          <div className="operation-popup-copy"><strong>{notice.title}</strong>{notice.text ? <span>{notice.text}</span> : null}</div>
          <button type="button" className="operation-popup-close" onClick={() => setNotice(null)} aria-label="Đóng thông báo"><X size={17} /></button>
        </div>
      ) : null}
    </>
  );
}
