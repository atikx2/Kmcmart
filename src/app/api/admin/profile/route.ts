import { NextRequest } from "next/server";
import { and, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { admins } from "@/db/schema";
import { getSessionAdmin, hashPassword, verifyPassword } from "@/lib/admin-auth";

export async function PUT(req: NextRequest) {
  try {
    const admin = await getSessionAdmin();
    if (!admin) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { mode, email, currentPassword, newPassword } = body as {
      mode?: "email" | "password";
      email?: string;
      currentPassword?: string;
      newPassword?: string;
    };

    if (!currentPassword || !verifyPassword(currentPassword, admin.passwordHash)) {
      return Response.json({ error: "Current password is incorrect" }, { status: 403 });
    }

    if (mode === "email") {
      const clean = (email ?? "").trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
        return Response.json({ error: "Enter a valid email address" }, { status: 400 });
      }
      const taken = await db
        .select({ id: admins.id })
        .from(admins)
        .where(and(eq(admins.email, clean), ne(admins.id, admin.id)))
        .limit(1);
      if (taken[0]) {
        return Response.json({ error: "This email is already in use" }, { status: 409 });
      }
      await db.update(admins).set({ email: clean }).where(eq(admins.id, admin.id));
      return Response.json({ ok: true });
    }

    if (mode === "password") {
      if (!newPassword || newPassword.length < 6) {
        return Response.json({ error: "New password must be at least 6 characters" }, { status: 400 });
      }
      await db
        .update(admins)
        .set({ passwordHash: hashPassword(newPassword) })
        .where(eq(admins.id, admin.id));
      return Response.json({ ok: true });
    }

    return Response.json({ error: "Invalid request" }, { status: 400 });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Update failed" }, { status: 500 });
  }
}
