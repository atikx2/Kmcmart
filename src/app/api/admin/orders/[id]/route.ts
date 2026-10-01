import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { orders, type OrderItem } from "@/db/schema";
import { getSessionAdmin } from "@/lib/admin-auth";
import { isOrderStatus } from "@/lib/admin-orders";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

function parseId(raw: string): number | null {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function money(v: unknown): number | null {
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0 || n > 100_000_000) return null;
  return Math.round(n);
}

function cleanItems(v: unknown): OrderItem[] | null {
  if (!Array.isArray(v)) return null;
  const out: OrderItem[] = [];
  for (const raw of v) {
    if (typeof raw !== "object" || raw === null) return null;
    const it = raw as Record<string, unknown>;
    const price = money(it.price);
    const qty = Number(it.qty);
    if (price === null || !Number.isInteger(qty) || qty < 1 || qty > 999) return null;
    out.push({
      productId: Number(it.productId) || 0,
      name: String(it.name ?? "").slice(0, 300),
      image: String(it.image ?? "").slice(0, 600),
      price,
      qty,
    });
  }
  return out;
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const admin = await getSessionAdmin();
  if (!admin) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const id = parseId((await params).id);
    if (!id) return Response.json({ error: "Invalid order id" }, { status: 400 });

    const body = (await req.json()) as Record<string, unknown>;
    const patch: Record<string, unknown> = {};

    if ("status" in body) {
      if (!isOrderStatus(body.status)) {
        return Response.json({ error: "Invalid status value" }, { status: 400 });
      }
      patch.status = body.status;
    }

    if ("customerName" in body) {
      const v = String(body.customerName ?? "").trim();
      if (v.length < 2 || v.length > 120) {
        return Response.json({ error: "Customer name must be 2–120 characters" }, { status: 400 });
      }
      patch.customerName = v;
    }

    if ("phone" in body) {
      const v = String(body.phone ?? "").trim();
      if (!/^01[3-9]\d{8}$/.test(v)) {
        return Response.json({ error: "Enter a valid 11-digit mobile number" }, { status: 400 });
      }
      patch.phone = v;
    }

    if ("address" in body) {
      const v = String(body.address ?? "").trim();
      if (v.length < 5 || v.length > 500) {
        return Response.json({ error: "Address must be 5–500 characters" }, { status: 400 });
      }
      patch.address = v;
    }

    if ("deliveryAreaName" in body) {
      const v = String(body.deliveryAreaName ?? "").trim();
      if (v.length < 2 || v.length > 120) {
        return Response.json({ error: "Delivery area must be 2–120 characters" }, { status: 400 });
      }
      patch.deliveryAreaName = v;
    }

    for (const key of ["deliveryCharge", "subtotal", "total"] as const) {
      if (key in body) {
        const v = money(body[key]);
        if (v === null) return Response.json({ error: `Invalid ${key}` }, { status: 400 });
        patch[key] = v;
      }
    }

    if ("items" in body) {
      const items = cleanItems(body.items);
      if (!items) return Response.json({ error: "Invalid items payload" }, { status: 400 });
      patch.items = items;
    }

    if (Object.keys(patch).length === 0) {
      return Response.json({ error: "Nothing to update" }, { status: 400 });
    }

    const [updated] = await db
      .update(orders)
      .set(patch)
      .where(eq(orders.id, id))
      .returning({
        id: orders.id,
        code: orders.code,
        status: orders.status,
        address: orders.address,
        customerName: orders.customerName,
        phone: orders.phone,
        subtotal: orders.subtotal,
        deliveryCharge: orders.deliveryCharge,
        total: orders.total,
      });

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
