import { NextResponse } from "next/server";
import { getSessionSecretSource } from "@/lib/auth";
import {
  ensureStorageBucket,
  getSupabaseAdmin,
  getSupabaseConfig,
  STORAGE_BUCKET
} from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EXPECTED_USERS = ["tung", "duc", "toan", "toan-tran", "tuan", "quang", "tho"];

async function tableExists(table: string) {
  const db = getSupabaseAdmin();
  const { error } = await db.from(table).select("*", { head: true, count: "exact" }).limit(1);
  return { ok: !error, error: error?.message || null };
}

export async function GET() {
  let resolvedSupabaseOrigin: string | null = null;
  const sessionSecretSource = getSessionSecretSource();

  try {
    const { url } = getSupabaseConfig();
    resolvedSupabaseOrigin = url;
    const db = getSupabaseAdmin();

    const { data: users, error: usersError } = await db
      .from("app_users")
      .select("username,role,active")
      .eq("active", true)
      .order("username");
    if (usersError) throw usersError;

    const usernames = (users || []).map((item) => String(item.username));
    const missingUsers = EXPECTED_USERS.filter((username) => !usernames.includes(username));

    const { error: authRpcError } = await db.rpc("authenticate_user", {
      p_username: "__tailg_health_check__",
      p_pin: "__not_a_real_pin__"
    });

    const [dailyReports, labor, equipment, tasks, weeklyAssets] = await Promise.all([
      tableExists("daily_reports"),
      tableExists("report_labor_entries"),
      tableExists("report_equipment_entries"),
      tableExists("report_tasks"),
      tableExists("weekly_report_assets")
    ]);

    let storage = "connected";
    let storageError: string | null = null;
    try {
      await ensureStorageBucket();
    } catch (error) {
      storage = "error";
      storageError = error instanceof Error ? error.message : "Storage error";
    }

    const sessionReady = sessionSecretSource !== "missing";
    const authRpcReady = !authRpcError;
    const baseSchemaReady = dailyReports.ok;
    const v3SchemaReady = labor.ok && equipment.ok && tasks.ok && weeklyAssets.ok;
    const usersReady = missingUsers.length === 0;
    const storageReady = storage === "connected";
    const ok = sessionReady && authRpcReady && baseSchemaReady && usersReady && storageReady;

    return NextResponse.json(
      {
        ok,
        database: "connected",
        users: usernames.length,
        expectedUsers: EXPECTED_USERS.length,
        missingUsers,
        authRpc: authRpcReady ? "connected" : "missing-or-broken",
        authRpcError: authRpcError?.message || null,
        storage,
        storageError,
        schema: {
          dailyReports: dailyReports.ok,
          labor: labor.ok,
          equipment: equipment.ok,
          tasks: tasks.ok,
          weeklyAssets: weeklyAssets.ok,
          v3Ready: v3SchemaReady
        },
        config: {
          supabaseUrl: true,
          supabaseSecret: true,
          resolvedSupabaseOrigin,
          sessionSecret: sessionReady,
          sessionSecretSource,
          storageBucket: STORAGE_BUCKET
        }
      },
      { status: ok ? 200 : 503 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown health check error",
        config: {
          supabaseUrl: Boolean(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL),
          supabaseSecret: Boolean(
            process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
          ),
          resolvedSupabaseOrigin,
          sessionSecret: getSessionSecretSource() !== "missing",
          sessionSecretSource: getSessionSecretSource(),
          storageBucket: STORAGE_BUCKET
        }
      },
      { status: 500 }
    );
  }
}
