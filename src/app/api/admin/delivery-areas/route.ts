import { NextRequest } from "next/server";
import { db } from "@/db";
import { deliveryAreas } from "@/db/schema";
import { fail, guardAdmin, parseSort, refreshStorefront } from "@/lib/admin-api";
import { listDeliveryAreas } from "@/lib/admin-site-content";

export const dynamic = "force-dynamic";

function parseCharge(value: unknown): number | null {
  const n = Math.round(Number(value ?? 0));
  if (!Number.isFinite(n) || n < 0 || n > 100000) return null;
  return n;
}

export async function GET() {
  const denied = await guardAdmin();
  if (denied) return denied;
  try {
    return Response.json({ items: await listDeliveryAreas() });
  } catch (e) {
    console.error(e);
    return fail("Failed to load delivery areas", 500);
  }
}

export async function POST(req: NextRequest) {
  const denied = await guardAdmin();
  if (denied) return denied;
  try {
    const body = await req.json();
    const name = String(body.name ?? "").trim();
    if (name.length < 2) return fail("Area name must be at least 2 characters");

    const charge = parseCharge(body.charge);
    if (charge === null) return fail("Delivery charge must be 0 or more");

    const sortOrder = parseSort(body.sortOrder);
    if (sortOrder === null) return fail("Sort order must be 0 or more");

    const [created] = await db
      .insert(deliveryAreas)
      .values({
        name,
        charge,
        sortOrder,
        isActive: body.isActive === undefined ? true : Boolean(body.isActive),
      })
      .returning();

    refreshStorefront("delivery-areas");
    return Response.json({ ok: true, area: created }, { status: 201 });
  } catch (e) {
    console.error(e);
    return fail("Could not create the delivery area", 500);
  }
}
