import { NextRequest, after } from "next/server";
import { eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { deliveryAreas, orders, products } from "@/db/schema";
import { effectivePrice, padOrderCode } from "@/lib/format";
import { getSessionCustomer } from "@/lib/auth";

type IncomingItem = { id: number; qty: number };

/** Best-effort visitor IP (Netlify → CDN → proxy → direct). */
function clientIp(req: NextRequest): string | null {
  const h = req.headers;
  const candidate =
    h.get("x-nf-client-connection-ip") ||
    h.get("cf-connecting-ip") ||
    h.get("x-real-ip") ||
    h.get("x-forwarded-for")?.split(",")[0];
  const ip = candidate?.trim();
  return ip && ip.length <= 64 ? ip : null;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { customerName, phone, address, deliveryAreaId, items } = body as {
      customerName?: string;
      phone?: string;
      address?: string;
      deliveryAreaId?: number;
      items?: IncomingItem[];
    };

    if (!customerName || customerName.trim().length < 3) {
      return Response.json({ error: "Valid name is required" }, { status: 400 });
    }
    if (!phone || !/^01[3-9]\d{8}$/.test(phone.trim())) {
      return Response.json({ error: "Valid 11-digit mobile number is required" }, { status: 400 });
    }
    if (!address || address.trim().length < 10) {
      return Response.json({ error: "Full address is required" }, { status: 400 });
    }
    if (!deliveryAreaId) {
      return Response.json({ error: "Delivery area is required" }, { status: 400 });
    }
    if (!items || items.length === 0) {
      return Response.json({ error: "Cart is empty" }, { status: 400 });
    }

    const ids = items.map((i) => i.id);

    /* These three do not depend on each other. Running them in sequence cost
       the shopper three round-trips to the database for no reason. */
    const [area, dbProducts, customer] = await Promise.all([
      db.select({ name: deliveryAreas.name, charge: deliveryAreas.charge })
        .from(deliveryAreas)
        .where(eq(deliveryAreas.id, deliveryAreaId))
        .limit(1),
      /* Only the columns the order snapshot needs. `images` holds base64 data
         URLs, so selecting the whole row dragged hundreds of kilobytes across
         the wire per product; `->>0` fetches just the thumbnail. */
      db.select({
        id: products.id,
        name: products.name,
        image: sql<string | null>`${products.images}->>0`,
        regularPrice: products.regularPrice,
        sellPrice: products.sellPrice,
        freeDelivery: products.freeDelivery,
      })
        .from(products)
        .where(inArray(products.id, ids)),
      getSessionCustomer(),
    ]);

    if (!area[0]) {
      return Response.json({ error: "Invalid delivery area" }, { status: 400 });
    }

    const orderItems = items.map((i) => {
      const p = dbProducts.find((d) => d.id === i.id);
      if (!p) throw new Error("Product not found");
      return {
        productId: p.id,
        name: p.name,
        image: p.image ?? "",
        price: effectivePrice(p.regularPrice, p.sellPrice),
        qty: Math.min(Math.max(1, i.qty), 99),
      };
    });

    const subtotal = orderItems.reduce((a, i) => a + i.price * i.qty, 0);
    /* Delivery is free only when every product in the order ships free.
       Recomputed here so a tampered client payload cannot skip the charge. */
    const shipsFree = items.every((i) => dbProducts.find((d) => d.id === i.id)?.freeDelivery === true);
    const deliveryCharge = shipsFree ? 0 : area[0].charge;
    const total = subtotal + deliveryCharge;

    /* One statement instead of insert-then-update: the id is taken from the
       sequence up front so `code` can be written in the same round-trip. */
    const [inserted] = await db
      .insert(orders)
      .values({
        id: sql`nextval(pg_get_serial_sequence('orders', 'id'))`,
        code: sql`lpad(currval(pg_get_serial_sequence('orders', 'id'))::text, 6, '0')`,
        customerId: customer?.id ?? null,
        customerName: customerName.trim(),
        phone: phone.trim(),
        address: address.trim(),
        deliveryAreaName: shipsFree ? `${area[0].name} (Free delivery)` : area[0].name,
        deliveryCharge,
        subtotal,
        total,
        items: orderItems,
        customerIp: clientIp(req),
      })
      .returning({ id: orders.id, code: orders.code });

    const code = inserted.code || padOrderCode(inserted.id);

    /* Reputation lookup must never make the shopper wait — `after` runs it
       once the response has already gone out. The scheduled job backfills
       anything this misses. */
    after(async () => {
      try {
        const { autoCheckEnabled, checkPhone } = await import("@/lib/admin-fraud");
        if (await autoCheckEnabled()) await checkPhone(phone.trim());
      } catch (err) {
        console.error("fraud auto-check failed:", err);
      }
    });

    return Response.json({ ok: true, code });
  } catch (e) {
    console.error(e);
    return Response.json(
      { error: e instanceof Error ? e.message : "Failed to place order" },
      { status: 500 }
    );
  }
}
