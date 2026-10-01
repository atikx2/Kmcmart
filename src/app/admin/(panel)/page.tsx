import {
  Banknote,
  CalendarDays,
  CircleCheck,
  CircleX,
  Clock,
  ShoppingBag,
  TrendingUp,
  Truck,
} from "lucide-react";
import { getDashboardData } from "@/lib/admin-data";
import { taka } from "@/lib/format";
import OrdersChart from "@/components/admin/OrdersChart";

const statusChip: Record<string, string> = {
  pending: "bg-amber-50 text-amber-600 border border-amber-100",
  confirmed: "bg-sky-50 text-sky-600 border border-sky-100",
  delivered: "bg-emerald-50 text-emerald-600 border border-emerald-100",
  cancelled: "bg-rose-50 text-rose-500 border border-rose-100",
};

const statusLabel: Record<string, string> = {
  pending: "Pending",
  confirmed: "On The Way",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export default async function AdminDashboardPage() {
  const { stats, chart, recent } = await getDashboardData();

  const cards = [
    {
      label: "Today's Orders",
      value: String(stats.todaysOrders),
      sub: `${taka(stats.todayRevenue)} revenue today`,
      icon: ShoppingBag,
      gradient: "linear-gradient(135deg,#6366F1,#8B5CF6)",
    },
    {
      label: "This Month Orders",
      value: String(stats.monthsOrders),
      sub: `${taka(stats.monthRevenue)} revenue this month`,
      icon: CalendarDays,
      gradient: "linear-gradient(135deg,#0EA5E9,#22D3EE)",
    },
    {
      label: "Today's Profit",
      value: taka(stats.todaysProfit),
      sub: "After product cost",
      icon: TrendingUp,
      gradient: "linear-gradient(135deg,#FF7A00,#FF3D77)",
    },
    {
      label: "This Month Profit",
      value: taka(stats.monthsProfit),
      sub: "Net profit estimate",
      icon: Banknote,
      gradient: "linear-gradient(135deg,#059669,#34D399)",
    },
    {
      label: "Complete Orders",
      value: String(stats.delivered),
      sub: "All time delivered",
      icon: CircleCheck,
      gradient: "linear-gradient(135deg,#16A34A,#86EFAC)",
    },
    {
      label: "Pending Orders",
      value: String(stats.pending),
      sub: "Waiting for confirmation",
      icon: Clock,
      gradient: "linear-gradient(135deg,#F59E0B,#FBBF24)",
    },
    {
      label: "On The Way",
      value: String(stats.onTheWay),
      sub: "Confirmed / shipping",
      icon: Truck,
      gradient: "linear-gradient(135deg,#3B82F6,#60A5FA)",
    },
    {
      label: "Cancelled",
      value: String(stats.cancelled),
      sub: "All time cancelled",
      icon: CircleX,
      gradient: "linear-gradient(135deg,#F43F5E,#FB7185)",
    },
  ];

  return (
    <div className="space-y-5">
      {/* stat cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4">
        {cards.map(({ label, value, sub, icon: Icon, gradient }) => (
          <div
            key={label}
            className="relative overflow-hidden bg-white rounded-2xl border border-gray-100 shadow-[0_4px_18px_rgba(17,18,28,0.05)] p-4 md:p-5 hover:shadow-[0_12px_34px_rgba(17,18,28,0.1)] hover:-translate-y-0.5 transition-all"
          >
            <div className="absolute -right-7 -top-7 w-24 h-24 rounded-full opacity-[0.08]" style={{ backgroundImage: gradient }} />
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[11px] md:text-xs font-extrabold text-gray-400 uppercase tracking-wide truncate">
                  {label}
                </p>
                <p className="mt-1.5 font-display font-extrabold text-[22px] md:text-[28px] text-gray-900 leading-none">
                  {value}
                </p>
                <p className="mt-2 text-[10.5px] md:text-[11.5px] font-bold text-gray-400 truncate">{sub}</p>
              </div>
              <span
                className="w-10 h-10 md:w-11 md:h-11 rounded-2xl grid place-items-center text-white shrink-0 shadow-md"
                style={{ backgroundImage: gradient }}
              >
                <Icon size={18} />
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* chart */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_4px_18px_rgba(17,18,28,0.05)] p-4 md:p-6">
        <OrdersChart data={chart} />
      </div>

      {/* recent orders */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_4px_18px_rgba(17,18,28,0.05)] overflow-hidden">
        <div className="flex items-center justify-between px-5 md:px-6 py-4 border-b border-gray-100">
          <h2 className="font-display font-extrabold text-base md:text-lg">Recent Orders</h2>
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-gray-400">
            Latest {recent.length}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-gray-400 border-b border-gray-100">
                <th className="font-extrabold px-5 md:px-6 py-3">Order</th>
                <th className="font-extrabold px-4 py-3">Customer</th>
                <th className="font-extrabold px-4 py-3">Items</th>
                <th className="font-extrabold px-4 py-3">Total</th>
                <th className="font-extrabold px-4 py-3">Status</th>
                <th className="font-extrabold px-4 py-3">Date</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((o) => (
                <tr key={o.code} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60 transition">
                  <td className="px-5 md:px-6 py-3.5 font-extrabold grad-text whitespace-nowrap">#{o.code}</td>
                  <td className="px-4 py-3.5">
                    <span className="block font-bold text-gray-800 whitespace-nowrap">{o.customerName}</span>
                    <span className="block text-[11px] text-gray-400 font-semibold">{o.phone}</span>
                  </td>
                  <td className="px-4 py-3.5 font-bold text-gray-500">{o.itemsCount} pcs</td>
                  <td className="px-4 py-3.5 font-extrabold text-gray-900 whitespace-nowrap">{taka(o.total)}</td>
                  <td className="px-4 py-3.5">
                    <span
                      className={`text-[10.5px] font-extrabold uppercase tracking-wide px-3 py-1.5 rounded-full whitespace-nowrap ${
                        statusChip[o.status] ?? "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {statusLabel[o.status] ?? o.status}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-gray-400 font-semibold whitespace-nowrap text-[12.5px]">{o.date}</td>
                </tr>
              ))}
              {recent.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-sm text-gray-400 font-semibold">
                    No orders yet — they will appear here once customers start ordering.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
