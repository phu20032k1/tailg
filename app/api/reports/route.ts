import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { readSessionToken, SESSION_COOKIE } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const reportSchema = z.object({
  reportDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  leaderId: z.string().uuid().optional(),
  workers: z.coerce.number().int().min(0).max(9999),
  technicalStaff: z.coerce.number().int().min(0).max(999),
  zoneId: z.string().min(2).max(80),
  stage: z.string().trim().min(2).max(120),
  foundationCodes: z.array(z.string().trim().min(1).max(50)).min(1).max(100),
  progress: z.coerce.number().min(0).max(100),
  quantity: z.coerce.number().min(0).max(100000).default(0),
  unit: z.string().trim().min(1).max(30).default("móng"),
  note: z.string().trim().max(2000).optional().default(""),
  issueText: z.string().trim().max(2000).optional().default("")
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
      return NextResponse.json(
        { ok: false, error: "Chỉ huy trưởng cần chọn đội trưởng." },
        { status: 400 }
      );
    }

    const normalizedCodes = [
      ...new Set(body.foundationCodes.map((code) => code.trim().toUpperCase()).filter(Boolean))
    ];

    const db = getSupabaseAdmin();
    const { data, error } = await db.rpc("create_work_entry", {
      p_report_date: body.reportDate,
      p_leader_id: leaderId,
      p_workers: body.workers,
      p_technical_staff: body.technicalStaff,
      p_zone_id: body.zoneId,
      p_stage: body.stage,
      p_foundation_codes: normalizedCodes,
      p_progress: body.progress,
      p_quantity: body.quantity,
      p_unit: body.unit,
      p_note: body.note || null,
      p_issue_text: body.issueText || null
    });

    if (error) {
      const message = error.message || "";
      if (message.includes("FOUNDATION_OWNER_CONFLICT")) {
        const code = message.split(":").pop()?.trim();
        return NextResponse.json(
          { ok: false, error: `Móng ${code || ""} đã thuộc đội khác. Không thể nhập trùng.` },
          { status: 409 }
        );
      }
      if (message.includes("ZONE_NOT_ASSIGNED")) {
        return NextResponse.json(
          { ok: false, error: "Khu vực này không thuộc đội đã chọn." },
          { status: 403 }
        );
      }
      console.error("create_work_entry:", error);
      return NextResponse.json(
        { ok: false, error: "Không lưu được báo cáo." },
        { status: 500 }
      );
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
