import { NextRequest } from "next/server";
import { eq, inArray } from "drizzle-orm";
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

    const area = await db
      .select()
      .from(deliveryAreas)
      .where(eq(deliveryAreas.id, deliveryAreaId))
      .limit(1);
    if (!area[0]) {
      return Response.json({ error: "Invalid delivery area" }, { status: 400 });
    }

    const ids = items.map((i) => i.id);
    const dbProducts = await db
      .select()
      .from(products)
      .where(inArray(products.id, ids));

    const orderItems = items.map((i) => {
      const p = dbProducts.find((d) => d.id === i.id);
      if (!p) throw new Error("Product not found");
      return {
        productId: p.id,
        name: p.name,
        image: (p.images && p.images[0]) || "",
        price: effectivePrice(p.regularPrice, p.sellPrice),
        qty: Math.min(Math.max(1, i.qty), 99),
      };
    });

    const subtotal = orderItems.reduce((a, i) => a + i.price * i.qty, 0);
    const total = subtotal + area[0].charge;

    const customer = await getSessionCustomer();

    const [inserted] = await db
      .insert(orders)
      .values({
        code: "TMP",
        customerId: customer?.id ?? null,
        customerName: customerName.trim(),
        phone: phone.trim(),
        address: address.trim(),
        deliveryAreaName: area[0].name,
        deliveryCharge: area[0].charge,
        subtotal,
        total,
        items: orderItems,
        customerIp: clientIp(req),
      })
      .returning({ id: orders.id });

    const code = padOrderCode(inserted.id);
    await db.update(orders).set({ code }).where(eq(orders.id, inserted.id));

    return Response.json({ ok: true, code });
  } catch (e) {
    console.error(e);
    return Response.json(
      { error: e instanceof Error ? e.message : "Failed to place order" },
      { status: 500 }
    );
  }
}
