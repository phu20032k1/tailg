import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { readSessionToken, SESSION_COOKIE } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const schema = z.object({
  materialName: z.string().trim().min(2).max(160),
  materialSpec: z.string().trim().max(120).optional().default(""),
  unit: z.string().trim().min(1).max(30),
  budgetQuantity: z.coerce.number().positive(),
  areaLabel: z.string().trim().max(160).optional().default("Toàn dự án"),
  stageLabel: z.string().trim().max(160).optional().default(""),
  allocationLevel: z.enum(["project","stage","team"]).default("project"),
  ownerTeamId: z.string().uuid().nullable().optional(),
  parentBudgetId: z.string().uuid().nullable().optional(),
  note: z.string().trim().max(500).optional().default("")
});

export async function POST(request: NextRequest) {
  const session = await readSessionToken(request.cookies.get(SESSION_COOKIE)?.value);
  if (!session) return NextResponse.json({ error: "Phiên đăng nhập đã hết hạn." }, { status: 401 });
  if (!["commander", "khkt"].includes(session.role)) return NextResponse.json({ error: "Bạn không có quyền khai báo định mức vật tư." }, { status: 403 });
  try {
    const body = schema.parse(await request.json());
    const db = getSupabaseAdmin();
    if (body.allocationLevel === "project" && body.parentBudgetId) return NextResponse.json({ error: "Định mức toàn dự án không có định mức cha." }, { status: 400 });
    if (body.allocationLevel !== "project" && !body.parentBudgetId) return NextResponse.json({ error: "Vui lòng chọn định mức cấp trên." }, { status: 400 });
    if (body.allocationLevel === "team" && !body.ownerTeamId) return NextResponse.json({ error: "Vui lòng chọn đội được giao vật tư." }, { status: 400 });

    let parent: any = null;
    if (body.parentBudgetId) {
      const { data, error } = await db.from("material_budgets").select("*").eq("id", body.parentBudgetId).eq("active", true).maybeSingle();
      if (error) throw error;
      if (!data) return NextResponse.json({ error: "Không tìm thấy định mức cấp trên." }, { status: 404 });
      parent = data;
      if (body.allocationLevel === "stage" && parent.allocation_level !== "project") return NextResponse.json({ error: "Hạng mục phải nằm dưới định mức toàn dự án." }, { status: 400 });
      if (body.allocationLevel === "team" && parent.allocation_level !== "stage") return NextResponse.json({ error: "Định mức đội phải nằm dưới một hạng mục." }, { status: 400 });
      if (String(parent.material_name).trim().toLowerCase() !== body.materialName.toLowerCase() || String(parent.unit).trim().toLowerCase() !== body.unit.toLowerCase()) return NextResponse.json({ error: "Vật tư và đơn vị phải trùng với định mức cấp trên." }, { status: 400 });
      const { data: children, error: childError } = await db.from("material_budgets").select("budget_quantity").eq("parent_budget_id", parent.id).eq("active", true);
      if (childError) throw childError;
      const allocated = (children || []).reduce((sum: number, row: any) => sum + Number(row.budget_quantity || 0), 0);
      if (allocated + body.budgetQuantity > Number(parent.budget_quantity || 0) + 0.000001) return NextResponse.json({ error: `Không thể phân bổ. Cấp trên còn ${(Number(parent.budget_quantity || 0) - allocated).toLocaleString("vi-VN")} ${parent.unit}.` }, { status: 409 });
    }

    let teamName = "";
    if (body.ownerTeamId) {
      const { data: team, error } = await db.from("app_users").select("id,full_name,role").eq("id", body.ownerTeamId).eq("active", true).maybeSingle();
      if (error) throw error;
      if (!team || team.role !== "leader") return NextResponse.json({ error: "Đội được giao không hợp lệ." }, { status: 400 });
      teamName = team.full_name;
    }

    const payload = {
      material_name: body.materialName,
      material_spec: body.materialSpec || null,
      unit: body.unit,
      budget_quantity: body.budgetQuantity,
      area_label: body.areaLabel || "Toàn dự án",
      stage_label: body.stageLabel || null,
      allocation_level: body.allocationLevel,
      owner_team_id: body.ownerTeamId || null,
      parent_budget_id: body.parentBudgetId || null,
      contractor_name: body.allocationLevel === "team" ? teamName : "",
      note: body.note || null,
      source_label: "Hệ thống TAILG",
      active: true,
      updated_at: new Date().toISOString()
    };
    const { data, error } = await db.from("material_budgets").insert(payload).select("*").single();
    if (error) throw error;
    return NextResponse.json({ ok: true, material: data }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Thông tin định mức chưa hợp lệ." }, { status: 400 });
    console.error("material budget", error);
    return NextResponse.json({ error: "Chưa thể lưu định mức vật tư." }, { status: 500 });
  }
}
