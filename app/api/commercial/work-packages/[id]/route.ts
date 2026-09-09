import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { readSessionToken, SESSION_COOKIE } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const schema = z.object({
  plannedStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  plannedFinish: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  notes: z.string().trim().max(1000).nullable().optional(),
  assigneeIds: z.array(z.string().uuid()).max(20).optional(),
  customFields: z.record(z.string(), z.string()).optional()
});

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = await readSessionToken(request.cookies.get(SESSION_COOKIE)?.value);
  if (!session) return NextResponse.json({ error: "Phiên đăng nhập đã hết hạn." }, { status: 401 });
  if (!["commander", "khkt"].includes(session.role)) return NextResponse.json({ error: "Bạn không có quyền sửa kế hoạch tiến độ." }, { status: 403 });
  try {
    const { id } = await context.params;
    const body = schema.parse(await request.json());
    const db = getSupabaseAdmin();
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.plannedStart !== undefined) patch.planned_start = body.plannedStart;
    if (body.plannedFinish !== undefined) patch.planned_finish = body.plannedFinish;
    if (body.notes !== undefined) patch.notes = body.notes || null;
    if (body.customFields !== undefined) patch.custom_fields = body.customFields;
    const { data, error } = await db.from("work_packages").update(patch).eq("id", id).select("*").maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: "Không tìm thấy đầu mục." }, { status: 404 });
    if (body.assigneeIds) {
      const { error: delError } = await db.from("work_package_assignees").delete().eq("work_package_id", id);
      if (delError) throw delError;
      if (body.assigneeIds.length) {
        const { error: insError } = await db.from("work_package_assignees").insert(body.assigneeIds.map((userId) => ({ work_package_id: id, user_id: userId })));
        if (insError) throw insError;
      }
    }
    return NextResponse.json({ ok: true, workPackage: data });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Dữ liệu kế hoạch chưa hợp lệ." }, { status: 400 });
    console.error("edit work package", error);
    return NextResponse.json({ error: "Chưa thể cập nhật kế hoạch." }, { status: 500 });
  }
}
