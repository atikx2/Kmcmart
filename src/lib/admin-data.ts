import { asc, desc, gte, sql } from "drizzle-orm";
import { db } from "@/db";
import { orders, products, type Order } from "@/db/schema";

export type DashboardStats = {
  todaysOrders: number;
  monthsOrders: number;
  todaysProfit: number;
  monthsProfit: number;
  todayRevenue: number;
  monthRevenue: number;
  delivered: number;
  pending: number;
  onTheWay: number;
  cancelled: number;
};

export type ChartPoint = { label: string; orders: number; revenue: number };

export type RecentOrder = {
  code: string;
  customerName: string;
  phone: string;
  total: number;
  status: string;
  itemsCount: number;
  date: string;
};

const DHAKA_FMT = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Dhaka",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const LABEL_FMT = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Dhaka",
  day: "numeric",
  month: "short",
});

function dhakaDateKey(d: Date): string {
  return DHAKA_FMT.format(d);
}

function profitOf(order: Order, costMap: Map<number, number | null>): number {
  if (order.status === "cancelled") return 0;
  return order.items.reduce((acc, it) => {
    const cost = costMap.get(it.productId) ?? Math.round(it.price * 0.66);
    return acc + (it.price - cost) * it.qty;
  }, 0);
}

export async function getDashboardData(): Promise<{
  stats: DashboardStats;
  chart: ChartPoint[];
  recent: RecentOrder[];
}> {
  const now = new Date();
  const todayKey = dhakaDateKey(now);
  const todayStart = new Date(`${todayKey}T00:00:00+06:00`);
  const monthKey = todayKey.slice(0, 8) + "01";
  const monthStart = new Date(`${monthKey}T00:00:00+06:00`);
  const chartStart = new Date(todayStart.getTime() - 29 * 24 * 3600 * 1000);

  const [costRows, rangeOrders, statusRows, recentRows] = await Promise.all([
    db.select({ id: products.id, cost: products.costPrice }).from(products),
    db
      .select()
      .from(orders)
      .where(gte(orders.createdAt, chartStart))
      .orderBy(asc(orders.createdAt)),
    db
      .select({ status: orders.status, count: sql<number>`count(*)::int` })
      .from(orders)
      .groupBy(orders.status),
    db.select().from(orders).orderBy(desc(orders.createdAt)).limit(6),
  ]);

  const costMap = new Map(costRows.map((r) => [r.id, r.cost]));

  const stats: DashboardStats = {
    todaysOrders: 0,
    monthsOrders: 0,
    todaysProfit: 0,
    monthsProfit: 0,
    todayRevenue: 0,
    monthRevenue: 0,
    delivered: 0,
    pending: 0,
    onTheWay: 0,
    cancelled: 0,
  };

  for (const row of statusRows) {
    if (row.status === "delivered") stats.delivered = row.count;
    else if (row.status === "pending") stats.pending = row.count;
    else if (row.status === "confirmed") stats.onTheWay = row.count;
    else if (row.status === "cancelled") stats.cancelled = row.count;
  }

  /* chart buckets (last 30 days) */
  const buckets = new Map<string, ChartPoint>();
  for (let i = 29; i >= 0; i--) {
    const day = new Date(todayStart.getTime() - i * 24 * 3600 * 1000);
    buckets.set(dhakaDateKey(day), { label: LABEL_FMT.format(day), orders: 0, revenue: 0 });
  }

  for (const o of rangeOrders) {
    const profit = profitOf(o, costMap);
    const isCancelled = o.status === "cancelled";

    if (o.createdAt >= todayStart) {
      stats.todaysOrders++;
      stats.todaysProfit += profit;
      if (!isCancelled) stats.todayRevenue += o.total;
    }
    if (o.createdAt >= monthStart) {
      stats.monthsOrders++;
      stats.monthsProfit += profit;
      if (!isCancelled) stats.monthRevenue += o.total;
    }

    const bucket = buckets.get(dhakaDateKey(o.createdAt));
    if (bucket) {
      bucket.orders++;
      if (!isCancelled) bucket.revenue += o.total;
    }
  }

  const recent: RecentOrder[] = recentRows.map((o) => ({
    code: o.code,
    customerName: o.customerName,
    phone: o.phone,
    total: o.total,
    status: o.status,
    itemsCount: o.items.reduce((a, i) => a + i.qty, 0),
    date: new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Dhaka",
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
    }).format(o.createdAt),
  }));

  return { stats, chart: [...buckets.values()], recent };
}

export async function getPendingOrdersCount(): Promise<number> {
  const rows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(orders)
    .where(sql`status = 'pending'`);
  return rows[0]?.count ?? 0;
}
