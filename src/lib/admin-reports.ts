import { gte } from "drizzle-orm";
import { db } from "@/db";
import { orders, products } from "@/db/schema";

export const REPORT_RANGES = [
  { key: "7", label: "7 days", days: 7 },
  { key: "30", label: "30 days", days: 30 },
  { key: "90", label: "90 days", days: 90 },
  { key: "365", label: "1 year", days: 365 },
] as const;

export type ReportRangeKey = (typeof REPORT_RANGES)[number]["key"];

export function rangeFromKey(raw?: string) {
  return REPORT_RANGES.find((r) => r.key === raw) ?? REPORT_RANGES[1];
}

export type ReportBucket = {
  label: string;
  revenue: number;
  profit: number;
  orders: number;
};

export type ProfitReport = {
  days: number;
  /** delivered only */
  revenue: number;
  cogs: number;
  profit: number;
  margin: number;
  deliveryCollected: number;
  deliveredOrders: number;
  totalOrders: number;
  pendingValue: number;
  cancelledValue: number;
  cancelledOrders: number;
  avgOrderValue: number;
  unitsSold: number;
  buckets: ReportBucket[];
  /** how many delivered items had no cost price on file */
  missingCost: number;
};

const DHAKA = "Asia/Dhaka";

function dayKey(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: DHAKA, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

function shortLabel(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", day: "2-digit", month: "short" }).format(d);
}

/**
 * Profit / loss over the last N days.
 *
 * Cost of goods is matched against the product's CURRENT cost price — orders
 * only snapshot the selling price — so historical numbers shift if you edit a
 * cost later. Good enough for a trend view, flagged in the UI.
 */
export async function getProfitReport(days: number): Promise<ProfitReport> {
  const since = new Date(Date.now() - days * 86_400_000);

  const [rows, costRows] = await Promise.all([
    db
      .select({
        subtotal: orders.subtotal,
        deliveryCharge: orders.deliveryCharge,
        total: orders.total,
        status: orders.status,
        items: orders.items,
        createdAt: orders.createdAt,
      })
      .from(orders)
      .where(gte(orders.createdAt, since)),
    db.select({ id: products.id, costPrice: products.costPrice }).from(products),
  ]);

  const costOf = new Map(costRows.map((p) => [p.id, p.costPrice ?? 0]));

  /* pre-seed every day so the chart has no holes */
  const bucketCount = days <= 14 ? days : days <= 90 ? 15 : 12;
  const span = days / bucketCount;
  const buckets: ReportBucket[] = [];
  const startMs = Date.now() - days * 86_400_000;
  for (let i = 0; i < bucketCount; i++) {
    const at = new Date(startMs + i * span * 86_400_000);
    buckets.push({ label: shortLabel(dayKey(at)), revenue: 0, profit: 0, orders: 0 });
  }

  const r: ProfitReport = {
    days,
    revenue: 0,
    cogs: 0,
    profit: 0,
    margin: 0,
    deliveryCollected: 0,
    deliveredOrders: 0,
    totalOrders: rows.length,
    pendingValue: 0,
    cancelledValue: 0,
    cancelledOrders: 0,
    avgOrderValue: 0,
    unitsSold: 0,
    buckets,
    missingCost: 0,
  };

  for (const o of rows) {
    const idx = Math.min(bucketCount - 1, Math.max(0, Math.floor((o.createdAt.getTime() - startMs) / (span * 86_400_000))));

    if (o.status === "cancelled") {
      r.cancelledOrders += 1;
      r.cancelledValue += o.total;
      continue;
    }
    if (o.status !== "delivered") {
      r.pendingValue += o.total;
      continue;
    }

    let cogs = 0;
    for (const it of o.items) {
      const unit = costOf.get(it.productId);
      if (!unit) r.missingCost += 1;
      cogs += (unit ?? 0) * it.qty;
      r.unitsSold += it.qty;
    }

    const profit = o.subtotal - cogs;
    r.revenue += o.subtotal;
    r.cogs += cogs;
    r.profit += profit;
    r.deliveryCollected += o.deliveryCharge;
    r.deliveredOrders += 1;

    buckets[idx].revenue += o.subtotal;
    buckets[idx].profit += profit;
    buckets[idx].orders += 1;
  }

  r.margin = r.revenue > 0 ? Math.round((r.profit / r.revenue) * 100) : 0;
  r.avgOrderValue = r.deliveredOrders > 0 ? Math.round(r.revenue / r.deliveredOrders) : 0;
  return r;
}
