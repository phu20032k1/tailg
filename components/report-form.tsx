"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, CheckCircle2, Loader2, Plus, UploadCloud, X } from "lucide-react";
import type { SessionUser, Zone } from "@/lib/types";

type Leader = {
  id: string;
  full_name: string;
  username: string;
  role: "commander" | "leader";
};

const STAGES = [
  "Đào móng",
  "Đổ bê tông lót",
  "Lắp đặt cốt thép, cốp pha",
  "Đổ bê tông đài móng",
  "Dầm móng",
  "Khác"
];

function today() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(new Date());
}

export function ReportForm({ user, zones, leaders }: { user: SessionUser; zones: Zone[]; leaders: Leader[] }) {
  const router = useRouter();
  const [leaderId, setLeaderId] = useState(user.role === "leader" ? user.id : leaders[0]?.id || "");
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  const visibleZones = useMemo(
    () => zones.filter((zone) => zone.owner_id === leaderId),
    [zones, leaderId]
  );

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);

    const form = new FormData(event.currentTarget);
    const codes = String(form.get("foundationCodes") || "")
      .split(/[\n,;]+/)
      .map((code) => code.trim())
      .filter(Boolean);

    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          reportDate: form.get("reportDate"),
          leaderId: user.role === "commander" ? leaderId : undefined,
          workers: Number(form.get("workers") || 0),
          technicalStaff: Number(form.get("technicalStaff") || 0),
          zoneId: form.get("zoneId"),
          stage: form.get("stage"),
          foundationCodes: codes,
          progress: Number(form.get("progress") || 0),
          quantity: Number(form.get("quantity") || codes.length),
          unit: form.get("unit") || "móng",
          note: form.get("note") || "",
          issueText: form.get("issueText") || ""
        })
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Không lưu được báo cáo.");

      const reportId = result.result?.report_id;
      if (reportId && files.length) {
        for (const file of files) {
          const image = new FormData();
          image.append("file", file);
          image.append("caption", String(form.get("photoCaption") || ""));

          const upload = await fetch(`/api/reports/${reportId}/photos`, { method: "POST", body: image });
          if (!upload.ok) {
            const uploadResult = await upload.json();
            throw new Error(`Báo cáo đã lưu nhưng có ảnh tải thất bại: ${uploadResult.error || "Không rõ lỗi"}`);
          }
        }
      }

      setMessage({ type: "ok", text: `Đã lưu ${codes.length} móng${files.length ? ` và ${files.length} ảnh` : ""}.` });
      setFiles([]);
      event.currentTarget.reset();
      router.refresh();
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Không lưu được dữ liệu." });
    } finally {
      setLoading(false);
    }
  }

  function addFiles(list: FileList | null) {
    if (!list) return;
    const selected = Array.from(list).filter((file) => file.type.startsWith("image/"));
    setFiles((current) => [...current, ...selected].slice(0, 6));
  }

  return (
    <form className="report-form" onSubmit={submit}>
      <section className="form-section">
        <div className="section-heading"><span>01</span><div><h3>Thông tin chung</h3><p>Ngày, đội và nhân lực thi công.</p></div></div>
        <div className="form-grid three">
          <label className="field"><span>Ngày báo cáo</span><input name="reportDate" type="date" defaultValue={today()} required /></label>
          {user.role === "commander" ? (
            <label className="field"><span>Nhập hộ đội trưởng</span><select value={leaderId} onChange={(event) => setLeaderId(event.target.value)} required>{leaders.map((leader) => <option key={leader.id} value={leader.id}>{leader.full_name}</option>)}</select></label>
          ) : (
            <label className="field"><span>Đội trưởng</span><input value={user.fullName} disabled /></label>
          )}
          <label className="field"><span>Khu vực</span><select name="zoneId" key={leaderId} required>{visibleZones.map((zone) => <option key={zone.id} value={zone.id}>{zone.name} · {zone.scope_label}</option>)}</select></label>
        </div>
        <div className="form-grid two">
          <label className="field"><span>Số công nhân</span><input name="workers" type="number" min="0" defaultValue="0" required /></label>
          <label className="field"><span>Cán bộ kỹ thuật</span><input name="technicalStaff" type="number" min="0" defaultValue="0" required /></label>
        </div>
      </section>

      <section className="form-section">
        <div className="section-heading"><span>02</span><div><h3>Công việc móng</h3><p>Một tên móng chỉ được thuộc một đội.</p></div></div>
        <div className="form-grid two">
          <label className="field"><span>Công việc</span><select name="stage" defaultValue="Đổ bê tông đài móng" required>{STAGES.map((stage) => <option key={stage}>{stage}</option>)}</select></label>
          <label className="field"><span>Tiến độ sau cập nhật (%)</span><input name="progress" type="number" min="0" max="100" step="0.1" required /></label>
        </div>
        <label className="field"><span>Tên / mã móng</span><textarea name="foundationCodes" rows={5} placeholder={"M-01, M-05, M-07\nCó thể nhập nhiều mã, ngăn cách bằng dấu phẩy hoặc xuống dòng."} required /><small>Backend chuẩn hóa chữ hoa và chặn nếu móng đã thuộc đội khác.</small></label>
        <div className="form-grid two">
          <label className="field"><span>Khối lượng hôm nay</span><input name="quantity" type="number" min="0" step="0.01" defaultValue="1" /></label>
          <label className="field"><span>Đơn vị</span><select name="unit" defaultValue="móng"><option value="móng">móng</option><option value="m3">m³</option><option value="tấn">tấn</option><option value="m2">m²</option><option value="công việc">công việc</option></select></label>
        </div>
        <label className="field"><span>Vướng mắc hôm nay</span><textarea name="issueText" rows={3} placeholder="Ví dụ: Chưa bàn giao mặt bằng M-24; thiếu thép; không có vướng mắc..." /></label>
        <label className="field"><span>Ghi chú công việc</span><textarea name="note" rows={3} placeholder="Thông tin bổ sung nếu có." /></label>
      </section>

      <section className="form-section">
        <div className="section-heading"><span>03</span><div><h3>Ảnh hiện trường</h3><p>Ảnh thật lưu trong Supabase Storage; PostgreSQL chỉ lưu đường dẫn.</p></div></div>
        <label className="upload-box"><UploadCloud size={30} /><strong>Chọn ảnh từ điện thoại / máy tính</strong><span>JPG, PNG, WEBP, HEIC · tối đa 6 ảnh · 10 MB/ảnh</span><input type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" multiple onChange={(event) => addFiles(event.target.files)} /></label>
        {files.length ? <div className="selected-files">{files.map((file, index) => <div className="selected-file" key={`${file.name}-${index}`}><Camera size={16} /><span>{file.name}</span><button type="button" onClick={() => setFiles((items) => items.filter((_, i) => i !== index))}><X size={15} /></button></div>)}</div> : null}
        <label className="field"><span>Chú thích chung cho ảnh</span><input name="photoCaption" placeholder="Ví dụ: Đổ bê tông móng M-01 đến M-05" /></label>
      </section>

      {message ? <div className={message.type === "ok" ? "submit-message ok" : "submit-message error"}>{message.type === "ok" ? <CheckCircle2 size={18} /> : null}{message.text}</div> : null}
      <div className="form-actions"><button className="button primary" type="submit" disabled={loading || !visibleZones.length}>{loading ? <><Loader2 className="spin" size={18} /> Đang lưu...</> : <><Plus size={18} /> Lưu báo cáo</>}</button></div>
    </form>
  );
}
