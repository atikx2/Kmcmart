import { NextRequest } from "next/server";
import { guardAdmin } from "@/lib/admin-api";
import { getProfitReport, rangeFromKey } from "@/lib/admin-reports";

export const dynamic = "force-dynamic";

function cell(v: string | number): string {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function row(cells: (string | number)[]): string {
  return cells.map(cell).join(",");
}

export async function GET(req: NextRequest) {
  const denied = await guardAdmin("reports");
  if (denied) return denied;

  const picked = rangeFromKey(req.nextUrl.searchParams.get("range") ?? undefined);
  const r = await getProfitReport(picked.days);

  const lines = [
    row(["KMC Mart — Profit & Loss report"]),
    row([`Last ${picked.label}`, `generated ${new Date().toISOString()}`]),
    "",
    row(["Summary", "Value"]),
    row(["Revenue (delivered)", r.revenue]),
    row(["Cost of goods", r.cogs]),
    row(["Profit", r.profit]),
    row(["Margin %", r.margin]),
    row(["Delivery collected", r.deliveryCollected]),
    row(["Delivered orders", r.deliveredOrders]),
    row(["Total orders", r.totalOrders]),
    row(["Pending value", r.pendingValue]),
    row(["Cancelled orders", r.cancelledOrders]),
    row(["Cancelled value", r.cancelledValue]),
    row(["Average order value", r.avgOrderValue]),
    row(["Units sold", r.unitsSold]),
    "",
    row(["Period", "Revenue", "Profit", "Orders"]),
    ...r.buckets.map((b) => row([b.label, b.revenue, b.profit, b.orders])),
    "",
    row(["Top product", "Units", "Revenue", "Profit"]),
    ...r.topProducts.map((p) => row([p.name, p.units, p.revenue, p.profit])),
  ];

  const csv = "\uFEFF" + lines.join("\r\n");
  const stamp = new Date().toISOString().slice(0, 10);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="kmcbazar-report-${picked.key}d-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
