import { NextResponse } from "next/server";
import { getSessionSecretSource } from "@/lib/auth";
import {
  ensureStorageBucket,
  getSupabaseAdmin,
  getSupabaseConfig,
  STORAGE_BUCKET
} from "@/lib/supabase/admin";

export async function GET() {
  let resolvedSupabaseOrigin: string | null = null;
  let sessionSecretSource: ReturnType<typeof getSessionSecretSource> = "missing";

  try {
    const { url } = getSupabaseConfig();
    resolvedSupabaseOrigin = url;
    sessionSecretSource = getSessionSecretSource();

    const db = getSupabaseAdmin();
    const { count, error: dbError } = await db
      .from("app_users")
      .select("id", { head: true, count: "exact" });

    if (dbError) throw dbError;

    await ensureStorageBucket();
    const sessionReady = sessionSecretSource !== "missing";

    return NextResponse.json(
      {
        ok: sessionReady,
        database: "connected",
        users: count ?? 0,
        storage: "connected",
        config: {
          supabaseUrl: true,
          supabaseSecret: true,
          resolvedSupabaseOrigin,
          sessionSecret: sessionReady,
          sessionSecretSource,
          storageBucket: STORAGE_BUCKET
        }
      },
      { status: sessionReady ? 200 : 500 }
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
