"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CheckCircle2, Pencil, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";

type Notice = { type: "ok" | "error"; text: string };

export function ReportActions({ reportId }: { reportId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), notice.type === "ok" ? 2400 : 4500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  async function removeReport() {
    setDeleting(true);
    try {
      const response = await fetch(`/api/reports/${reportId}`, { method: "DELETE" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Chưa thể xóa báo cáo.");
      setConfirming(false);
      setNotice({ type: "ok", text: "Đã xóa báo cáo" });
      window.setTimeout(() => router.refresh(), 850);
    } catch (error) {
      setConfirming(false);
      setNotice({ type: "error", text: error instanceof Error ? error.message : "Chưa thể xóa báo cáo." });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <div className="report-actions">
        <Link className="report-action-button" href={`/reports/${reportId}/edit`}>
          <Pencil size={16} /> Sửa
        </Link>
        <button className="report-action-button danger" type="button" onClick={() => setConfirming(true)}>
          <Trash2 size={16} /> Xóa
        </button>
      </div>

      {confirming ? (
        <div className="confirm-layer" role="dialog" aria-modal="true" aria-label="Xác nhận xóa báo cáo">
          <div className="confirm-card">
            <div className="confirm-icon"><Trash2 size={23} /></div>
            <h3>Xóa báo cáo này?</h3>
            <p>Báo cáo và ảnh gắn với báo cáo sẽ bị xóa khỏi hệ thống.</p>
            <div className="confirm-actions">
              <button className="button secondary" type="button" onClick={() => setConfirming(false)} disabled={deleting}>Hủy</button>
              <button className="button danger-button" type="button" onClick={removeReport} disabled={deleting}>{deleting ? "Đang xóa..." : "Xóa báo cáo"}</button>
            </div>
          </div>
        </div>
      ) : null}

      {notice ? (
        <div className={`operation-popup ${notice.type}`} role="status" aria-live="polite">
          <div className="operation-popup-icon">{notice.type === "ok" ? <CheckCircle2 size={23} /> : <X size={23} />}</div>
          <div className="operation-popup-copy"><strong>{notice.text}</strong></div>
          <button type="button" className="operation-popup-close" onClick={() => setNotice(null)} aria-label="Đóng thông báo"><X size={17} /></button>
        </div>
      ) : null}
    </>
  );
}
