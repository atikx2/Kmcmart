import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { menus } from "@/db/schema";
import { fail, guardAdmin, parseSort, refreshStorefront, routeId } from "@/lib/admin-api";
import { isValidHref, normalizeHref, HREF_HINT } from "@/lib/admin-site-content";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const denied = await guardAdmin("menus");
  if (denied) return denied;

  const id = routeId((await params).id);
  if (!id) return fail("Invalid menu id");

  try {
    const body = await req.json();
    const u: Partial<{ label: string; href: string; sortOrder: number; isActive: boolean }> = {};

    if (body.label !== undefined) {
      const v = String(body.label).trim();
      if (!v) return fail("Menu label is required");
      u.label = v;
    }
    if (body.href !== undefined) {
      const v = normalizeHref(String(body.href));
      if (!isValidHref(v)) return fail(HREF_HINT);
      u.href = v;
    }
    if (body.sortOrder !== undefined) {
      const n = parseSort(body.sortOrder);
      if (n === null) return fail("Sort order must be 0 or more");
      u.sortOrder = n;
    }
    if (body.isActive !== undefined) u.isActive = Boolean(body.isActive);
    if (Object.keys(u).length === 0) return fail("Nothing to update");

    const [updated] = await db.update(menus).set(u).where(eq(menus.id, id)).returning();
    if (!updated) return fail("Menu item not found", 404);

    refreshStorefront("menus");
    return Response.json({ ok: true, menu: updated });
  } catch (e) {
    console.error(e);
    return fail("Could not update the menu item", 500);
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const denied = await guardAdmin("menus");
  if (denied) return denied;

  const id = routeId((await params).id);
  if (!id) return fail("Invalid menu id");

  try {
    const gone = await db.delete(menus).where(eq(menus.id, id)).returning({ id: menus.id });
    if (gone.length === 0) return fail("Menu item not found", 404);
    refreshStorefront("menus");
    return Response.json({ ok: true });
  } catch (e) {
    console.error(e);
    return fail("Could not delete the menu item", 500);
  }
}
