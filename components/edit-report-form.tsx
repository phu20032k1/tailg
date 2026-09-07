"use client";

import { FormEvent, useMemo, useState } from "react";
import { CheckCircle2, Loader2, Plus, Save, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";

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
  note?: string;
};

type TaskEntry = {
  kind: "main" | "other";
  areaLabel: string;
  descriptionVi: string;
  descriptionZh: string;
};

type EditReport = {
  id: string;
  reportDate: string;
  rawMessage: string;
  issueText: string;
  labor: LaborEntry[];
  equipment: EquipmentEntry[];
  tasks: TaskEntry[];
};

const LABOR_OPTIONS = [
  ["technical", "Kỹ thuật", false],
  ["machine_operator", "Lái máy", false],
  ["security", "Bảo vệ", false],
  ["survey", "Trắc địa", false],
  ["day_labor", "Công nhật", true],
  ["rebar", "Cốt thép", true],
  ["formwork", "Cốp pha / ván khuôn", true],
  ["other", "Khác", true]
] as const;

export function EditReportForm({ report }: { report: EditReport }) {
  const router = useRouter();
  const [reportDate, setReportDate] = useState(report.reportDate);
  const [rawMessage, setRawMessage] = useState(report.rawMessage);
  const [issueText, setIssueText] = useState(report.issueText);
  const [labor, setLabor] = useState<LaborEntry[]>(report.labor);
  const [equipment, setEquipment] = useState<EquipmentEntry[]>(report.equipment);
  const [tasks, setTasks] = useState<TaskEntry[]>(report.tasks);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<{ type: "ok" | "error"; title: string; text?: string } | null>(null);

  const workers = useMemo(() => labor.reduce((sum, item) => sum + (item.countsAsWorker ? Number(item.headcount || 0) : 0), 0), [labor]);
  const technical = useMemo(() => labor.filter((item) => item.categoryCode === "technical").reduce((sum, item) => sum + Number(item.headcount || 0), 0), [labor]);

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
    setNotice(null);
    try {
      const response = await fetch(`/api/reports/${report.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          reportDate,
          rawMessage,
          issueText,
          labor: labor.filter((item) => item.label.trim()).map((item, index) => ({ ...item, headcount: Number(item.headcount || 0), sortOrder: (index + 1) * 10 })),
          equipment: equipment.filter((item) => item.equipmentName.trim()).map((item, index) => ({ ...item, quantity: Number(item.quantity || 0), sortOrder: (index + 1) * 10 })),
          tasks: tasks.filter((item) => item.descriptionVi.trim()).map((item, index) => ({ ...item, sortOrder: (index + 1) * 10 }))
        })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Chưa thể lưu thay đổi.");
      setNotice({ type: "ok", title: "Đã cập nhật báo cáo", text: `${workers} công nhân · ${technical} kỹ thuật` });
      router.refresh();
      window.setTimeout(() => router.push("/reports"), 900);
    } catch (error) {
      setNotice({ type: "error", title: "Chưa lưu được thay đổi", text: error instanceof Error ? error.message : "Vui lòng thử lại." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <form className="report-form edit-report-form" onSubmit={submit}>
        <section className="form-section">
          <div className="section-heading"><span>01</span><div><h3>Ngày báo cáo</h3></div></div>
          <div className="form-grid two">
            <label className="field"><span>Ngày</span><input type="date" value={reportDate} onChange={(event) => setReportDate(event.target.value)} required /></label>
            <div className="edit-summary"><span>Công nhân</span><strong>{workers}</strong><span>Kỹ thuật</span><strong>{technical}</strong></div>
          </div>
        </section>

        <section className="form-section">
          <div className="section-heading"><span>02</span><div><h3>Nhân lực</h3></div></div>
          <div className="editable-table labor-table">
            <div className="editable-row editable-head"><span>Nhóm</span><span>Tổ / phụ trách</span><span>SL</span><span>Tính CN</span><span /></div>
            {labor.map((item, index) => (
              <div className="editable-row" key={`${item.categoryCode}-${index}`}>
                <select value={item.categoryCode} onChange={(event) => { const option = LABOR_OPTIONS.find(([code]) => code === event.target.value); changeLabor(index, { categoryCode: event.target.value, label: option?.[1] || "Khác", countsAsWorker: option?.[2] ?? true }); }}>{LABOR_OPTIONS.map(([code, label]) => <option key={code} value={code}>{label}</option>)}</select>
                <input value={item.crewName} onChange={(event) => changeLabor(index, { crewName: event.target.value })} placeholder="Tổ / người phụ trách" />
                <input type="number" min="0" value={item.headcount} onChange={(event) => changeLabor(index, { headcount: Number(event.target.value) })} />
                <input aria-label="Tính vào công nhân" type="checkbox" checked={item.countsAsWorker} onChange={(event) => changeLabor(index, { countsAsWorker: event.target.checked })} />
                <button type="button" className="icon-button" onClick={() => setLabor((items) => items.filter((_, i) => i !== index))}><Trash2 size={15} /></button>
              </div>
            ))}
          </div>
          <button className="button ghost" type="button" onClick={() => setLabor((items) => [...items, { categoryCode: "other", label: "Khác", crewName: "", headcount: 0, countsAsWorker: true }])}><Plus size={16} /> Thêm nhân lực</button>
        </section>

        <section className="form-section">
          <div className="section-heading"><span>03</span><div><h3>Máy móc</h3></div></div>
          <div className="editable-table equipment-table">
            <div className="editable-row editable-head"><span>Thiết bị</span><span>Số lượng</span><span>Đơn vị</span><span /></div>
            {equipment.map((item, index) => <div className="editable-row" key={`${item.equipmentName}-${index}`}><input value={item.equipmentName} onChange={(event) => changeEquipment(index, { equipmentName: event.target.value })} placeholder="Tên thiết bị" /><input type="number" min="0" value={item.quantity} onChange={(event) => changeEquipment(index, { quantity: Number(event.target.value) })} /><input value={item.unit} onChange={(event) => changeEquipment(index, { unit: event.target.value })} /><button type="button" className="icon-button" onClick={() => setEquipment((items) => items.filter((_, i) => i !== index))}><Trash2 size={15} /></button></div>)}
          </div>
          <button className="button ghost" type="button" onClick={() => setEquipment((items) => [...items, { equipmentName: "", quantity: 0, unit: "máy" }])}><Plus size={16} /> Thêm thiết bị</button>
        </section>

        <section className="form-section">
          <div className="section-heading"><span>04</span><div><h3>Công việc trong ngày</h3></div></div>
          <div className="task-editor-stack">
            {tasks.map((item, index) => <div className="task-editor-card" key={index}><div className="task-editor-top"><select value={item.kind} onChange={(event) => changeTask(index, { kind: event.target.value as "main" | "other" })}><option value="main">Công việc chính</option><option value="other">Công việc khác</option></select><input value={item.areaLabel} onChange={(event) => changeTask(index, { areaLabel: event.target.value })} placeholder="Khu vực" /><button type="button" className="icon-button" onClick={() => setTasks((items) => items.filter((_, i) => i !== index))}><Trash2 size={15} /></button></div><textarea rows={3} value={item.descriptionVi} onChange={(event) => changeTask(index, { descriptionVi: event.target.value })} placeholder="Nội dung công việc" />{item.descriptionZh ? <input value={item.descriptionZh} onChange={(event) => changeTask(index, { descriptionZh: event.target.value })} placeholder="Nội dung bổ sung" /> : null}</div>)}
          </div>
          <button className="button ghost" type="button" onClick={() => setTasks((items) => [...items, { kind: "main", areaLabel: "", descriptionVi: "", descriptionZh: "" }])}><Plus size={16} /> Thêm công việc</button>
        </section>

        <section className="form-section">
          <div className="section-heading"><span>05</span><div><h3>Nội dung bổ sung</h3></div></div>
          <label className="field"><span>Vướng mắc</span><textarea rows={3} value={issueText} onChange={(event) => setIssueText(event.target.value)} placeholder="Vướng mắc trong ngày nếu có" /></label>
          <label className="field"><span>Tin nhắn báo cáo gốc</span><textarea rows={7} value={rawMessage} onChange={(event) => setRawMessage(event.target.value)} /></label>
        </section>

        <div className="form-actions edit-form-actions">
          <button className="button secondary" type="button" onClick={() => router.push("/reports")} disabled={loading}>Hủy</button>
          <button className="button primary" type="submit" disabled={loading}>{loading ? <><Loader2 className="spin" size={18} /> Đang lưu...</> : <><Save size={18} /> Lưu thay đổi</>}</button>
        </div>
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
