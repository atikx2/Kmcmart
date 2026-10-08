import { asc, desc, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { customers, orders } from "@/db/schema";
import { fraudScore, type FraudScore } from "@/lib/order-status";
import type { OrderItem } from "@/db/schema";

export const CUSTOMERS_PAGE_SIZE = 20;

export type AdminCustomerRow = {
  phone: string;
  name: string;
  address: string;
  orderCount: number;
  delivered: number;
  pending: number;
  cancelled: number;
  spent: number;
  lastOrderAt: string;
  firstOrderAt: string;
  hasAccount: boolean;
  fraud: FraudScore;
};

export type AdminCustomerList = {
  items: AdminCustomerRow[];
  total: number;
  offset: number;
  limit: number;
  hasMore: boolean;
  /** totals across every customer, not just this page */
  summary: { customers: number; registered: number; repeat: number; revenue: number };
};

export type AdminCustomerOrder = {
  id: number;
  code: string;
  status: string;
  total: number;
  subtotal: number;
  deliveryCharge: number;
  deliveryAreaName: string;
  address: string;
  itemCount: number;
  items: OrderItem[];
  createdAt: string;
};

export type AdminCustomerDetail = {
  phone: string;
  name: string;
  addresses: string[];
  hasAccount: boolean;
  accountName: string | null;
  joinedAt: string | null;
  orderCount: number;
  delivered: number;
  pending: number;
  confirmed: number;
  cancelled: number;
  spent: number;
  avgOrder: number;
  unitsBought: number;
  firstOrderAt: string;
  lastOrderAt: string;
  fraud: FraudScore;
  orders: AdminCustomerOrder[];
};

const DATE_FMT = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "Asia/Dhaka",
});

const DATETIME_FMT = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: true,
  timeZone: "Asia/Dhaka",
});

/**
 * Customers are derived from the orders table, not the accounts table —
 * guest checkout is the norm here, so "customer" means "a phone number that
 * has ordered". Registered accounts are flagged on top.
 */
export async function listAdminCustomers(opts: {
  q: string;
  offset: number;
  limit: number;
}): Promise<AdminCustomerList> {
  const limit = Math.min(Math.max(1, opts.limit), 100);
  const offset = Math.max(0, opts.offset);
  const q = opts.q.trim();

  const where = q
    ? or(
        ilike(orders.phone, `%${q}%`),
        ilike(orders.customerName, `%${q}%`),
        ilike(orders.address, `%${q}%`),
        ilike(orders.code, `%${q}%`)
      )
    : undefined;

  const grouped = db
    .select({
      phone: orders.phone,
      name: sql<string>`(array_agg(${orders.customerName} order by ${orders.createdAt} desc))[1]`,
      address: sql<string>`(array_agg(${orders.address} order by ${orders.createdAt} desc))[1]`,
      orderCount: sql<number>`count(*)::int`,
      delivered: sql<number>`count(*) filter (where ${orders.status} = 'delivered')::int`,
      pending: sql<number>`count(*) filter (where ${orders.status} in ('pending','confirmed'))::int`,
      cancelled: sql<number>`count(*) filter (where ${orders.status} = 'cancelled')::int`,
      spent: sql<number>`coalesce(sum(${orders.total}) filter (where ${orders.status} = 'delivered'), 0)::int`,
      lastOrderAt: sql<Date>`max(${orders.createdAt})`,
      firstOrderAt: sql<Date>`min(${orders.createdAt})`,
    })
    .from(orders)
    .where(where)
    .groupBy(orders.phone);

  const [orderRows, accounts, summaryRows] = await Promise.all([
    grouped.orderBy(desc(sql`max(${orders.createdAt})`)),
    db.select({ phone: customers.phone, name: customers.name, address: customers.address, createdAt: customers.createdAt }).from(customers),
    db
      .select({
        customers: sql<number>`count(distinct ${orders.phone})::int`,
        revenue: sql<number>`coalesce(sum(${orders.total}) filter (where ${orders.status} = 'delivered'), 0)::int`,
      })
      .from(orders),
  ]);

  const accountPhones = new Set(accounts.map((a) => a.phone));

  /* how many phones ordered more than once (across the whole table) */
  const repeatRows = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(
      db
        .select({ phone: orders.phone })
        .from(orders)
        .groupBy(orders.phone)
        .having(sql`count(*) > 1`)
        .as("repeat_customers")
    );

  const byPhone = new Map<string, AdminCustomerRow>();
  for (const r of orderRows) byPhone.set(r.phone, { phone:r.phone, name:r.name, address:r.address, orderCount:r.orderCount, delivered:r.delivered, pending:r.pending, cancelled:r.cancelled, spent:r.spent, lastOrderAt:DATE_FMT.format(new Date(r.lastOrderAt)), firstOrderAt:DATE_FMT.format(new Date(r.firstOrderAt)), hasAccount:accountPhones.has(r.phone), fraud:fraudScore(r.delivered,r.cancelled,r.orderCount) });
  for (const c of accounts) if (!byPhone.has(c.phone)) byPhone.set(c.phone, { phone:c.phone, name:c.name, address:c.address || "", orderCount:0, delivered:0, pending:0, cancelled:0, spent:0, lastOrderAt:"—", firstOrderAt:c.createdAt ? DATE_FMT.format(new Date(c.createdAt)) : "—", hasAccount:true, fraud:fraudScore(0,0,0) });
  const allItems = [...byPhone.values()].filter(c => !q || c.name.toLowerCase().includes(q.toLowerCase()) || c.phone.includes(q) || c.address.toLowerCase().includes(q.toLowerCase())).sort((a,b)=>a.name.localeCompare(b.name));
  const items = allItems.slice(offset, offset + limit);
  const total = allItems.length;

  return {
    items,
    total,
    offset,
    limit,
    hasMore: offset + items.length < total,
    summary: {
      customers: summaryRows[0]?.customers ?? 0,
      registered: accountPhones.size,
      repeat: repeatRows[0]?.n ?? 0,
      revenue: summaryRows[0]?.revenue ?? 0,
    },
  };
}

export async function getAdminCustomer(phone: string): Promise<AdminCustomerDetail | null> {
  const rows = await db
    .select()
    .from(orders)
    .where(eq(orders.phone, phone))
    .orderBy(desc(orders.createdAt), desc(orders.id));

  if (rows.length === 0) return null;

  const account = (
    await db.select().from(customers).where(eq(customers.phone, phone)).limit(1)
  )[0];

  const counts = { delivered: 0, pending: 0, confirmed: 0, cancelled: 0 };
  let spent = 0;
  let unitsBought = 0;
  const addresses: string[] = [];

  for (const o of rows) {
    if (o.status === "delivered") {
      counts.delivered += 1;
      spent += o.total;
    } else if (o.status === "cancelled") counts.cancelled += 1;
    else if (o.status === "confirmed") counts.confirmed += 1;
    else counts.pending += 1;

    for (const it of o.items) unitsBought += it.qty;
    const addr = o.address.trim();
    if (addr && !addresses.includes(addr)) addresses.push(addr);
  }

  const sorted = [...rows].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  return {
    phone,
    name: rows[0].customerName,
    addresses,
    hasAccount: Boolean(account),
    accountName: account?.name ?? null,
    joinedAt: account ? DATE_FMT.format(account.createdAt) : null,
    orderCount: rows.length,
    delivered: counts.delivered,
    pending: counts.pending,
    confirmed: counts.confirmed,
    cancelled: counts.cancelled,
    spent,
    avgOrder: counts.delivered > 0 ? Math.round(spent / counts.delivered) : 0,
    unitsBought,
    firstOrderAt: DATETIME_FMT.format(sorted[0].createdAt),
    lastOrderAt: DATETIME_FMT.format(sorted[sorted.length - 1].createdAt),
    fraud: fraudScore(counts.delivered, counts.cancelled, rows.length),
    orders: rows.map((o) => ({
      id: o.id,
      code: o.code,
      status: o.status,
      total: o.total,
      subtotal: o.subtotal,
      deliveryCharge: o.deliveryCharge,
      deliveryAreaName: o.deliveryAreaName,
      address: o.address,
      itemCount: o.items.reduce((a, i) => a + i.qty, 0),
      items: o.items,
      createdAt: DATETIME_FMT.format(o.createdAt),
    })),
  };
}

/** Phone numbers only — used to pre-render nothing, just for validation. */
export async function customerExists(phone: string): Promise<boolean> {
  const rows = await db
    .select({ id: orders.id })
    .from(orders)
    .where(eq(orders.phone, phone))
    .orderBy(asc(orders.id))
    .limit(1);
  return rows.length > 0;
}
