import { NextResponse } from "next/server";
import { getSupabaseAdmin, STORAGE_BUCKET } from "@/lib/supabase/admin";

export async function GET() {
  const config = {
    supabaseUrl: Boolean(process.env.SUPABASE_URL),
    supabaseSecret: Boolean(
      process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
    ),
    sessionSecret: Boolean(process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 32),
    storageBucket: STORAGE_BUCKET
  };

  try {
    const db = getSupabaseAdmin();
    const { count, error: dbError } = await db
      .from("app_users")
      .select("id", { head: true, count: "exact" });

    if (dbError) throw dbError;

    const { data: buckets, error: storageError } = await db.storage.listBuckets();
    if (storageError) throw storageError;

    return NextResponse.json({
      ok: config.sessionSecret,
      database: "connected",
      users: count ?? 0,
      storage: buckets.some((bucket) => bucket.id === STORAGE_BUCKET)
        ? "connected"
        : `bucket ${STORAGE_BUCKET} missing`,
      config
    }, { status: config.sessionSecret ? 200 : 500 });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown health check error",
        config
      },
      { status: 500 }
    );
  }
}
