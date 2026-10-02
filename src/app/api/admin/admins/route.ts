import { NextRequest } from "next/server";
import { db } from "@/db";
import { admins } from "@/db/schema";
import { fail, guardAdmin } from "@/lib/admin-api";
import { hashPassword } from "@/lib/admin-auth";
import { getSessionAdmin } from "@/lib/admin-auth";
import { cleanPermissions, emailTaken, listAdminAccounts } from "@/lib/admin-accounts";
import { presetPermissions } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export async function GET() {
  const denied = await guardAdmin("roles");
  if (denied) return denied;
  try {
    const me = await getSessionAdmin();
    return Response.json({ items: await listAdminAccounts(me?.id ?? 0) });
  } catch (e) {
    console.error(e);
    return fail("Failed to load admins", 500);
  }
}

export async function POST(req: NextRequest) {
  const denied = await guardAdmin("roles");
  if (denied) return denied;

  try {
    const body = await req.json();
    const name = String(body.name ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    const role = String(body.role ?? "manager");

    if (name.length < 2) return fail("Name must be at least 2 characters");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail("Enter a valid email address");
    if (password.length < 6) return fail("Password must be at least 6 characters");
    if (role === "owner") return fail("There can only be one Super Admin");
    if (await emailTaken(email)) return fail("This email is already in use", 409);

    const permissions =
      body.permissions === undefined ? presetPermissions(role) : cleanPermissions(body.permissions);
    if (permissions.length === 0) return fail("Give the admin access to at least one page");

    const [created] = await db
      .insert(admins)
      .values({
        name,
        email,
        passwordHash: hashPassword(password),
        role,
        permissions,
        isActive: body.isActive === undefined ? true : Boolean(body.isActive),
      })
      .returning({ id: admins.id, email: admins.email });

    return Response.json({ ok: true, admin: created }, { status: 201 });
  } catch (e) {
    console.error(e);
    return fail("Could not create the admin", 500);
  }
}
