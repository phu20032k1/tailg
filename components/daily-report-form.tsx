"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Camera,
  CheckCircle2,
  ClipboardPaste,
  Loader2,
  Plus,
  Trash2,
  UploadCloud
} from "lucide-react";
import { parseDailyReportMessage } from "@/lib/report-message-parser";
import type { SessionUser } from "@/lib/types";

type Leader = {
  id: string;
  full_name: string;
  username: string;
  role: "commander" | "leader";
};

type LaborEntry = {
  categoryCode: string;
  label: string;
  crewName: string;
  headcount: number;
  countsAsWorker: boolean;
};

type EquipmentEntry = {
  equipmentName: string;
  quantity: number;
  unit: string;
};

type TaskEntry = {
  kind: "main" | "other";
  areaLabel: string;
  descriptionVi: string;
  descriptionZh: string;
};

const LABOR_OPTIONS = [
  ["technical", "Kỹ thuật", false],
  ["machine_operator", "Lái máy", false],
  ["security", "Bảo vệ", false],
  ["survey", "TD / Trắc địa", false],
  ["day_labor", "Công nhật", true],
  ["rebar", "Cốt thép", true],
  ["formwork", "Cốp pha / ván khuôn", true],
  ["other", "Khác", true]
] as const;

function today() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(new Date());
}

const initialLabor: LaborEntry[] = [
  { categoryCode: "technical", label: "Kỹ thuật", crewName: "", headcount: 0, countsAsWorker: false },
  { categoryCode: "machine_operator", label: "Lái máy", crewName: "", headcount: 0, countsAsWorker: false },
  { categoryCode: "security", label: "Bảo vệ", crewName: "", headcount: 0, countsAsWorker: false },
  { categoryCode: "day_labor", label: "Công nhật", crewName: "", headcount: 0, countsAsWorker: true },
  { categoryCode: "rebar", label: "Cốt thép", crewName: "", headcount: 0, countsAsWorker: true },
  { categoryCode: "formwork", label: "Cốp pha / ván khuôn", crewName: "", headcount: 0, countsAsWorker: true }
];

export function DailyReportForm({ user, leaders }: { user: SessionUser; leaders: Leader[] }) {
  const router = useRouter();
  const [leaderId, setLeaderId] = useState(user.role === "leader" ? user.id : leaders[0]?.id || "");
  const [reportDate, setReportDate] = useState(today());
  const [rawMessage, setRawMessage] = useState("");
  const [labor, setLabor] = useState<LaborEntry[]>(initialLabor);
  const [equipment, setEquipment] = useState<EquipmentEntry[]>([
    { equipmentName: "Máy xúc", quantity: 0, unit: "máy" }
  ]);
  const [tasks, setTasks] = useState<TaskEntry[]>([
    { kind: "main", areaLabel: "", descriptionVi: "", descriptionZh: "" }
  ]);
  const [files, setFiles] = useState<File[]>([]);
  const [photoCaption, setPhotoCaption] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  const directWorkers = useMemo(
    () => labor.reduce((sum, item) => sum + (item.countsAsWorker ? Number(item.headcount || 0) : 0), 0),
    [labor]
  );
  const technical = useMemo(
    () => labor.filter((item) => item.categoryCode === "technical").reduce((sum, item) => sum + Number(item.headcount || 0), 0),
    [labor]
  );

  function parseMessage() {
    const parsed = parseDailyReportMessage(rawMessage);
    if (parsed.reportDate) setReportDate(parsed.reportDate);
    if (parsed.teamName && user.role === "commander") {
      const normalized = parsed.teamName.toLocaleLowerCase("vi");
      const matched = leaders.find((leader) => normalized.includes(leader.full_name.toLocaleLowerCase("vi")));
      if (matched) setLeaderId(matched.id);
    }
    if (parsed.labor.length) {
      setLabor(parsed.labor.map((item) => ({ ...item, crewName: item.crewName || "" })));
    }
    if (parsed.equipment.length) setEquipment(parsed.equipment);
    if (parsed.tasks.length) {
      setTasks(parsed.tasks.map((item) => ({ ...item, areaLabel: item.areaLabel || "", descriptionZh: "" })));
    }
    setMessage({ type: "ok", text: "Đã bóc tách tin nhắn. Hãy rà lại số lượng và nội dung trước khi lưu." });
  }

  function changeLabor(index: number, patch: Partial<LaborEntry>) {
    setLabor((items) => items.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  function changeEquipment(index: number, patch: Partial<EquipmentEntry>) {
    setEquipment((items) => items.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  function changeTask(index: number, patch: Partial<TaskEntry>) {
    setTasks((items) => items.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          reportDate,
          leaderId: user.role === "commander" ? leaderId : undefined,
          rawMessage,
          labor: labor
            .filter((item) => item.label.trim() && Number(item.headcount) >= 0)
            .map((item, index) => ({ ...item, headcount: Number(item.headcount), sortOrder: (index + 1) * 10 })),
          equipment: equipment
            .filter((item) => item.equipmentName.trim())
            .map((item, index) => ({ ...item, quantity: Number(item.quantity), sortOrder: (index + 1) * 10 })),
          tasks: tasks
            .filter((item) => item.descriptionVi.trim())
            .map((item, index) => ({ ...item, sortOrder: (index + 1) * 10 })),
          issueText: ""
        })
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Không lưu được báo cáo.");

      const reportId = result.result?.report_id;
      if (reportId && files.length) {
        for (const file of files) {
          const image = new FormData();
          image.append("file", file);
          image.append("caption", photoCaption);
          image.append("photoType", "work");
          const upload = await fetch(`/api/reports/${reportId}/photos`, { method: "POST", body: image });
          const uploadResult = await upload.json();
          if (!upload.ok) throw new Error(`Báo cáo đã lưu nhưng ảnh lỗi: ${uploadResult.error || "Không rõ lỗi"}`);
        }
      }

      setMessage({
        type: "ok",
        text: `Đã lưu báo cáo: ${directWorkers} công nhân + ${technical} kỹ thuật${files.length ? ` + ${files.length} ảnh` : ""}.`
      });
      setFiles([]);
      router.refresh();
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Không lưu được dữ liệu." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="report-form daily-v3-form" onSubmit={submit}>
      <section className="form-section">
        <div className="section-heading"><span>01</span><div><h3>Tin nhắn báo cáo gốc</h3><p>Dán nguyên tin nhắn nhóm dự án rồi bấm bóc tách. Không dùng AI.</p></div></div>
        <div className="form-grid two">
          <label className="field"><span>Ngày báo cáo</span><input type="date" value={reportDate} onChange={(event) => setReportDate(event.target.value)} required /></label>
          {user.role === "commander" ? (
            <label className="field"><span>Đội thi công</span><select value={leaderId} onChange={(event) => setLeaderId(event.target.value)} required>{leaders.map((leader) => <option key={leader.id} value={leader.id}>{leader.full_name}</option>)}</select></label>
          ) : <label className="field"><span>Đội thi công</span><input value={user.fullName} disabled /></label>}
        </div>
        <label className="field"><span>Nội dung tin nhắn</span><textarea rows={11} value={rawMessage} onChange={(event) => setRawMessage(event.target.value)} placeholder="CÔNG TÁC BÁO CÁO ngày ...\nĐội: ...\n1/ Nhân lực...\n2/ Máy móc...\n3/ Nội dung công việc..." /></label>
        <button className="button secondary" type="button" onClick={parseMessage} disabled={!rawMessage.trim()}><ClipboardPaste size={17} /> Bóc tách tin nhắn</button>
      </section>

      <section className="form-section">
        <div className="section-heading"><span>02</span><div><h3>Nhân lực</h3><p>Tổng công nhân dùng cho bảng Excel = các dòng được đánh dấu “Tính vào công nhân”.</p></div></div>
        <div className="summary-strip"><div><span>Công nhân trực tiếp</span><strong>{directWorkers}</strong></div><div><span>Kỹ thuật</span><strong>{technical}</strong></div><div><span>Tổng dòng nhân lực</span><strong>{labor.reduce((sum, item) => sum + Number(item.headcount || 0), 0)}</strong></div></div>
        <div className="editable-table labor-table">
          <div className="editable-row editable-head"><span>Nhóm</span><span>Tổ / người phụ trách</span><span>SL</span><span>Tính CN</span><span /></div>
          {labor.map((item, index) => (
            <div className="editable-row" key={`${item.categoryCode}-${index}`}>
              <select value={item.categoryCode} onChange={(event) => { const option = LABOR_OPTIONS.find(([code]) => code === event.target.value); changeLabor(index, { categoryCode: event.target.value, label: option?.[1] || "Khác", countsAsWorker: option?.[2] ?? true }); }}>{LABOR_OPTIONS.map(([code, label]) => <option key={code} value={code}>{label}</option>)}</select>
              <input value={item.crewName} onChange={(event) => changeLabor(index, { crewName: event.target.value })} placeholder="VD: Tổ Thái" />
              <input type="number" min="0" value={item.headcount} onChange={(event) => changeLabor(index, { headcount: Number(event.target.value) })} />
              <input aria-label="Tính vào công nhân" type="checkbox" checked={item.countsAsWorker} onChange={(event) => changeLabor(index, { countsAsWorker: event.target.checked })} />
              <button type="button" className="icon-button" onClick={() => setLabor((items) => items.filter((_, i) => i !== index))}><Trash2 size={15} /></button>
            </div>
          ))}
        </div>
        <button className="button ghost" type="button" onClick={() => setLabor((items) => [...items, { categoryCode: "other", label: "Khác", crewName: "", headcount: 0, countsAsWorker: true }])}><Plus size={16} /> Thêm dòng nhân lực</button>
      </section>

      <section className="form-section">
        <div className="section-heading"><span>03</span><div><h3>Máy móc</h3><p>Nhập đúng số máy/xe đang bố trí trong ngày.</p></div></div>
        <div className="editable-table equipment-table">
          <div className="editable-row editable-head"><span>Thiết bị</span><span>Số lượng</span><span>Đơn vị</span><span /></div>
          {equipment.map((item, index) => <div className="editable-row" key={`${item.equipmentName}-${index}`}><input value={item.equipmentName} onChange={(event) => changeEquipment(index, { equipmentName: event.target.value })} /><input type="number" min="0" value={item.quantity} onChange={(event) => changeEquipment(index, { quantity: Number(event.target.value) })} /><input value={item.unit} onChange={(event) => changeEquipment(index, { unit: event.target.value })} /><button type="button" className="icon-button" onClick={() => setEquipment((items) => items.filter((_, i) => i !== index))}><Trash2 size={15} /></button></div>)}
        </div>
        <button className="button ghost" type="button" onClick={() => setEquipment((items) => [...items, { equipmentName: "", quantity: 0, unit: "máy" }])}><Plus size={16} /> Thêm thiết bị</button>
      </section>

      <section className="form-section">
        <div className="section-heading"><span>04</span><div><h3>Công việc trong ngày</h3><p>Tách công việc chính và công việc khác; phần tiếng Trung để trống nếu chưa có.</p></div></div>
        <div className="task-editor-stack">
          {tasks.map((item, index) => <div className="task-editor-card" key={index}><div className="task-editor-top"><select value={item.kind} onChange={(event) => changeTask(index, { kind: event.target.value as "main" | "other" })}><option value="main">Công việc chính</option><option value="other">Công việc khác</option></select><input value={item.areaLabel} onChange={(event) => changeTask(index, { areaLabel: event.target.value })} placeholder="Khu vực: Xưởng 1, Xưởng 3..." /><button type="button" className="icon-button" onClick={() => setTasks((items) => items.filter((_, i) => i !== index))}><Trash2 size={15} /></button></div><textarea rows={2} value={item.descriptionVi} onChange={(event) => changeTask(index, { descriptionVi: event.target.value })} placeholder="Nội dung công việc tiếng Việt" /><input value={item.descriptionZh} onChange={(event) => changeTask(index, { descriptionZh: event.target.value })} placeholder="中文说明（可选）" /></div>)}
        </div>
        <button className="button ghost" type="button" onClick={() => setTasks((items) => [...items, { kind: "main", areaLabel: "", descriptionVi: "", descriptionZh: "" }])}><Plus size={16} /> Thêm công việc</button>
      </section>

      <section className="form-section">
        <div className="section-heading"><span>05</span><div><h3>Ảnh thi công đại diện</h3><p>Ảnh thật lưu private trên Supabase Storage và được dùng cho báo cáo tuần.</p></div></div>
        <label className="upload-box"><UploadCloud size={30} /><strong>Chọn ảnh công trường</strong><span>JPG, PNG, WEBP, HEIC · tối đa 10 ảnh · 10 MB/ảnh</span><input type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" multiple onChange={(event) => setFiles(Array.from(event.target.files || []).filter((file) => file.type.startsWith("image/")).slice(0, 10))} /></label>
        {files.length ? <div className="selected-files">{files.map((file) => <div className="selected-file" key={`${file.name}-${file.size}`}><Camera size={16} /><span>{file.name}</span></div>)}</div> : null}
        <label className="field"><span>Chú thích ảnh</span><input value={photoCaption} onChange={(event) => setPhotoCaption(event.target.value)} placeholder="VD: Lắp dựng cốt thép dầm móng Xưởng 1" /></label>
      </section>

      {message ? <div className={message.type === "ok" ? "submit-message ok" : "submit-message error"}>{message.type === "ok" ? <CheckCircle2 size={18} /> : null}{message.text}</div> : null}
      <div className="form-actions"><button className="button primary" type="submit" disabled={loading || !leaderId}>{loading ? <><Loader2 className="spin" size={18} /> Đang lưu...</> : <><Plus size={18} /> Lưu báo cáo ngày</>}</button></div>
    </form>
  );
}
