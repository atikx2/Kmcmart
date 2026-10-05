import crypto from "crypto";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { customers, type Customer } from "@/db/schema";

const SECRET = process.env.AUTH_SECRET || "kmcbazarbd-dev-secret-change-in-production";
const COOKIE_NAME = "kmc_session";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const test = crypto.scryptSync(password, salt, 64);
  const ref = Buffer.from(hash, "hex");
  return test.length === ref.length && crypto.timingSafeEqual(test, ref);
}

function sign(data: string): string {
  return crypto.createHmac("sha256", SECRET).update(data).digest("base64url");
}

export function createToken(customerId: number): string {
  const payload = Buffer.from(
    JSON.stringify({ sub: customerId, exp: Date.now() + MAX_AGE * 1000 })
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function parseToken(token?: string | null): number | null {
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

export async function setSession(customerId: number) {
  const jar = await cookies();
  jar.set(COOKIE_NAME, createToken(customerId), {
    httpOnly: true,
    sameSite: "lax",
    maxAge: MAX_AGE,
    path: "/",
  });
}

export async function clearSession() {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}

export async function getSessionCustomer(): Promise<Customer | null> {
  const jar = await cookies();
  const id = parseToken(jar.get(COOKIE_NAME)?.value);
  if (!id) return null;
  const rows = await db.select().from(customers).where(eq(customers.id, id)).limit(1);
  return rows[0] ?? null;
}
