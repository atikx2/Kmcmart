import { NextRequest } from "next/server";
import { inArray } from "drizzle-orm";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { getSessionAdmin } from "@/lib/admin-auth";
import { isOrderStatus } from "@/lib/admin-orders";

export const dynamic = "force-dynamic";

const MAX_IDS = 200;

function parseIds(v: unknown): number[] | null {
  if (!Array.isArray(v) || v.length === 0 || v.length > MAX_IDS) return null;
  const ids = v.map(Number).filter((n) => Number.isInteger(n) && n > 0);
  return ids.length === v.length ? [...new Set(ids)] : null;
}

export async function POST(req: NextRequest) {
  const admin = await getSessionAdmin();
  if (!admin) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = (await req.json()) as { action?: unknown; ids?: unknown; status?: unknown };
    const ids = parseIds(body.ids);
    if (!ids) return Response.json({ error: `Select between 1 and ${MAX_IDS} orders` }, { status: 400 });

    if (body.action === "status") {
      if (!isOrderStatus(body.status)) {
        return Response.json({ error: "Invalid status value" }, { status: 400 });
      }
      const rows = await db
        .update(orders)
        .set({ status: body.status })
        .where(inArray(orders.id, ids))
        .returning({ id: orders.id });
      return Response.json({ ok: true, affected: rows.length, status: body.status });
    }

    if (body.action === "delete") {
      const rows = await db
        .delete(orders)
        .where(inArray(orders.id, ids))
        .returning({ id: orders.id });
      return Response.json({ ok: true, affected: rows.length });
    }

    if (body.action === "courier") {
      /* Courier integration is not wired yet — the owner will provide the API
         docs. Until then this reports back without touching any order so the
         button can be exercised safely. */
      return Response.json(
        {
          ok: false,
          pending: true,
          selected: ids.length,
          error: "Courier API is not connected yet. Share the courier API docs and this will start sending parcels.",
        },
        { status: 501 }
      );
    }

    return Response.json({ error: "Unknown bulk action" }, { status: 400 });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Bulk action failed" }, { status: 500 });
  }
}
