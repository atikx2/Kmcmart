"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  Inbox,
  Loader2,
  PackageCheck,
  RotateCcw,
  Search,
  ShoppingCart,
  Trash2,
  Truck,
  X,
  XCircle,
} from "lucide-react";
import { taka } from "@/lib/format";
import {
  ORDER_STATUS_CHIP,
  ORDER_STATUS_LABEL,
  type AdminOrderList,
  type AdminOrderRow,
} from "@/lib/order-status";
import ConfirmModal from "@/components/admin/ConfirmModal";
import Toast, { useToast } from "@/components/admin/Toast";

type TabKey = "all" | "pending" | "confirmed" | "delivered" | "cancelled";

const TABS: { key: TabKey; label: string; icon: React.ComponentType<{ size?: number | string; className?: string }> }[] = [
  { key: "all", label: "All", icon: ShoppingCart },
  { key: "pending", label: "Pending", icon: Clock },
  { key: "confirmed", label: "On The Way", icon: Truck },
  { key: "delivered", label: "Delivered", icon: PackageCheck },
  { key: "cancelled", label: "Cancelled", icon: XCircle },
];

const EMPTY_TEXT: Record<TabKey, string> = {
  all: "No orders yet — they will show up here the moment a customer checks out.",
  pending: "No pending orders right now. Everything is handled 🎉",
  confirmed: "No orders on the way at the moment.",
  delivered: "No delivered orders yet.",
  cancelled: "No cancelled orders — good news!",
};

export default function OrdersClient({
  initial,
  pageSize,
}: {
  initial: AdminOrderList;
  pageSize: number;
}) {
  const router = useRouter();
  const [toast, showToast] = useToast();

  const [status, setStatus] = useState<TabKey>("all");
  const [input, setInput] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);

  const [data, setData] = useState<AdminOrderList>(initial);
  const [loading, setLoading] = useState(false);
  const [toDelete, setToDelete] = useState<AdminOrderRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const firstRender = useRef(true);
  const reqId = useRef(0);

  /* debounce search box */
  useEffect(() => {
    const t = setTimeout(() => {
      setQ(input.trim());
      setPage(0);
    }, 350);
    return () => clearTimeout(t);
  }, [input]);

  const load = useCallback(
    async (nextStatus: TabKey, nextQ: string, nextPage: number) => {
      const id = ++reqId.current;
      setLoading(true);
      try {
        const sp = new URLSearchParams({
          status: nextStatus,
          q: nextQ,
          offset: String(nextPage * pageSize),
          limit: String(pageSize),
        });
        const res = await fetch(`/api/admin/orders?${sp.toString()}`, { cache: "no-store" });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Failed to load orders");
        if (id === reqId.current) setData(json as AdminOrderList);
      } catch (e) {
        if (id === reqId.current) showToast("err", e instanceof Error ? e.message : "Failed to load orders");
      } finally {
        if (id === reqId.current) setLoading(false);
      }
    },
    [pageSize, showToast]
  );

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    load(status, q, page);
  }, [status, q, page, load]);

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/orders/${toDelete.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Delete failed");
      showToast("ok", `Order #${toDelete.code} deleted`);
      setToDelete(null);
      await load(status, q, page);
      router.refresh();
    } catch (e) {
      showToast("err", e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeleting(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(data.total / pageSize));
  const from = data.total === 0 ? 0 : page * pageSize + 1;
  const to = Math.min(data.total, page * pageSize + data.items.length);

  return (
    <div className="space-y-4">
      {/* filter tabs */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_4px_18px_rgba(17,18,28,0.05)] p-3 md:p-4">
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-0.5">
          {TABS.map(({ key, label, icon: Icon }) => {
            const active = status === key;
            const n = data.counts[key];
            return (
              <button
                key={key}
                onClick={() => {
                  setStatus(key);
                  setPage(0);
                }}
                className={`shrink-0 flex items-center gap-2 rounded-2xl px-3.5 md:px-4 py-2.5 text-[12.5px] font-extrabold transition-all ${
                  active
                    ? "grad-bg text-white shadow-[0_8px_22px_rgba(255,61,119,0.3)]"
                    : "bg-gray-50 text-gray-500 hover:bg-gray-100"
                }`}
              >
                <Icon size={15} className={active ? "text-white" : "text-gray-400"} />
                {label}
                <span
                  className={`min-w-[22px] h-5 px-1.5 rounded-full grid place-items-center text-[10.5px] font-extrabold ${
                    active ? "bg-white/25 text-white" : "bg-white text-gray-400 border border-gray-200"
                  }`}
                >
                  {n}
                </span>
              </button>
            );
          })}
        </div>

        {/* search */}
        <div className="mt-3 relative">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="field"
            placeholder="Search by order code, customer name or phone…"
          />
          {input && (
            <button
              onClick={() => setInput("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 grid place-items-center transition"
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* list */}
      <div className="relative bg-white rounded-3xl border border-gray-100 shadow-[0_4px_18px_rgba(17,18,28,0.05)] overflow-hidden">
        {loading && (
          <div className="absolute inset-x-0 top-0 h-[3px] overflow-hidden">
            <div className="h-full w-1/3 grad-bg animate-[shimmer_1.1s_infinite_linear]" />
          </div>
        )}

        <div className="flex items-center justify-between gap-3 px-4 md:px-6 py-4 border-b border-gray-100">
          <h2 className="font-display font-extrabold text-base md:text-lg flex items-center gap-2.5 min-w-0">
            <span className="grad-bg text-white rounded-xl p-2 shrink-0">
              <ShoppingCart size={15} />
            </span>
            <span className="truncate">{TABS.find((t) => t.key === status)?.label} Orders</span>
          </h2>
          <span className="shrink-0 flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-wider text-gray-400">
            {loading && <Loader2 size={13} className="animate-spin text-[var(--g2)]" />}
            {data.total} total
          </span>
        </div>

        {data.items.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <span className="mx-auto w-20 h-20 rounded-full grad-soft grid place-items-center mb-4">
              <Inbox size={30} className="text-gray-400" />
            </span>
            <p className="font-display font-extrabold text-gray-700">
              {q ? "No orders matched your search" : "Nothing here"}
            </p>
            <p className="text-[13px] font-semibold text-gray-400 mt-1.5 max-w-[360px] mx-auto">
              {q ? `No order code, name or phone matches “${q}”.` : EMPTY_TEXT[status]}
            </p>
            {(q || status !== "all") && (
              <button
                onClick={() => {
                  setInput("");
                  setStatus("all");
                  setPage(0);
                }}
                className="mt-5 inline-flex items-center gap-2 grad-bg text-white text-[12.5px] font-extrabold px-5 py-2.5 rounded-full hover:opacity-90 transition"
              >
                <RotateCcw size={14} />
                Reset filters
              </button>
            )}
          </div>
        ) : (
          <>
            {/* ---------- desktop table ---------- */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full min-w-[920px] text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wider text-gray-400 border-b border-gray-100">
                    <th className="font-extrabold px-6 py-3">Order #</th>
                    <th className="font-extrabold px-4 py-3">Customer</th>
                    <th className="font-extrabold px-4 py-3">Items</th>
                    <th className="font-extrabold px-4 py-3">Total</th>
                    <th className="font-extrabold px-4 py-3">Delivery Area</th>
                    <th className="font-extrabold px-4 py-3">Status</th>
                    <th className="font-extrabold px-4 py-3">Date</th>
                    <th className="font-extrabold px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((o) => (
                    <tr
                      key={o.id}
                      onClick={() => router.push(`/admin/orders/${o.code}`)}
                      className="border-b border-gray-50 last:border-0 hover:bg-gray-50/70 transition cursor-pointer"
                    >
                      <td className="px-6 py-3.5 font-extrabold grad-text whitespace-nowrap">#{o.code}</td>
                      <td className="px-4 py-3.5">
                        <span className="block font-bold text-gray-800 max-w-[190px] truncate">{o.customerName}</span>
                        <span className="block text-[11px] text-gray-400 font-semibold">{o.phone}</span>
                      </td>
                      <td className="px-4 py-3.5 font-bold text-gray-500 whitespace-nowrap">{o.itemsCount} pcs</td>
                      <td className="px-4 py-3.5 font-extrabold text-gray-900 whitespace-nowrap">{taka(o.total)}</td>
                      <td className="px-4 py-3.5 text-[12.5px] font-semibold text-gray-500 max-w-[190px] truncate">
                        {o.deliveryAreaName}
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`text-[10.5px] font-extrabold uppercase tracking-wide px-3 py-1.5 rounded-full whitespace-nowrap ${
                            ORDER_STATUS_CHIP[o.status] ?? "bg-gray-100 text-gray-500"
                          }`}
                        >
                          {ORDER_STATUS_LABEL[o.status] ?? o.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-gray-400 font-semibold whitespace-nowrap text-[12.5px]">{o.date}</td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            href={`/admin/orders/${o.code}`}
                            onClick={(e) => e.stopPropagation()}
                            title="View order"
                            className="w-9 h-9 rounded-xl grid place-items-center text-gray-400 hover:text-white hover:grad-bg border border-gray-200 hover:border-transparent transition"
                          >
                            <Eye size={15} />
                          </Link>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setToDelete(o);
                            }}
                            title="Delete order"
                            className="w-9 h-9 rounded-xl grid place-items-center text-gray-400 hover:text-white hover:bg-rose-500 border border-gray-200 hover:border-transparent transition"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ---------- mobile cards ---------- */}
            <div className="lg:hidden divide-y divide-gray-50">
              {data.items.map((o) => (
                <div key={o.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <Link href={`/admin/orders/${o.code}`} className="font-display font-extrabold grad-text text-[15px]">
                      #{o.code}
                    </Link>
                    <span
                      className={`shrink-0 text-[10px] font-extrabold uppercase tracking-wide px-2.5 py-1 rounded-full ${
                        ORDER_STATUS_CHIP[o.status] ?? "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {ORDER_STATUS_LABEL[o.status] ?? o.status}
                    </span>
                  </div>

                  <p className="mt-2 font-bold text-[13.5px] text-gray-800 truncate">{o.customerName}</p>
                  <p className="text-[12px] font-semibold text-gray-400">{o.phone}</p>

                  <div className="mt-2.5 grid grid-cols-2 gap-2 text-[12px]">
                    <div className="bg-gray-50 rounded-xl px-3 py-2 min-w-0">
                      <span className="block text-[10px] font-extrabold uppercase tracking-wide text-gray-400">Items</span>
                      <span className="font-extrabold text-gray-700">{o.itemsCount} pcs</span>
                    </div>
                    <div className="bg-gray-50 rounded-xl px-3 py-2 min-w-0">
                      <span className="block text-[10px] font-extrabold uppercase tracking-wide text-gray-400">Total</span>
                      <span className="font-extrabold text-gray-900">{taka(o.total)}</span>
                    </div>
                  </div>

                  <p className="mt-2 text-[11.5px] font-semibold text-gray-400 truncate">
                    {o.deliveryAreaName} • {o.date}
                  </p>

                  <div className="mt-3 flex items-center gap-2">
                    <Link
                      href={`/admin/orders/${o.code}`}
                      className="flex-1 grad-bg text-white rounded-xl py-2.5 text-[12.5px] font-extrabold flex items-center justify-center gap-2 hover:opacity-90 transition"
                    >
                      <Eye size={14} />
                      View
                    </Link>
                    <button
                      onClick={() => setToDelete(o)}
                      className="w-11 h-10 rounded-xl grid place-items-center text-rose-500 bg-rose-50 hover:bg-rose-100 transition"
                      aria-label="Delete order"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* ---------- pagination ---------- */}
            <div className="flex items-center justify-between gap-3 px-4 md:px-6 py-4 border-t border-gray-100">
              <p className="text-[11.5px] font-extrabold text-gray-400 min-w-0 truncate">
                {from}–{to} of {data.total}
              </p>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0 || loading}
                  className="w-9 h-9 rounded-xl grid place-items-center border border-gray-200 text-gray-500 hover:border-[var(--g1)] hover:text-[var(--g2)] transition disabled:opacity-40 disabled:hover:border-gray-200 disabled:hover:text-gray-500"
                  aria-label="Previous page"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="text-[12px] font-extrabold text-gray-600 px-1 whitespace-nowrap">
                  {page + 1} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => (data.hasMore ? p + 1 : p))}
                  disabled={!data.hasMore || loading}
                  className="w-9 h-9 rounded-xl grid place-items-center border border-gray-200 text-gray-500 hover:border-[var(--g1)] hover:text-[var(--g2)] transition disabled:opacity-40 disabled:hover:border-gray-200 disabled:hover:text-gray-500"
                  aria-label="Next page"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {toDelete && (
        <ConfirmModal
          title={`Delete order #${toDelete.code}?`}
          message={
            <>
              This permanently removes the order of <b className="text-gray-700">{toDelete.customerName}</b> (
              {taka(toDelete.total)}). This cannot be undone.
            </>
          }
          loading={deleting}
          onConfirm={confirmDelete}
          onClose={() => (deleting ? undefined : setToDelete(null))}
        />
      )}

      <Toast state={toast} />
    </div>
  );
}
