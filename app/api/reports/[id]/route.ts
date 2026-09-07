import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { readSessionToken, SESSION_COOKIE } from "@/lib/auth";
import { getSupabaseAdmin, STORAGE_BUCKET } from "@/lib/supabase/admin";

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

const updateSchema = z.object({
  reportDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  rawMessage: z.string().max(20000).optional().default(""),
  issueText: z.string().max(2000).optional().default(""),
  labor: z.array(laborSchema).max(50),
  equipment: z.array(equipmentSchema).max(50),
  tasks: z.array(taskSchema).max(100)
});

async function getAuthorizedReport(request: NextRequest, id: string) {
  const session = await readSessionToken(request.cookies.get(SESSION_COOKIE)?.value);
  if (!session) return { response: NextResponse.json({ ok: false, error: "Phiên đăng nhập đã hết hạn." }, { status: 401 }) };

  const db = getSupabaseAdmin();
  const { data: report, error } = await db
    .from("daily_reports")
    .select("id,leader_id,report_date")
    .eq("id", id)
    .maybeSingle();

  if (error) return { response: NextResponse.json({ ok: false, error: "Không đọc được báo cáo." }, { status: 500 }) };
  if (!report) return { response: NextResponse.json({ ok: false, error: "Báo cáo không còn tồn tại." }, { status: 404 }) };
  if (session.role === "leader" && report.leader_id !== session.id) {
    return { response: NextResponse.json({ ok: false, error: "Bạn không có quyền thay đổi báo cáo này." }, { status: 403 }) };
  }

  return { session, db, report };
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const auth = await getAuthorizedReport(request, id);
  if ("response" in auth) return auth.response;

  try {
    const body = updateSchema.parse(await request.json());
    const { db, report } = auth;

    if (body.reportDate !== report.report_date) {
      const { data: duplicate } = await db
        .from("daily_reports")
        .select("id")
        .eq("leader_id", report.leader_id)
        .eq("report_date", body.reportDate)
        .neq("id", id)
        .maybeSingle();
      if (duplicate) {
        return NextResponse.json({ ok: false, error: "Đội này đã có báo cáo ở ngày đã chọn." }, { status: 409 });
      }
    }

    const workers = body.labor.reduce((sum, item) => sum + (item.countsAsWorker ? item.headcount : 0), 0);
    const technicalStaff = body.labor
      .filter((item) => item.categoryCode.toLowerCase() === "technical")
      .reduce((sum, item) => sum + item.headcount, 0);

    const { error: reportError } = await db
      .from("daily_reports")
      .update({
        report_date: body.reportDate,
        workers,
        technical_staff: technicalStaff,
        issue_text: body.issueText.trim() || null,
        raw_message: body.rawMessage.trim() || null,
        updated_at: new Date().toISOString()
      })
      .eq("id", id);
    if (reportError) throw reportError;

    const deletes = await Promise.all([
      db.from("report_labor_entries").delete().eq("report_id", id),
      db.from("report_equipment_entries").delete().eq("report_id", id),
      db.from("report_tasks").delete().eq("report_id", id)
    ]);
    const deleteError = deletes.find((result) => result.error)?.error;
    if (deleteError) throw deleteError;

    if (body.labor.length) {
      const { error } = await db.from("report_labor_entries").insert(
        body.labor.map((item) => ({
          report_id: id,
          category_code: item.categoryCode.toLowerCase(),
          label: item.label,
          crew_name: item.crewName || null,
          headcount: item.headcount,
          counts_as_worker: item.countsAsWorker,
          sort_order: item.sortOrder
        }))
      );
      if (error) throw error;
    }

    if (body.equipment.length) {
      const { error } = await db.from("report_equipment_entries").insert(
        body.equipment.map((item) => ({
          report_id: id,
          equipment_name: item.equipmentName,
          quantity: item.quantity,
          unit: item.unit,
          note: item.note || null,
          sort_order: item.sortOrder
        }))
      );
      if (error) throw error;
    }

    if (body.tasks.length) {
      const { error } = await db.from("report_tasks").insert(
        body.tasks.map((item) => ({
          report_id: id,
          kind: item.kind,
          area_label: item.areaLabel || null,
          description_vi: item.descriptionVi,
          description_zh: item.descriptionZh || null,
          sort_order: item.sortOrder
        }))
      );
      if (error) throw error;
    }

    return NextResponse.json({ ok: true, workers, technicalStaff });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ ok: false, error: "Dữ liệu cần sửa chưa hợp lệ." }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ ok: false, error: "Chưa thể cập nhật báo cáo." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const auth = await getAuthorizedReport(request, id);
  if ("response" in auth) return auth.response;

  try {
    const { db } = auth;
    const { data: photos } = await db.from("report_photos").select("storage_path").eq("report_id", id);
    const paths = (photos || []).map((photo) => photo.storage_path).filter(Boolean);
    if (paths.length) await db.storage.from(STORAGE_BUCKET).remove(paths);

    const { error } = await db.from("daily_reports").delete().eq("id", id);
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ ok: false, error: "Chưa thể xóa báo cáo." }, { status: 500 });
  }
}
