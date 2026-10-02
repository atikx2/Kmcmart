import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  BadgeCheck,
  CalendarClock,
  ChevronRight,
  CircleDollarSign,
  Clock,
  MapPin,
  Package,
  Phone,
  Receipt,
  ShieldCheck,
  ShoppingBag,
  Truck,
  User,
  X,
} from "lucide-react";
import { taka } from "@/lib/format";
import { statusLabel, statusTint, FRAUD_BAR, FRAUD_TEXT } from "@/lib/order-status";
import { listOrderStatuses } from "@/lib/admin-order-statuses";
import { getAdminCustomer } from "@/lib/admin-customers";
import { requirePermission } from "@/lib/admin-guard";
import type { IconCmp } from "@/components/admin/table-ui";

export const metadata: Metadata = { title: "Customer · Admin" };
export const dynamic = "force-dynamic";

function Stat({
  icon: Icon,
  label,
  value,
  tone = "slate",
}: {
  icon: IconCmp;
  label: string;
  value: string;
  tone?: "brand" | "emerald" | "rose" | "amber" | "slate";
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
      <p className="font-display text-[20px] font-extrabold text-gray-900 leading-tight mt-1 break-words">{value}</p>
    </div>
  );
}

export default async function AdminCustomerDetailPage({
  params,
}: {
  params: Promise<{ phone: string }>;
}) {
  await requirePermission("customers");

  const { phone } = await params;
  const [customer, statuses] = await Promise.all([
    getAdminCustomer(decodeURIComponent(phone)),
    listOrderStatuses(),
  ]);
  if (!customer) notFound();

  const statusColorFor = (key: string) => statuses.find((s) => s.key === key)?.color ?? "#6B7280";

  return (
    <div className="space-y-4">
      {/* profile header */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_4px_18px_rgba(17,18,28,0.05)] overflow-hidden">
        <div className="px-4 md:px-6 py-4 border-b border-gray-100">
          <Link
            href="/admin/customers"
            className="inline-flex items-center gap-2 text-[12px] font-extrabold text-gray-500 hover:text-[var(--g2)] transition"
          >
            <ArrowLeft size={15} />
            All customers
          </Link>
        </div>

        <div className="p-4 md:p-6 flex flex-col md:flex-row md:items-start gap-4 md:gap-6">
          <span className="w-16 h-16 rounded-3xl grad-bg text-white grid place-items-center shrink-0 shadow-[0_10px_26px_rgba(255,61,119,0.32)]">
            <User size={26} strokeWidth={2.2} />
          </span>

          <div className="min-w-0 flex-1">
            <h2 className="font-display font-extrabold text-xl md:text-2xl text-gray-900 break-words">
              {customer.name}
            </h2>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <a
                href={`tel:${customer.phone}`}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#fafafc] border border-gray-100 px-2.5 py-1.5 text-[12px] font-extrabold text-gray-700 hover:border-[var(--g1)] hover:text-[var(--g2)] transition"
              >
                <Phone size={12} strokeWidth={2.5} className="text-[var(--g2)]" />
                {customer.phone}
              </a>
              {customer.hasAccount ? (
                <span className="inline-flex items-center gap-1 text-[9.5px] font-extrabold uppercase tracking-wider px-2 py-[5px] rounded-full ring-1 bg-emerald-50 text-emerald-600 ring-emerald-100">
                  <BadgeCheck size={11} strokeWidth={2.6} />
                  Registered {customer.joinedAt ? `· ${customer.joinedAt}` : ""}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[9.5px] font-extrabold uppercase tracking-wider px-2 py-[5px] rounded-full ring-1 bg-gray-100 text-gray-500 ring-gray-200">
                  Guest checkout
                </span>
              )}
            </div>

            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-[11.5px] font-bold text-gray-400">
              <span className="inline-flex items-center gap-1.5">
                <CalendarClock size={13} />
                First order {customer.firstOrderAt}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock size={13} />
                Last order {customer.lastOrderAt}
              </span>
            </div>
          </div>

          {/* trust */}
          <div className="w-full md:w-[190px] shrink-0 rounded-2xl border border-gray-100 bg-[#fafafc] p-3.5">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 text-[10.5px] font-extrabold uppercase tracking-wider text-gray-400">
                <ShieldCheck size={13} />
                Trust score
              </span>
              <span className={`font-display text-[17px] font-extrabold leading-none ${FRAUD_TEXT[customer.fraud.tone]}`}>
                {customer.fraud.percent === null ? "—" : `${customer.fraud.percent}%`}
              </span>
            </div>
            <div className="relative mt-2.5 h-[9px] rounded-full bg-gray-200/70 overflow-hidden">
              <div
                className={`h-full rounded-full ${FRAUD_BAR[customer.fraud.tone]}`}
                style={{ width: `${customer.fraud.percent ?? 0}%` }}
              />
            </div>
            <p className={`mt-2 text-[11px] font-extrabold ${FRAUD_TEXT[customer.fraud.tone]}`}>
              {customer.fraud.label}
            </p>
            <p className="mt-0.5 text-[10px] font-bold text-gray-400">
              {customer.delivered} delivered · {customer.cancelled} cancelled
            </p>
          </div>
        </div>
      </div>

      {/* stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat icon={Package} tone="brand" label="Total orders" value={String(customer.orderCount)} />
        <Stat icon={CircleDollarSign} tone="emerald" label="Total spent" value={taka(customer.spent)} />
        <Stat icon={Receipt} tone="slate" label="Avg order" value={taka(customer.avgOrder)} />
        <Stat icon={ShoppingBag} tone="amber" label="Items bought" value={String(customer.unitsBought)} />
      </div>

      {/* addresses */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_4px_18px_rgba(17,18,28,0.05)] overflow-hidden">
        <div className="flex items-center gap-2.5 px-4 md:px-6 py-4 border-b border-gray-100">
          <span className="grad-bg text-white rounded-xl p-2 shrink-0">
            <MapPin size={15} strokeWidth={2.4} />
          </span>
          <h3 className="font-display font-extrabold text-base md:text-lg">
            Delivery addresses
            <span className="ml-2 text-[11px] font-extrabold text-gray-400 uppercase tracking-wider">
              {customer.addresses.length} used
            </span>
          </h3>
        </div>
        <ul className="divide-y divide-gray-50">
          {customer.addresses.map((a, i) => (
            <li key={i} className="flex items-start gap-3 px-4 md:px-6 py-3.5">
              <span className="w-6 h-6 rounded-lg bg-[#fafafc] border border-gray-100 grid place-items-center text-[10px] font-extrabold text-gray-500 shrink-0 mt-[1px]">
                {i + 1}
              </span>
              <p className="text-[12.5px] font-semibold text-gray-600 leading-relaxed min-w-0">{a}</p>
              {i === 0 && (
                <span className="ml-auto shrink-0 text-[9px] font-extrabold uppercase tracking-wider grad-bg text-white px-2 py-1 rounded-full">
                  Latest
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>

      {/* order history */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_4px_18px_rgba(17,18,28,0.05)] overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-4 md:px-6 py-4 border-b border-gray-100">
          <h3 className="font-display font-extrabold text-base md:text-lg flex items-center gap-2.5 min-w-0">
            <span className="grad-bg text-white rounded-xl p-2 shrink-0">
              <Package size={15} strokeWidth={2.4} />
            </span>
            <span className="truncate">Order history</span>
          </h3>
          <div className="shrink-0 flex flex-wrap items-center gap-1.5">
            {customer.delivered > 0 && (
              <span className="text-[9.5px] font-extrabold px-2 py-1 rounded-md bg-emerald-50 text-emerald-600 border border-emerald-100">
                {customer.delivered} delivered
              </span>
            )}
            {customer.confirmed + customer.pending > 0 && (
              <span className="text-[9.5px] font-extrabold px-2 py-1 rounded-md bg-amber-50 text-amber-600 border border-amber-100">
                {customer.confirmed + customer.pending} open
              </span>
            )}
            {customer.cancelled > 0 && (
              <span className="text-[9.5px] font-extrabold px-2 py-1 rounded-md bg-rose-50 text-rose-500 border border-rose-100">
                {customer.cancelled} cancelled
              </span>
            )}
          </div>
        </div>

        <ul className="divide-y divide-gray-50">
          {customer.orders.map((o) => (
            <li key={o.id} className="px-4 md:px-6 py-4 hover:bg-[#fff7f3] transition-colors">
              <div className="flex flex-wrap items-center gap-2.5">
                <Link
                  href={`/admin/orders/${o.code}`}
                  className="font-display font-extrabold text-[14px] text-gray-800 hover:grad-text"
                >
                  #{o.code}
                </Link>
                <span
                  className="text-[9.5px] font-extrabold uppercase tracking-wider px-2 py-[4px] rounded-full border"
                  style={statusTint(statusColorFor(o.status))}
                >
                  {statusLabel(statuses, o.status)}
                </span>
                <span className="text-[11px] font-bold text-gray-400">{o.createdAt}</span>
                <span className="ml-auto font-display font-extrabold text-[15px] grad-text whitespace-nowrap">
                  {taka(o.total)}
                </span>
                <Link
                  href={`/admin/orders/${o.code}`}
                  className="w-8 h-8 rounded-full bg-[#fafafc] border border-gray-100 grid place-items-center text-gray-400 hover:border-[var(--g1)] hover:text-[var(--g2)] transition shrink-0"
                  aria-label={`Open order ${o.code}`}
                >
                  <ChevronRight size={15} />
                </Link>
              </div>

              <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] font-bold text-gray-400">
                <span className="inline-flex items-center gap-1.5">
                  <ShoppingBag size={12} />
                  {o.itemCount} item{o.itemCount === 1 ? "" : "s"}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Truck size={12} />
                  {o.deliveryAreaName} · {o.deliveryCharge === 0 ? "Free" : taka(o.deliveryCharge)}
                </span>
                <span className="inline-flex items-center gap-1.5 min-w-0">
                  <MapPin size={12} className="shrink-0" />
                  <span className="truncate max-w-[280px]">{o.address}</span>
                </span>
              </div>

              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {o.items.slice(0, 4).map((it, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#fafafc] border border-gray-100 pl-1 pr-2 py-1 max-w-[230px]"
                  >
                    {it.image ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={it.image} alt="" className="w-5 h-5 rounded object-cover shrink-0" loading="lazy" />
                    ) : (
                      <span className="w-5 h-5 rounded bg-gray-100 shrink-0" />
                    )}
                    <span className="text-[10.5px] font-extrabold text-gray-600 truncate">{it.name}</span>
                    <span className="text-[10px] font-extrabold text-gray-400 shrink-0">×{it.qty}</span>
                  </span>
                ))}
                {o.items.length > 4 && (
                  <span className="inline-flex items-center rounded-lg bg-[#fafafc] border border-gray-100 px-2 py-1 text-[10.5px] font-extrabold text-gray-500">
                    +{o.items.length - 4} more
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>

        {customer.orders.length === 0 && (
          <div className="px-6 py-12 text-center">
            <X size={26} className="mx-auto text-gray-300" />
            <p className="mt-2 font-extrabold text-gray-500 text-[13px]">No orders found</p>
          </div>
        )}
      </div>
    </div>
  );
}
