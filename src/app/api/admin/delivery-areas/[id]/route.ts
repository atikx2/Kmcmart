import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { deliveryAreas } from "@/db/schema";
import { fail, guardAdmin, parseSort, refreshStorefront, routeId } from "@/lib/admin-api";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const denied = await guardAdmin("delivery");
  if (denied) return denied;

  const id = routeId((await params).id);
  if (!id) return fail("Invalid area id");

  try {
    const body = await req.json();
    const u: Partial<{ name: string; charge: number; sortOrder: number; isActive: boolean }> = {};

    if (body.name !== undefined) {
      const v = String(body.name).trim();
      if (v.length < 2) return fail("Area name must be at least 2 characters");
      u.name = v;
    }
    if (body.charge !== undefined) {
      const n = Math.round(Number(body.charge));
      if (!Number.isFinite(n) || n < 0 || n > 100000) return fail("Delivery charge must be 0 or more");
      u.charge = n;
    }
    if (body.sortOrder !== undefined) {
      const n = parseSort(body.sortOrder);
      if (n === null) return fail("Sort order must be 0 or more");
      u.sortOrder = n;
    }
    if (body.isActive !== undefined) u.isActive = Boolean(body.isActive);
    if (Object.keys(u).length === 0) return fail("Nothing to update");

    const [updated] = await db.update(deliveryAreas).set(u).where(eq(deliveryAreas.id, id)).returning();
    if (!updated) return fail("Delivery area not found", 404);

    refreshStorefront("delivery-areas");
    return Response.json({ ok: true, area: updated });
  } catch (e) {
    console.error(e);
    return fail("Could not update the delivery area", 500);
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const denied = await guardAdmin("delivery");
  if (denied) return denied;

  const id = routeId((await params).id);
  if (!id) return fail("Invalid area id");

  try {
    /* Orders keep a snapshot of the name + charge, so deleting is safe —
       but the store needs at least one area for checkout to work. */
    const rows = await db.select({ id: deliveryAreas.id }).from(deliveryAreas);
    if (rows.length <= 1) return fail("Keep at least one delivery area — checkout needs it", 409);

    const gone = await db.delete(deliveryAreas).where(eq(deliveryAreas.id, id)).returning({ id: deliveryAreas.id });
    if (gone.length === 0) return fail("Delivery area not found", 404);

    refreshStorefront("delivery-areas");
    return Response.json({ ok: true });
  } catch (e) {
    console.error(e);
    return fail("Could not delete the delivery area", 500);
  }
}
