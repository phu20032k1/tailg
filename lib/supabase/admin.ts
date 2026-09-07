import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

function cleanEnvValue(raw: string | undefined, key: string) {
  let value = (raw || "").trim();
  if (!value) return "";

  // Be forgiving if a value was pasted as KEY=value or wrapped in quotes.
  if (value.startsWith(`${key}=`)) value = value.slice(key.length + 1).trim();
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1).trim();
  }
  return value;
}

export function getSupabaseConfig() {
  const rawUrl = cleanEnvValue(
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_URL ? "SUPABASE_URL" : "NEXT_PUBLIC_SUPABASE_URL"
  );
  const secretKey = cleanEnvValue(
    process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY,
    process.env.SUPABASE_SECRET_KEY ? "SUPABASE_SECRET_KEY" : "SUPABASE_SERVICE_ROLE_KEY"
  );

  if (!rawUrl || !secretKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SECRET_KEY.");
  }

  let parsed: URL;
  try {
    parsed = new URL(rawUrl.includes("://") ? rawUrl : `https://${rawUrl}`);
  } catch {
    throw new Error("SUPABASE_URL is invalid. It must look like https://<project-ref>.supabase.co");
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error("SUPABASE_URL is invalid. It must start with https://");
  }

  // Supabase client needs the project origin, not /rest/v1, /auth/v1 or a DB connection string path.
  const url = parsed.origin;

  if (!parsed.hostname.endsWith(".supabase.co") && !parsed.hostname.endsWith(".supabase.net") && parsed.hostname !== "localhost") {
    throw new Error("SUPABASE_URL host is invalid. Copy the Project URL from Supabase Settings → API.");
  }

  return { url, secretKey };
}

export function getSupabaseAdmin() {
  if (client) return client;

  const { url, secretKey } = getSupabaseConfig();

  client = createClient(url, secretKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });

  return client;
}

export const STORAGE_BUCKET = cleanEnvValue(
  process.env.SUPABASE_STORAGE_BUCKET,
  "SUPABASE_STORAGE_BUCKET"
) || "site-photos";
