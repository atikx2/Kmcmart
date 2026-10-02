import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { banners } from "@/db/schema";
import { fail, guardAdmin, parseSort, refreshStorefront, routeId } from "@/lib/admin-api";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const denied = await guardAdmin("banners");
  if (denied) return denied;

  const id = routeId((await params).id);
  if (!id) return fail("Invalid banner id");

  try {
    const body = await req.json();
    const u: Partial<{ imageUrl: string; alt: string; sortOrder: number; isActive: boolean }> = {};

    if (body.imageUrl !== undefined) {
      const v = String(body.imageUrl).trim();
      if (!v) return fail("A banner image is required");
      u.imageUrl = v;
    }
    if (body.alt !== undefined) u.alt = String(body.alt).trim() || "Banner";
    if (body.sortOrder !== undefined) {
      const n = parseSort(body.sortOrder);
      if (n === null) return fail("Sort order must be 0 or more");
      u.sortOrder = n;
    }
    if (body.isActive !== undefined) u.isActive = Boolean(body.isActive);
    if (Object.keys(u).length === 0) return fail("Nothing to update");

    const [updated] = await db.update(banners).set(u).where(eq(banners.id, id)).returning();
    if (!updated) return fail("Banner not found", 404);

    refreshStorefront("banners");
    return Response.json({ ok: true, banner: updated });
  } catch (e) {
    console.error(e);
    return fail("Could not update the banner", 500);
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const denied = await guardAdmin("banners");
  if (denied) return denied;

  const id = routeId((await params).id);
  if (!id) return fail("Invalid banner id");

  try {
    const gone = await db.delete(banners).where(eq(banners.id, id)).returning({ id: banners.id });
    if (gone.length === 0) return fail("Banner not found", 404);
    refreshStorefront("banners");
    return Response.json({ ok: true });
  } catch (e) {
    console.error(e);
    return fail("Could not delete the banner", 500);
  }
}
