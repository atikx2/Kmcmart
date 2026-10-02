import { and, desc, eq, ilike, inArray, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { loadOrderStatuses } from "@/lib/admin-order-statuses";
import {
  formatOrderDateTime,
  fraudScore,
  ORDERS_PAGE_SIZE,
  type AdminOrderDetail,
  type AdminOrderList,
  type AdminOrderRow,
  type FraudScore,
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

/**
 * Delivery-success history per phone number. Stands in for a courier fraud API
 * until one is wired up — same idea: how often does this customer actually
 * receive what they order?
 */
export async function getFraudScores(phones: string[]): Promise<Map<string, FraudScore>> {
  const map = new Map<string, FraudScore>();
  const unique = [...new Set(phones.filter(Boolean))];
  if (unique.length === 0) return map;

  const rows = await db
    .select({
      phone: orders.phone,
      total: sql<number>`count(*)::int`,
      delivered: sql<number>`count(*) filter (where ${orders.status} = 'delivered')::int`,
      cancelled: sql<number>`count(*) filter (where ${orders.status} = 'cancelled')::int`,
    })
    .from(orders)
    .where(inArray(orders.phone, unique))
    .groupBy(orders.phone);

  for (const r of rows) {
    map.set(r.phone, fraudScore(r.delivered, r.cancelled, r.total));
  }
  return map;
}

export async function listAdminOrders(opts: {
  status?: string | null;
  q?: string | null;
  offset?: number;
  limit?: number;
}): Promise<AdminOrderList> {
  /* Only filter by a status the store actually knows about — "all", an empty
     string or a deleted key all mean "no filter". */
  const known = (await loadOrderStatuses()).items;
  const wanted = (opts.status ?? "").trim();
  const status = wanted && known.some((s) => s.key === wanted) ? wanted : null;
  const search = searchFilter(opts.q ?? undefined);
  const offset = Math.max(0, opts.offset ?? 0);
  const limit = Math.min(100, Math.max(1, opts.limit ?? ORDERS_PAGE_SIZE));

  const where = and(status ? eq(orders.status, status) : undefined, search);

  const [rows, totalRows, countRows] = await Promise.all([
    db
      .select({
        id: orders.id,
        code: orders.code,
        customerName: orders.customerName,
        phone: orders.phone,
        address: orders.address,
        customerIp: orders.customerIp,
        subtotal: orders.subtotal,
        deliveryCharge: orders.deliveryCharge,
        total: orders.total,
        deliveryAreaName: orders.deliveryAreaName,
        status: orders.status,
        createdAt: orders.createdAt,
        items: orders.items,
        itemsCount: itemsCountSql,
        courierConsignmentId: orders.courierConsignmentId,
        courierTrackingCode: orders.courierTrackingCode,
        courierTrackingLink: orders.courierTrackingLink,
        courierStatus: orders.courierStatus,
        courierSentAt: orders.courierSentAt,
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

  const fraudMap = await getFraudScores(rows.map((r) => r.phone));

  const counts: OrderCounts = { all: 0 };
  for (const s of known) counts[s.key] = 0;
  for (const r of countRows) {
    counts.all += r.n;
    counts[r.status] = (counts[r.status] ?? 0) + r.n;
  }

  const total = totalRows[0]?.n ?? 0;

  const items: AdminOrderRow[] = rows.map((r) => ({
    id: r.id,
    code: r.code,
    customerName: r.customerName,
    phone: r.phone,
    address: r.address,
    customerIp: r.customerIp,
    itemsCount: r.itemsCount,
    items: (r.items ?? []).map((i) => ({ name: i.name, image: i.image, qty: i.qty, price: i.price })),
    subtotal: r.subtotal,
    deliveryCharge: r.deliveryCharge,
    total: r.total,
    deliveryAreaName: r.deliveryAreaName,
    status: r.status,
    date: formatOrderDateTime(r.createdAt),
    fraud: fraudMap.get(r.phone) ?? fraudScore(0, 0, 0),
    courierConsignmentId: r.courierConsignmentId,
    courierTrackingCode: r.courierTrackingCode,
    courierTrackingLink: r.courierTrackingLink,
    courierStatus: r.courierStatus,
    courierSentAt: r.courierSentAt ? formatOrderDateTime(r.courierSentAt) : null,
  }));

  return { items, total, counts, offset, limit, hasMore: offset + rows.length < total };
}

export async function getAdminOrderByCode(code: string): Promise<AdminOrderDetail | null> {
  const rows = await db.select().from(orders).where(eq(orders.code, code)).limit(1);
  const o = rows[0];
  if (!o) return null;
  const fraudMap = await getFraudScores([o.phone]);
  return {
    id: o.id,
    code: o.code,
    customerName: o.customerName,
    phone: o.phone,
    address: o.address,
    customerIp: o.customerIp,
    deliveryAreaName: o.deliveryAreaName,
    deliveryCharge: o.deliveryCharge,
    subtotal: o.subtotal,
    total: o.total,
    status: o.status,
    items: o.items ?? [],
    placedAt: formatOrderDateTime(o.createdAt),
    fraud: fraudMap.get(o.phone) ?? fraudScore(0, 0, 0),
    courierConsignmentId: o.courierConsignmentId,
    courierTrackingCode: o.courierTrackingCode,
    courierTrackingLink: o.courierTrackingLink,
    courierStatus: o.courierStatus,
    courierSentAt: o.courierSentAt ? formatOrderDateTime(o.courierSentAt) : null,
  };
}

/** Full rows for the printable invoice sheet. */
export async function getAdminOrdersByIds(ids: number[]): Promise<AdminOrderDetail[]> {
  if (ids.length === 0) return [];
  const rows = await db
    .select()
    .from(orders)
    .where(inArray(orders.id, ids))
    .orderBy(desc(orders.createdAt), desc(orders.id));

  return rows.map((o) => ({
    id: o.id,
    code: o.code,
    customerName: o.customerName,
    phone: o.phone,
    address: o.address,
    customerIp: o.customerIp,
    deliveryAreaName: o.deliveryAreaName,
    deliveryCharge: o.deliveryCharge,
    subtotal: o.subtotal,
    total: o.total,
    status: o.status,
    items: o.items ?? [],
    placedAt: formatOrderDateTime(o.createdAt),
    fraud: fraudScore(0, 0, 0),
    courierConsignmentId: o.courierConsignmentId,
    courierTrackingCode: o.courierTrackingCode,
    courierTrackingLink: o.courierTrackingLink,
    courierStatus: o.courierStatus,
    courierSentAt: o.courierSentAt ? formatOrderDateTime(o.courierSentAt) : null,
  }));
}
