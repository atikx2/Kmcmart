import { and, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { orders } from "@/db/schema";
import {
  formatOrderDateTime,
  isOrderStatus,
  ORDERS_PAGE_SIZE,
  type AdminOrderDetail,
  type AdminOrderList,
  type OrderCounts,
} from "@/lib/order-status";

/* Re-exported so server files only need one import. Client components must
   import from "@/lib/order-status" instead (this file pulls in `pg`). */
export * from "@/lib/order-status";

function searchFilter(q?: string): SQL | undefined {
  const s = (q ?? "").trim();
  if (!s) return undefined;
  const like = `%${s}%`;
  return or(
    ilike(orders.code, like),
    ilike(orders.customerName, like),
    ilike(orders.phone, like)
  );
}

const itemsCountSql = sql<number>`coalesce((
  select sum((e->>'qty')::int)
  from jsonb_array_elements(${orders.items}) as e
), 0)::int`;

export async function listAdminOrders(opts: {
  status?: string | null;
  q?: string | null;
  offset?: number;
  limit?: number;
}): Promise<AdminOrderList> {
  const status = isOrderStatus(opts.status) ? opts.status : null;
  const search = searchFilter(opts.q ?? undefined);
  const offset = Math.max(0, opts.offset ?? 0);
  const limit = Math.min(60, Math.max(1, opts.limit ?? ORDERS_PAGE_SIZE));

  const where = and(status ? eq(orders.status, status) : undefined, search);

  const [rows, totalRows, countRows] = await Promise.all([
    db
      .select({
        id: orders.id,
        code: orders.code,
        customerName: orders.customerName,
        phone: orders.phone,
        total: orders.total,
        deliveryAreaName: orders.deliveryAreaName,
        status: orders.status,
        createdAt: orders.createdAt,
        itemsCount: itemsCountSql,
      })
      .from(orders)
      .where(where)
      .orderBy(desc(orders.createdAt), desc(orders.id))
      .offset(offset)
      .limit(limit),
    db.select({ n: sql<number>`count(*)::int` }).from(orders).where(where),
    db
      .select({ status: orders.status, n: sql<number>`count(*)::int` })
      .from(orders)
      .where(search)
      .groupBy(orders.status),
  ]);

  const counts: OrderCounts = {
    all: 0,
    pending: 0,
    confirmed: 0,
    delivered: 0,
    cancelled: 0,
  };
  for (const r of countRows) {
    counts.all += r.n;
    if (isOrderStatus(r.status)) counts[r.status] = r.n;
  }

  const total = totalRows[0]?.n ?? 0;

  return {
    items: rows.map((r) => ({
      id: r.id,
      code: r.code,
      customerName: r.customerName,
      phone: r.phone,
      itemsCount: r.itemsCount,
      total: r.total,
      deliveryAreaName: r.deliveryAreaName,
      status: r.status,
      date: formatOrderDateTime(r.createdAt),
    })),
    total,
    counts,
    offset,
    limit,
    hasMore: offset + rows.length < total,
  };
}

export async function getAdminOrderByCode(code: string): Promise<AdminOrderDetail | null> {
  const rows = await db.select().from(orders).where(eq(orders.code, code)).limit(1);
  const o = rows[0];
  if (!o) return null;
  return {
    id: o.id,
    code: o.code,
    customerName: o.customerName,
    phone: o.phone,
    address: o.address,
    deliveryAreaName: o.deliveryAreaName,
    deliveryCharge: o.deliveryCharge,
    subtotal: o.subtotal,
    total: o.total,
    status: o.status,
    items: o.items ?? [],
    placedAt: formatOrderDateTime(o.createdAt),
  };
}
