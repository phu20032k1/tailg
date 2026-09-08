import "server-only";
import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import type { Role, SessionUser } from "@/lib/types";

export const SESSION_COOKIE = "tailg_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;
const ALLOWED_ROLES = new Set<Role>(["commander", "leader", "khkt", "director", "finance"]);

function clean(raw: string | undefined) {
  let value = (raw || "").trim();
  if (!value) return "";
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1).trim();
  }
  return value;
}

export function getSessionSecretSource(): "SESSION_SECRET" | "SUPABASE_SECRET_KEY" | "missing" {
  const explicit = clean(process.env.SESSION_SECRET);
  if (explicit.length >= 32) return "SESSION_SECRET";
  const supabaseSecret = clean(process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (supabaseSecret.length >= 32) return "SUPABASE_SECRET_KEY";
  return "missing";
}

function secret() {
  const explicit = clean(process.env.SESSION_SECRET);
  if (explicit.length >= 32) return new TextEncoder().encode(explicit);
  const supabaseSecret = clean(process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (supabaseSecret.length >= 32) {
    const derived = createHash("sha256").update(`tailg-session-v1:${supabaseSecret}`).digest();
    return new Uint8Array(derived);
  }
  throw new Error("Missing session signing secret. Set SESSION_SECRET or SUPABASE_SECRET_KEY.");
}

export async function createSessionToken(user: SessionUser) {
  return new SignJWT({ username: user.username, fullName: user.fullName, role: user.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(secret());
}

export async function readSessionToken(token?: string | null): Promise<SessionUser | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (!payload.sub || typeof payload.username !== "string" || typeof payload.fullName !== "string" || typeof payload.role !== "string") return null;
    if (!ALLOWED_ROLES.has(payload.role as Role)) return null;
    return { id: payload.sub, username: payload.username, fullName: payload.fullName, role: payload.role as Role };
  } catch {
    return null;
  }
}

export async function getCurrentUser() {
  const store = await cookies();
  return readSessionToken(store.get(SESSION_COOKIE)?.value);
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireCommander() {
  const user = await requireUser();
  if (user.role !== "commander") redirect("/");
  return user;
}

export async function requireCommercialUser() {
  const user = await requireUser();
  if (!["commander", "khkt", "director", "finance"].includes(user.role)) redirect("/");
  return user;
}

export async function requireRole(roles: Role[]) {
  const user = await requireUser();
  if (!roles.includes(user.role)) redirect("/");
  return user;
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: SESSION_TTL_SECONDS
};