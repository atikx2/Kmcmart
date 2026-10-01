import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { admins } from "@/db/schema";
import { setAdminSession, verifyPassword } from "@/lib/admin-auth";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return Response.json({ error: "Email and password are required" }, { status: 400 });
    }

    const rows = await db
      .select()
      .from(admins)
      .where(eq(admins.email, String(email).trim().toLowerCase()))
      .limit(1);

    const admin = rows[0];
    if (!admin || !verifyPassword(password, admin.passwordHash)) {
      return Response.json({ error: "Invalid email or password" }, { status: 401 });
    }

    await setAdminSession(admin.id);
    return Response.json({ ok: true });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Login failed" }, { status: 500 });
  }
}
