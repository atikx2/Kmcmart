import crypto from "crypto";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { admins, type Admin } from "@/db/schema";
import { hashPassword, verifyPassword } from "@/lib/auth";

export { hashPassword, verifyPassword };

const SECRET = `${process.env.AUTH_SECRET || "kmcmartbd-dev-secret"}::admin`;
const COOKIE_NAME = "kmc_admin_session";
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

function sign(data: string): string {
  return crypto.createHmac("sha256", SECRET).update(data).digest("base64url");
}

export function createAdminToken(adminId: number): string {
  const payload = Buffer.from(
    JSON.stringify({ sub: adminId, exp: Date.now() + MAX_AGE * 1000 })
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function parseAdminToken(token?: string | null): number | null {
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig || sign(payload) !== sig) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      sub: number;
      exp: number;
    };
    if (data.exp < Date.now()) return null;
    return data.sub;
  } catch {
    return null;
  }
}

export async function setAdminSession(adminId: number) {
  const jar = await cookies();
  jar.set(COOKIE_NAME, createAdminToken(adminId), {
    httpOnly: true,
    sameSite: "lax",
    maxAge: MAX_AGE,
    path: "/",
  });
}

export async function clearAdminSession() {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}

export async function getSessionAdmin(): Promise<Admin | null> {
  const jar = await cookies();
  const id = parseAdminToken(jar.get(COOKIE_NAME)?.value);
  if (!id) return null;
  const rows = await db.select().from(admins).where(eq(admins.id, id)).limit(1);
  return rows[0] ?? null;
}
