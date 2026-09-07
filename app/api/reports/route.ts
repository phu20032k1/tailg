import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { readSessionToken, SESSION_COOKIE } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const laborSchema = z.object({
  categoryCode: z.string().trim().min(1).max(60),
  label: z.string().trim().min(1).max(120),
  crewName: z.string().trim().max(120).optional().default(""),
  headcount: z.coerce.number().int().min(0).max(9999),
  countsAsWorker: z.boolean().default(false),
  sortOrder: z.coerce.number().int().min(0).max(9999).default(0)
});

const equipmentSchema = z.object({
  equipmentName: z.string().trim().min(1).max(120),
  quantity: z.coerce.number().int().min(0).max(999),
  unit: z.string().trim().min(1).max(30).default("máy"),
  note: z.string().trim().max(300).optional().default(""),
  sortOrder: z.coerce.number().int().min(0).max(9999).default(0)
});

const taskSchema = z.object({
  kind: z.enum(["main", "other"]),
  areaLabel: z.string().trim().max(180).optional().default(""),
  descriptionVi: z.string().trim().min(2).max(2000),
  descriptionZh: z.string().trim().max(2000).optional().default(""),
  sortOrder: z.coerce.number().int().min(0).max(9999).default(0)
});

const reportSchema = z.object({
  reportDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  leaderId: z.string().uuid().optional(),
  rawMessage: z.string().max(20000).optional().default(""),
  issueText: z.string().max(2000).optional().default(""),
  labor: z.array(laborSchema).max(50),
  equipment: z.array(equipmentSchema).max(50),
  tasks: z.array(taskSchema).max(100)
});

export async function POST(request: NextRequest) {
  const session = await readSessionToken(request.cookies.get(SESSION_COOKIE)?.value);
  if (!session) {
    return NextResponse.json({ ok: false, error: "Phiên đăng nhập đã hết hạn." }, { status: 401 });
  }

  try {
    const body = reportSchema.parse(await request.json());
    const leaderId = session.role === "leader" ? session.id : body.leaderId;
    if (!leaderId) {
      return NextResponse.json({ ok: false, error: "Chỉ huy trưởng cần chọn đội thi công." }, { status: 400 });
    }

    const db = getSupabaseAdmin();
    const { data, error } = await db.rpc("save_daily_report_v3", {
      p_report_date: body.reportDate,
      p_leader_id: leaderId,
      p_raw_message: body.rawMessage || null,
      p_issue_text: body.issueText || null,
      p_labor: body.labor.map((item) => ({
        category_code: item.categoryCode,
        label: item.label,
        crew_name: item.crewName || null,
        headcount: item.headcount,
        counts_as_worker: item.countsAsWorker,
        sort_order: item.sortOrder
      })),
      p_equipment: body.equipment.map((item) => ({
        equipment_name: item.equipmentName,
        quantity: item.quantity,
        unit: item.unit,
        note: item.note || null,
        sort_order: item.sortOrder
      })),
      p_tasks: body.tasks.map((item) => ({
        kind: item.kind,
        area_label: item.areaLabel || null,
        description_vi: item.descriptionVi,
        description_zh: item.descriptionZh || null,
        sort_order: item.sortOrder
      }))
    });

    if (error) {
      console.error("save_daily_report_v3:", error);
      const message = error.message || "";
      if (message.includes("INVALID_LEADER")) {
        return NextResponse.json({ ok: false, error: "Tài khoản đội trưởng không hợp lệ." }, { status: 400 });
      }
      if (message.includes("save_daily_report_v3")) {
        return NextResponse.json({ ok: false, error: "Database chưa chạy migration V3." }, { status: 503 });
      }
      return NextResponse.json({ ok: false, error: "Không lưu được báo cáo." }, { status: 500 });
    }

    return NextResponse.json({ ok: true, result: data }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { ok: false, error: "Dữ liệu báo cáo chưa hợp lệ.", details: error.issues },
        { status: 400 }
      );
    }
    console.error(error);
    return NextResponse.json({ ok: false, error: "Lỗi hệ thống." }, { status: 500 });
  }
}
