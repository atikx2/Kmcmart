import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { admins } from "@/db/schema";
import { fail, guardAdmin, routeId } from "@/lib/admin-api";
import { getSessionAdmin, hashPassword } from "@/lib/admin-auth";
import { cleanPermissions, emailTaken, getOwnerId } from "@/lib/admin-accounts";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const denied = await guardAdmin("roles");
  if (denied) return denied;

  const id = routeId((await params).id);
  if (!id) return fail("Invalid admin id");

  try {
    const [ownerId, me] = await Promise.all([getOwnerId(), getSessionAdmin()]);
    const body = await req.json();
    const isOwner = id === ownerId;

    /* The Super Admin keeps full access and stays enabled, always. */
    if (isOwner && (body.role !== undefined || body.permissions !== undefined || body.isActive !== undefined)) {
      return fail("The Super Admin always keeps full access", 403);
    }
    if (me?.id === id && body.isActive === false) {
      return fail("You cannot disable your own account", 403);
    }

    const u: Partial<{
      name: string;
      email: string;
      role: string;
      permissions: string[];
      isActive: boolean;
      passwordHash: string;
    }> = {};

    if (body.name !== undefined) {
      const v = String(body.name).trim();
      if (v.length < 2) return fail("Name must be at least 2 characters");
      u.name = v;
    }
    if (body.email !== undefined) {
      const v = String(body.email).trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return fail("Enter a valid email address");
      if (await emailTaken(v, id)) return fail("This email is already in use", 409);
      u.email = v;
    }
    if (body.password !== undefined && String(body.password).length > 0) {
      const v = String(body.password);
      if (v.length < 6) return fail("Password must be at least 6 characters");
      u.passwordHash = hashPassword(v);
    }
    if (body.role !== undefined) {
      const v = String(body.role);
      if (v === "owner") return fail("There can only be one Super Admin");
      u.role = v;
    }
    if (body.permissions !== undefined) {
      const perms = cleanPermissions(body.permissions);
      if (perms.length === 0) return fail("Give the admin access to at least one page");
      u.permissions = perms;
    }
    if (body.isActive !== undefined) u.isActive = Boolean(body.isActive);

    if (Object.keys(u).length === 0) return fail("Nothing to update");

    const [updated] = await db
      .update(admins)
      .set(u)
      .where(eq(admins.id, id))
      .returning({ id: admins.id, name: admins.name, email: admins.email });
    if (!updated) return fail("Admin not found", 404);

    return Response.json({ ok: true, admin: updated });
  } catch (e) {
    console.error(e);
    return fail("Could not update the admin", 500);
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const denied = await guardAdmin("roles");
  if (denied) return denied;

  const id = routeId((await params).id);
  if (!id) return fail("Invalid admin id");

  try {
    const [ownerId, me] = await Promise.all([getOwnerId(), getSessionAdmin()]);
    if (id === ownerId) return fail("The Super Admin cannot be deleted", 403);
    if (me?.id === id) return fail("You cannot delete the account you are signed in with", 403);

    const gone = await db.delete(admins).where(eq(admins.id, id)).returning({ id: admins.id });
    if (gone.length === 0) return fail("Admin not found", 404);

    return Response.json({ ok: true });
  } catch (e) {
    console.error(e);
    return fail("Could not delete the admin", 500);
  }
}
