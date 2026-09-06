import { NextResponse } from "next/server";
import { getSupabaseAdmin, STORAGE_BUCKET } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const db = getSupabaseAdmin();
    const { error: dbError } = await db
      .from("app_users")
      .select("id", { head: true, count: "exact" });

    if (dbError) throw dbError;

    const { data: buckets, error: storageError } = await db.storage.listBuckets();
    if (storageError) throw storageError;

    return NextResponse.json({
      ok: true,
      database: "connected",
      storage: buckets.some((bucket) => bucket.id === STORAGE_BUCKET)
        ? "connected"
        : `bucket ${STORAGE_BUCKET} missing`
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown health check error"
      },
      { status: 500 }
    );
  }
}
