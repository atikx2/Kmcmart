import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  Banknote,
  CalendarRange,
  ChartColumn,
  CircleDollarSign,
  Download,
  Clock,
  Hourglass,
  Crown,
  Info,
  Package,
  Percent,
  Receipt,
  TrendingUp,
  Truck,
  X,
} from "lucide-react";
import { taka } from "@/lib/format";
import { getProfitReport, rangeFromKey, REPORT_RANGES } from "@/lib/admin-reports";
import type { IconCmp } from "@/components/admin/table-ui";
import { requirePermission } from "@/lib/admin-guard";

export const metadata: Metadata = { title: "Report · Admin" };
export const dynamic = "force-dynamic";

function Metric({
  icon: Icon,
  label,
  value,
  sub,
  tone = "slate",
}: {
  icon: IconCmp;
  label: string;
  value: string;
  sub?: string;
  tone?: "brand" | "emerald" | "rose" | "slate" | "amber";
}) {
  const ring: Record<string, string> = {
    brand: "text-[var(--g2)] grad-soft",
    emerald: "text-emerald-600 bg-emerald-50",
    rose: "text-rose-500 bg-rose-50",
    amber: "text-amber-600 bg-amber-50",
    slate: "text-gray-500 bg-gray-100",
  };
  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_4px_18px_rgba(17,18,28,0.05)] p-4">
      <span className={`w-10 h-10 rounded-2xl grid place-items-center ${ring[tone]}`}>
        <Icon size={17} strokeWidth={2.3} />
      </span>
      <p className="mt-3 text-[10.5px] font-extrabold uppercase tracking-[0.14em] text-gray-400">{label}</p>
      <p className="font-display text-[20px] md:text-[22px] font-extrabold text-gray-900 leading-tight mt-1 break-words">
        {value}
      </p>
      {sub && <p className="text-[11px] font-bold text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

export default async function AdminReportPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  await requirePermission("reports");
  const { range } = await searchParams;
  const picked = rangeFromKey(range);
  const r = await getProfitReport(picked.days);

  const peak = Math.max(1, ...r.buckets.map((b) => b.revenue));
  const loss = r.profit < 0;

  return (
    <div className="space-y-4">
      {/* demo notice + range filter */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_4px_18px_rgba(17,18,28,0.05)] p-3 md:p-4">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          <p className="flex items-start gap-2 text-[11.5px] font-bold text-sky-700 bg-sky-50 border border-sky-100 rounded-2xl px-3.5 py-2.5 min-w-0 flex-1">
            <Info size={14} className="shrink-0 mt-[1px]" />
            <span className="min-w-0">
              Profit is counted from <b>delivered</b> orders only, using each product&apos;s current cost price. Keep
              cost prices up to date and these numbers stay accurate.
            </span>
          </p>

          <div className="shrink-0 flex gap-1.5 overflow-x-auto no-scrollbar -mx-1 px-1 lg:mx-0 lg:px-0">
            {REPORT_RANGES.map((opt) => {
              const active = opt.key === picked.key;
              return (
                <Link
                  key={opt.key}
                  href={`/admin/reports?range=${opt.key}`}
                  className={`shrink-0 flex items-center gap-2 rounded-2xl px-3.5 py-2.5 text-[12px] font-extrabold transition ${
                    active ? "grad-bg text-white shadow-[0_8px_20px_rgba(255,61,119,0.3)]" : "text-gray-500 hover:bg-gray-50"
                  }`}
                >
                  <CalendarRange size={14} strokeWidth={2.4} />
                  {opt.label}
                </Link>
              );
            })}

            <a
              href={`/api/admin/reports/export?range=${picked.key}`}
              className="shrink-0 flex items-center gap-2 rounded-2xl px-3.5 py-2.5 text-[12px] font-extrabold text-gray-600 bg-[#fafafc] border border-gray-100 hover:border-[var(--g1)] hover:text-[var(--g2)] transition"
            >
              <Download size={14} strokeWidth={2.4} />
              CSV
            </a>
          </div>
        </div>
      </div>

      {/* headline metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Metric
          icon={CircleDollarSign}
          tone="brand"
          label="Revenue"
          value={taka(r.revenue)}
          sub={`${r.deliveredOrders} delivered orders`}
        />
        <Metric icon={Receipt} tone="slate" label="Product cost" value={taka(r.cogs)} sub={`${r.unitsSold} units sold`} />
        <Metric
          icon={loss ? AlertTriangle : TrendingUp}
          tone={loss ? "rose" : "emerald"}
          label={loss ? "Loss" : "Gross profit"}
          value={taka(Math.abs(r.profit))}
          sub={loss ? "Costs are above revenue" : "Revenue − product cost"}
        />
        <Metric icon={Percent} tone={loss ? "rose" : "emerald"} label="Margin" value={`${r.margin}%`} sub="of delivered revenue" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Metric icon={Truck} tone="slate" label="Delivery collected" value={taka(r.deliveryCollected)} sub="passed to courier" />
        <Metric icon={Banknote} tone="slate" label="Avg order value" value={taka(r.avgOrderValue)} sub="delivered only" />
        <Metric icon={Hourglass} tone="amber" label="In progress" value={taka(r.pendingValue)} sub="pending + on the way" />
        <Metric icon={X} tone="rose" label="Cancelled" value={taka(r.cancelledValue)} sub={`${r.cancelledOrders} orders`} />
      </div>

      {/* chart */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_4px_18px_rgba(17,18,28,0.05)] overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-4 md:px-6 py-4 border-b border-gray-100">
          <h2 className="font-display font-extrabold text-base md:text-lg flex items-center gap-2.5 min-w-0">
            <span className="grad-bg text-white rounded-xl p-2 shrink-0">
              <ChartColumn size={15} strokeWidth={2.4} />
            </span>
            <span className="truncate">Revenue &amp; profit</span>
          </h2>
          <div className="shrink-0 flex items-center gap-3 text-[10.5px] font-extrabold uppercase tracking-wider text-gray-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm grad-bg" />
              Revenue
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-400" />
              Profit
            </span>
          </div>
        </div>

        <div className="px-4 md:px-6 py-5">
          {r.deliveredOrders === 0 ? (
            <div className="py-12 text-center">
              <span className="mx-auto w-20 h-20 rounded-full grad-soft grid place-items-center mb-4">
                <ChartColumn size={30} className="text-gray-400" />
              </span>
              <p className="font-display font-extrabold text-gray-700">No delivered orders in this range</p>
              <p className="text-[13px] font-semibold text-gray-400 mt-1.5">
                Mark orders as Delivered and the profit chart fills up here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto overscroll-x-contain no-scrollbar">
              <div className="flex items-end gap-2 md:gap-3 min-w-[560px] h-[190px]">
                {r.buckets.map((b, i) => {
                  const rh = Math.round((b.revenue / peak) * 100);
                  const ph = Math.round((Math.max(0, b.profit) / peak) * 100);
                  return (
                    <div key={i} className="flex-1 min-w-[18px] h-full flex flex-col justify-end items-center gap-1.5 group">
                      <span className="text-[9.5px] font-extrabold text-gray-400 opacity-0 group-hover:opacity-100 transition whitespace-nowrap">
                        {taka(b.revenue)}
                      </span>
                      <span className="w-full flex items-end justify-center gap-[3px] h-full">
                        <span
                          className="w-1/2 grad-bg rounded-t-md transition-all"
                          style={{ height: `${Math.max(rh, b.revenue > 0 ? 3 : 0)}%` }}
                          title={`Revenue ${taka(b.revenue)}`}
                        />
                        <span
                          className="w-1/2 bg-emerald-400 rounded-t-md transition-all"
                          style={{ height: `${Math.max(ph, b.profit > 0 ? 3 : 0)}%` }}
                          title={`Profit ${taka(b.profit)}`}
                        />
                      </span>
                      <span className="text-[9px] font-extrabold text-gray-400 whitespace-nowrap">{b.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="px-4 md:px-6 py-3.5 border-t border-gray-100 flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] font-bold text-gray-400">
          <span className="flex items-center gap-1.5">
            <Clock size={12} />
            Last {picked.label}
          </span>
          <span className="flex items-center gap-1.5">
            <Package size={12} />
            {r.totalOrders} orders placed
          </span>
          {r.missingCost > 0 && (
            <span className="flex items-center gap-1.5 text-amber-600">
              <AlertTriangle size={12} />
              {r.missingCost} sold items have no cost price — profit is overstated for those
            </span>
          )}
        </div>
      </div>

      {/* best sellers */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_4px_18px_rgba(17,18,28,0.05)] overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-4 md:px-6 py-4 border-b border-gray-100">
          <h2 className="font-display font-extrabold text-base md:text-lg flex items-center gap-2.5 min-w-0">
            <span className="grad-bg text-white rounded-xl p-2 shrink-0">
              <Crown size={15} strokeWidth={2.4} />
            </span>
            <span className="truncate">Best Sellers</span>
          </h2>
          <span className="shrink-0 text-[11px] font-extrabold uppercase tracking-wider text-gray-400">
            Top {r.topProducts.length}
          </span>
        </div>

        {r.topProducts.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <X size={26} className="mx-auto text-gray-300" />
            <p className="mt-2 font-extrabold text-gray-500 text-[13px]">No delivered sales in this range</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-50">
            {r.topProducts.map((p, i) => {
              const share = Math.round((p.revenue / Math.max(1, r.topProducts[0].revenue)) * 100);
              return (
                <li key={p.productId} className="flex items-center gap-3 px-4 md:px-6 py-3.5 hover:bg-[#fff7f3] transition-colors">
                  <span className="inline-grid place-items-center w-7 h-7 rounded-lg bg-[#fafafc] border border-gray-100 text-[11px] font-extrabold text-gray-500 shrink-0">
                    {i + 1}
                  </span>
                  {p.image ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={p.image} alt="" className="w-10 h-10 rounded-xl object-cover border border-gray-100 shrink-0" loading="lazy" />
                  ) : (
                    <span className="w-10 h-10 rounded-xl bg-gray-100 shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-[12.5px] font-extrabold text-gray-800 truncate">{p.name}</p>
                    <div className="mt-1.5 h-[6px] rounded-full bg-gray-100 overflow-hidden max-w-[320px]">
                      <span className="block h-full grad-bg rounded-full" style={{ width: `${share}%` }} />
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-display text-[14px] font-extrabold grad-text whitespace-nowrap">{taka(p.revenue)}</p>
                    <p className="text-[10.5px] font-extrabold text-gray-400 whitespace-nowrap">
                      {p.units} sold · {p.profit >= 0 ? "+" : "−"}
                      {taka(Math.abs(p.profit))} profit
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
