import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { getSessionAdmin } from "@/lib/admin-auth";
import { isOrderStatus } from "@/lib/admin-orders";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

function parseId(raw: string): number | null {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const admin = await getSessionAdmin();
  if (!admin) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const id = parseId((await params).id);
    if (!id) return Response.json({ error: "Invalid order id" }, { status: 400 });

    const body = (await req.json()) as { status?: unknown };
    if (!isOrderStatus(body.status)) {
      return Response.json({ error: "Invalid status value" }, { status: 400 });
    }

    const [updated] = await db
      .update(orders)
      .set({ status: body.status })
      .where(eq(orders.id, id))
      .returning({ id: orders.id, code: orders.code, status: orders.status });

    if (!updated) return Response.json({ error: "Order not found" }, { status: 404 });

    return Response.json({ ok: true, order: updated });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Failed to update order" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const admin = await getSessionAdmin();
  if (!admin) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const id = parseId((await params).id);
    if (!id) return Response.json({ error: "Invalid order id" }, { status: 400 });

    const [deleted] = await db
      .delete(orders)
      .where(eq(orders.id, id))
      .returning({ id: orders.id, code: orders.code });

    if (!deleted) return Response.json({ error: "Order not found" }, { status: 404 });

    return Response.json({ ok: true, deleted });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Failed to delete order" }, { status: 500 });
  }
}
