"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Activity,
  Banknote,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  Globe,
  Hash,
  Inbox,
  ListChecks,
  Loader2,
  MapPin,
  PackageCheck,
  PackageSearch,
  Pencil,
  Phone,
  Printer,
  Receipt,
  RotateCcw,
  Search,
  ShieldAlert,
  ShoppingCart,
  Trash2,
  Truck,
  User,
  UserRound,
  X,
  XCircle,
} from "lucide-react";
import { taka } from "@/lib/format";
import {
  FRAUD_BAR,
  FRAUD_TEXT,
  ORDERS_PAGE_SIZES,
  ORDER_STATUSES,
  ORDER_STATUS_CHIP,
  ORDER_STATUS_LABEL,
  type AdminOrderList,
  type AdminOrderRow,
  type OrderStatus,
} from "@/lib/order-status";
import ConfirmModal from "@/components/admin/ConfirmModal";
import InlineEdit from "@/components/admin/InlineEdit";
import Toast, { useToast } from "@/components/admin/Toast";

type TabKey = "all" | "pending" | "confirmed" | "delivered" | "cancelled";

const TABS: { key: TabKey; label: string; icon: React.ComponentType<{ size?: number | string; className?: string }> }[] = [
  { key: "all", label: "All", icon: ShoppingCart },
  { key: "pending", label: "Pending", icon: Clock },
  { key: "confirmed", label: "On The Way", icon: Truck },
  { key: "delivered", label: "Delivered", icon: PackageCheck },
  { key: "cancelled", label: "Cancelled", icon: XCircle },
];

const STATUS_ICON: Record<string, React.ComponentType<{ size?: number | string; className?: string }>> = {
  pending: Clock,
  confirmed: Truck,
  delivered: PackageCheck,
  cancelled: XCircle,
};

const STATUS_SELECT: Record<string, string> = {
  pending: "border-amber-200 bg-amber-50 text-amber-700",
  confirmed: "border-sky-200 bg-sky-50 text-sky-700",
  delivered: "border-emerald-200 bg-emerald-50 text-emerald-700",
  cancelled: "border-rose-200 bg-rose-50 text-rose-600",
};

const EMPTY_TEXT: Record<TabKey, string> = {
  all: "No orders yet — they will show up here the moment a customer checks out.",
  pending: "No pending orders right now. Everything is handled 🎉",
  confirmed: "No orders on the way at the moment.",
  delivered: "No delivered orders yet.",
  cancelled: "No cancelled orders — good news!",
};

/* ---------------- small building blocks ---------------- */

function Th({
  icon: Icon,
  label,
  className = "",
}: {
  icon: React.ComponentType<{ size?: number | string; className?: string }>;
  label: string;
  className?: string;
}) {
  return (
    <th className={`font-extrabold px-3 py-3 text-[10.5px] uppercase tracking-wider text-gray-400 ${className}`}>
      <span className="inline-flex items-center gap-1.5">
        <Icon size={12} className="text-[var(--g2)]" />
        {label}
      </span>
    </th>
  );
}

function InfoChip({
  icon: Icon,
  children,
  tone = "default",
}: {
  icon: React.ComponentType<{ size?: number | string; className?: string }>;
  children: React.ReactNode;
  tone?: "default" | "brand";
}) {
  return (
    <span
      className={`flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] font-bold min-w-0 ${
        tone === "brand" ? "grad-soft text-gray-800" : "bg-gray-50 text-gray-600"
      }`}
    >
      <Icon size={11} className="shrink-0 text-[var(--g2)]" />
      <span className="min-w-0 truncate">{children}</span>
    </span>
  );
}

function FraudBar({ fraud }: { fraud: AdminOrderRow["fraud"] }) {
  const pct = fraud.percent ?? 0;
  return (
    <div className="w-[104px]">
      <div className="flex items-center justify-between gap-1">
        <span className={`text-[10px] font-extrabold uppercase tracking-wide ${FRAUD_TEXT[fraud.tone]}`}>
          {fraud.label}
        </span>
        <span className="text-[10.5px] font-extrabold text-gray-500">
          {fraud.percent === null ? "—" : `${fraud.percent}%`}
        </span>
      </div>
      <div className="mt-1 h-[6px] rounded-full bg-gray-100 overflow-hidden">
        <div className={`h-full rounded-full transition-all ${FRAUD_BAR[fraud.tone]}`} style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-1 text-[9.5px] font-bold text-gray-400 whitespace-nowrap">
        {fraud.delivered} ok · {fraud.cancelled} cancel · {fraud.totalOrders} total
      </p>
    </div>
  );
}

function ActionPad({
  code,
  onCourier,
  onDelete,
}: {
  code: string;
  onCourier: () => void;
  onDelete: () => void;
}) {
  const base =
    "w-8 h-8 rounded-full grid place-items-center border border-gray-200 text-gray-400 transition hover:text-white hover:border-transparent";
  return (
    <div className="inline-grid grid-cols-2 gap-1.5">
      <Link href={`/admin/orders/${code}`} title="View order" className={`${base} hover:grad-bg`}>
        <Eye size={14} />
      </Link>
      <Link href={`/admin/orders/${code}?edit=1`} title="Edit order" className={`${base} hover:bg-indigo-500`}>
        <Pencil size={13} />
      </Link>
      <button onClick={onCourier} title="Send to courier" className={`${base} hover:bg-sky-500`}>
        <Truck size={14} />
      </button>
      <button onClick={onDelete} title="Delete order" className={`${base} hover:bg-rose-500`}>
        <Trash2 size={13} />
      </button>
    </div>
  );
}

function ItemTiles({ items, count }: { items: AdminOrderRow["items"]; count: number }) {
  const shown = items.slice(0, 2);
  const rest = items.length - shown.length;
  return (
    <div className="flex items-start gap-2">
      {shown.map((it, i) => (
        <div key={i} className="w-[64px] shrink-0">
          <span className="block w-[64px] h-[52px] rounded-lg overflow-hidden bg-gray-100 grid place-items-center">
            {it.image ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={it.image} alt={it.name} className="w-full h-full object-cover" loading="lazy" />
            ) : (
              <PackageSearch size={16} className="text-gray-300" />
            )}
          </span>
          <span className="mt-1 block text-[10.5px] font-bold text-gray-700 leading-tight line-clamp-2" title={it.name}>
            {it.name}
          </span>
          <span className="mt-0.5 block text-[10px] font-extrabold grad-text">× {it.qty}</span>
        </div>
      ))}
      {rest > 0 && (
        <span className="shrink-0 mt-4 text-[10.5px] font-extrabold text-gray-400 bg-gray-50 rounded-lg px-2 py-1">
          +{rest}
        </span>
      )}
      {items.length === 0 && <span className="text-[11px] font-bold text-gray-400">{count} pcs</span>}
    </div>
  );
}

/* ---------------- page ---------------- */

export default function OrdersClient({ initial }: { initial: AdminOrderList }) {
  const router = useRouter();
  const [toast, showToast] = useToast();

  const [status, setStatus] = useState<TabKey>("all");
  const [input, setInput] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState<number>(initial.limit);

  const [data, setData] = useState<AdminOrderList>(initial);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<number[]>([]);
  const [rowBusy, setRowBusy] = useState<number | null>(null);

  const [toDelete, setToDelete] = useState<AdminOrderRow | null>(null);
  const [bulkDelete, setBulkDelete] = useState(false);
  const [working, setWorking] = useState(false);

  const firstRender = useRef(true);
  const reqId = useRef(0);

  useEffect(() => {
    const t = setTimeout(() => {
      setQ(input.trim());
      setPage(0);
    }, 350);
    return () => clearTimeout(t);
  }, [input]);

  const load = useCallback(
    async (nextStatus: TabKey, nextQ: string, nextPage: number, nextLimit: number) => {
      const id = ++reqId.current;
      setLoading(true);
      try {
        const sp = new URLSearchParams({
          status: nextStatus,
          q: nextQ,
          offset: String(nextPage * nextLimit),
          limit: String(nextLimit),
        });
        const res = await fetch(`/api/admin/orders?${sp.toString()}`, { cache: "no-store" });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Failed to load orders");
        if (id === reqId.current) {
          setData(json as AdminOrderList);
          setSelected([]);
        }
      } catch (e) {
        if (id === reqId.current) showToast("err", e instanceof Error ? e.message : "Failed to load orders");
      } finally {
        if (id === reqId.current) setLoading(false);
      }
    },
    [showToast]
  );

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    load(status, q, page, limit);
  }, [status, q, page, limit, load]);

  const refresh = () => load(status, q, page, limit);

  /* ---------- selection ---------- */
  const pageIds = data.items.map((o) => o.id);
  const allChecked = pageIds.length > 0 && pageIds.every((id) => selected.includes(id));
  const someChecked = selected.length > 0 && !allChecked;

  const toggleAll = () => setSelected(allChecked ? [] : pageIds);
  const toggleOne = (id: number) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  /* ---------- row mutations ---------- */
  const patchRow = (id: number, patch: Partial<AdminOrderRow>) =>
    setData((d) => ({ ...d, items: d.items.map((o) => (o.id === id ? { ...o, ...patch } : o)) }));

  const saveField = async (id: number, body: Record<string, unknown>) => {
    const res = await fetch(`/api/admin/orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Could not save");
    return json;
  };

  const changeStatus = async (o: AdminOrderRow, next: OrderStatus) => {
    if (next === o.status) return;
    setRowBusy(o.id);
    const prev = o.status;
    patchRow(o.id, { status: next });
    try {
      await saveField(o.id, { status: next });
      showToast("ok", `#${o.code} → ${ORDER_STATUS_LABEL[next]}`);
      router.refresh();
    } catch (e) {
      patchRow(o.id, { status: prev });
      showToast("err", e instanceof Error ? e.message : "Status update failed");
    } finally {
      setRowBusy(null);
    }
  };

  const confirmDeleteOne = async () => {
    if (!toDelete) return;
    setWorking(true);
    try {
      const res = await fetch(`/api/admin/orders/${toDelete.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Delete failed");
      showToast("ok", `Order #${toDelete.code} deleted`);
      setSelected((ids) => ids.filter((i) => i !== toDelete.id));
      setToDelete(null);
      await refresh();
      router.refresh();
    } catch (e) {
      showToast("err", e instanceof Error ? e.message : "Delete failed");
    } finally {
      setWorking(false);
    }
  };

  /* ---------- bulk ---------- */
  const bulk = async (action: "status" | "delete" | "courier", bulkStatus?: OrderStatus) => {
    if (selected.length === 0) return;
    setWorking(true);
    try {
      const res = await fetch("/api/admin/orders/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ids: selected, status: bulkStatus }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Bulk action failed");
      showToast(
        "ok",
        action === "delete"
          ? `${json.affected} order(s) deleted`
          : `${json.affected} order(s) → ${ORDER_STATUS_LABEL[bulkStatus ?? ""] ?? ""}`
      );
      setBulkDelete(false);
      if (action === "delete") setSelected([]);
      await refresh();
      router.refresh();
    } catch (e) {
      showToast("err", e instanceof Error ? e.message : "Bulk action failed");
    } finally {
      setWorking(false);
    }
  };

  const printSelected = (ids: number[]) => {
    if (ids.length === 0) return;
    window.open(`/admin/print?ids=${ids.join(",")}`, "_blank", "noopener");
  };

  const courierNotice = () =>
    showToast("err", "Courier API is not connected yet — share the API docs and this will start sending parcels.");

  const totalPages = Math.max(1, Math.ceil(data.total / limit));
  const from = data.total === 0 ? 0 : page * limit + 1;
  const to = Math.min(data.total, page * limit + data.items.length);
  const sl = (i: number) => page * limit + i + 1;

  return (
    <div className="space-y-4">
      {/* ---------------- filters ---------------- */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_4px_18px_rgba(17,18,28,0.05)] p-3 md:p-4">
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-0.5">
          {TABS.map(({ key, label, icon: Icon }) => {
            const active = status === key;
            return (
              <button
                key={key}
                onClick={() => {
                  setStatus(key);
                  setPage(0);
                }}
                className={`shrink-0 flex items-center gap-2 rounded-2xl px-3.5 md:px-4 py-2.5 text-[12.5px] font-extrabold transition-all ${
                  active ? "grad-bg text-white shadow-[0_8px_22px_rgba(255,61,119,0.3)]" : "bg-gray-50 text-gray-500 hover:bg-gray-100"
                }`}
              >
                <Icon size={15} className={active ? "text-white" : "text-gray-400"} />
                {label}
                <span
                  className={`min-w-[22px] h-5 px-1.5 rounded-full grid place-items-center text-[10.5px] font-extrabold ${
                    active ? "bg-white/25 text-white" : "bg-white text-gray-400 border border-gray-200"
                  }`}
                >
                  {data.counts[key]}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-3 relative">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="field"
            placeholder="Search by invoice, customer name or phone…"
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

      {/* ---------------- bulk action bar ---------------- */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_4px_18px_rgba(17,18,28,0.05)] p-3 md:p-4">
        <div className="flex flex-wrap items-center gap-2 md:gap-2.5">
          <span className="flex items-center gap-2 text-[12px] font-extrabold text-gray-600 mr-1">
            <span className="grad-bg text-white rounded-xl p-2 shrink-0">
              <ListChecks size={14} />
            </span>
            <span className="whitespace-nowrap">
              {selected.length > 0 ? `${selected.length} selected` : "Bulk actions"}
            </span>
          </span>

          {/* bulk status */}
          <span className="relative">
            <Activity size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--g2)] pointer-events-none" />
            <select
              value=""
              disabled={selected.length === 0 || working}
              onChange={(e) => {
                const v = e.target.value as OrderStatus;
                if (v) bulk("status", v);
                e.target.value = "";
              }}
              className="appearance-none rounded-xl border-[1.5px] border-gray-200 bg-white pl-8 pr-7 py-2.5 text-[12px] font-extrabold text-gray-700 disabled:opacity-45 cursor-pointer hover:border-[var(--g1)] transition"
            >
              <option value="">Change status</option>
              {ORDER_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {ORDER_STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </span>

          <button
            onClick={() => printSelected(selected)}
            disabled={selected.length === 0}
            className="flex items-center gap-1.5 rounded-xl border-[1.5px] border-gray-200 px-3 py-2.5 text-[12px] font-extrabold text-gray-700 hover:border-[var(--g1)] hover:text-[var(--g2)] transition disabled:opacity-45 disabled:hover:border-gray-200 disabled:hover:text-gray-700"
          >
            <Printer size={14} />
            Print
          </button>

          <button
            onClick={() => (selected.length === 0 ? undefined : courierNotice())}
            disabled={selected.length === 0}
            title="Courier API not connected yet"
            className="flex items-center gap-1.5 rounded-xl border-[1.5px] border-gray-200 px-3 py-2.5 text-[12px] font-extrabold text-gray-700 hover:border-sky-400 hover:text-sky-600 transition disabled:opacity-45 disabled:hover:border-gray-200 disabled:hover:text-gray-700"
          >
            <Truck size={14} />
            Courier Sent
            <span className="text-[8.5px] font-extrabold tracking-wider bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded-md">
              SOON
            </span>
          </button>

          <button
            onClick={() => setBulkDelete(true)}
            disabled={selected.length === 0}
            className="flex items-center gap-1.5 rounded-xl border-[1.5px] border-rose-200 bg-rose-50 px-3 py-2.5 text-[12px] font-extrabold text-rose-600 hover:bg-rose-100 transition disabled:opacity-45"
          >
            <Trash2 size={14} />
            Delete
          </button>

          {selected.length > 0 && (
            <button
              onClick={() => setSelected([])}
              className="text-[12px] font-extrabold text-gray-400 hover:text-gray-700 px-2 py-2.5 transition"
            >
              Clear
            </button>
          )}

          {/* rows per page */}
          <span className="ml-auto flex items-center gap-2 text-[11.5px] font-extrabold text-gray-400">
            Show
            <select
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setPage(0);
              }}
              className="rounded-xl border-[1.5px] border-gray-200 bg-white px-2.5 py-2 text-[12px] font-extrabold text-gray-700 cursor-pointer hover:border-[var(--g1)] transition"
            >
              {ORDERS_PAGE_SIZES.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            orders
          </span>
        </div>
      </div>

      {/* ---------------- list ---------------- */}
      <div className="relative bg-white rounded-3xl border border-gray-100 shadow-[0_4px_18px_rgba(17,18,28,0.05)] overflow-hidden">
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
              {q ? `No invoice, name or phone matches “${q}”.` : EMPTY_TEXT[status]}
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
            <div className="hidden xl:block overflow-x-auto">
              <table className="w-full min-w-[1240px] text-sm">
                <thead>
                  <tr className="text-left border-b border-gray-100 bg-gray-50/60">
                    <th className="px-3 py-3 w-[42px]">
                      <input
                        type="checkbox"
                        checked={allChecked}
                        ref={(el) => {
                          if (el) el.indeterminate = someChecked;
                        }}
                        onChange={toggleAll}
                        className="w-4 h-4 accent-[var(--g2)] cursor-pointer"
                        aria-label="Select all orders on this page"
                      />
                    </th>
                    <Th icon={Hash} label="SL" className="w-[56px]" />
                    <Th icon={Receipt} label="Info" />
                    <Th icon={UserRound} label="Customer Info" />
                    <Th icon={Banknote} label="Price" />
                    <Th icon={PackageSearch} label="Order Details" />
                    <Th icon={Activity} label="Status" />
                    <Th icon={ShieldAlert} label="Fraud" />
                    <Th icon={Eye} label="Action" className="text-right" />
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((o, i) => {
                    const StatusIcon = STATUS_ICON[o.status] ?? Clock;
                    const checked = selected.includes(o.id);
                    return (
                      <tr
                        key={o.id}
                        className={`border-b border-gray-50 last:border-0 align-top transition ${
                          checked ? "bg-[color-mix(in_srgb,var(--g2)_5%,white)]" : "hover:bg-gray-50/60"
                        }`}
                      >
                        <td className="px-3 py-3.5">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleOne(o.id)}
                            className="w-4 h-4 accent-[var(--g2)] cursor-pointer"
                            aria-label={`Select order ${o.code}`}
                          />
                        </td>

                        <td className="px-3 py-3.5">
                          <span className="inline-grid place-items-center w-7 h-7 rounded-lg bg-gray-100 text-[11.5px] font-extrabold text-gray-600">
                            {sl(i)}
                          </span>
                        </td>

                        {/* info */}
                        <td className="px-3 py-3.5">
                          <div className="flex flex-col gap-1 w-[168px]">
                            <InfoChip icon={Receipt} tone="brand">
                              <Link href={`/admin/orders/${o.code}`} className="grad-text font-extrabold">
                                #{o.code}
                              </Link>
                            </InfoChip>
                            <InfoChip icon={CalendarDays}>{o.date}</InfoChip>
                            <InfoChip icon={Globe}>{o.customerIp ?? "IP not captured"}</InfoChip>
                          </div>
                        </td>

                        {/* customer */}
                        <td className="px-3 py-3.5">
                          <div className="flex flex-col gap-1.5 w-[212px]">
                            <span className="flex items-center gap-1.5 text-[12.5px] font-bold text-gray-800 min-w-0">
                              <User size={12} className="shrink-0 text-[var(--g2)]" />
                              <span className="truncate">{o.customerName}</span>
                            </span>
                            <a
                              href={`tel:${o.phone}`}
                              className="flex items-center gap-1.5 text-[12px] font-bold text-gray-500 hover:grad-text min-w-0"
                            >
                              <Phone size={12} className="shrink-0 text-[var(--g2)]" />
                              <span className="truncate">{o.phone}</span>
                            </a>
                            <InlineEdit
                              value={o.address}
                              title="Edit address"
                              as="textarea"
                              prefix={<MapPin size={12} className="shrink-0 mt-[3px] text-[var(--g2)]" />}
                              display={
                                <span className="block text-[11.5px] font-semibold text-gray-500 leading-snug line-clamp-3">
                                  {o.address}
                                </span>
                              }
                              onSave={async (next) => {
                                await saveField(o.id, { address: next });
                                patchRow(o.id, { address: next });
                                showToast("ok", `Address updated for #${o.code}`);
                              }}
                            />
                          </div>
                        </td>

                        {/* price */}
                        <td className="px-3 py-3.5">
                          <div className="w-[132px]">
                            <InlineEdit
                              value={String(o.total)}
                              type="number"
                              title="Edit total"
                              inputClassName="w-[90px]"
                              prefix={<Banknote size={13} className="shrink-0 mt-[2px] text-[var(--g2)]" />}
                              display={
                                <span className="font-display font-extrabold text-[15px] grad-text">{taka(o.total)}</span>
                              }
                              onSave={async (next) => {
                                const n = Number(next);
                                if (!Number.isFinite(n) || n < 0) throw new Error("Invalid amount");
                                await saveField(o.id, { total: n });
                                patchRow(o.id, { total: Math.round(n) });
                                showToast("ok", `Total updated for #${o.code}`);
                              }}
                            />
                            <p className="mt-1 text-[10.5px] font-bold text-gray-400 leading-tight">
                              Sub {taka(o.subtotal)} · Dlv {taka(o.deliveryCharge)}
                            </p>
                            <p className="text-[10.5px] font-bold text-gray-400 truncate" title={o.deliveryAreaName}>
                              {o.deliveryAreaName}
                            </p>
                          </div>
                        </td>

                        {/* items */}
                        <td className="px-3 py-3.5">
                          <ItemTiles items={o.items} count={o.itemsCount} />
                        </td>

                        {/* status */}
                        <td className="px-3 py-3.5">
                          <div className="w-[138px]">
                            <span
                              className={`inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wide px-2.5 py-1 rounded-full mb-1.5 ${
                                ORDER_STATUS_CHIP[o.status] ?? "bg-gray-100 text-gray-500"
                              }`}
                            >
                              <StatusIcon size={11} />
                              {ORDER_STATUS_LABEL[o.status] ?? o.status}
                            </span>
                            <span className="relative block">
                              <select
                                value={o.status}
                                disabled={rowBusy === o.id}
                                onChange={(e) => changeStatus(o, e.target.value as OrderStatus)}
                                className={`w-full appearance-none rounded-xl border-[1.5px] px-2.5 py-2 pr-7 text-[11.5px] font-extrabold cursor-pointer transition disabled:opacity-60 ${
                                  STATUS_SELECT[o.status] ?? "border-gray-200 bg-white text-gray-700"
                                }`}
                              >
                                {ORDER_STATUSES.map((s) => (
                                  <option key={s} value={s}>
                                    {ORDER_STATUS_LABEL[s]}
                                  </option>
                                ))}
                              </select>
                              {rowBusy === o.id && (
                                <Loader2
                                  size={12}
                                  className="absolute right-2 top-1/2 -translate-y-1/2 animate-spin text-gray-500"
                                />
                              )}
                            </span>
                          </div>
                        </td>

                        {/* fraud */}
                        <td className="px-3 py-3.5">
                          <FraudBar fraud={o.fraud} />
                        </td>

                        {/* actions */}
                        <td className="px-3 py-3.5">
                          <div className="flex justify-end">
                            <ActionPad code={o.code} onCourier={courierNotice} onDelete={() => setToDelete(o)} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* ---------- mobile / tablet cards ---------- */}
            <div className="xl:hidden divide-y divide-gray-50">
              {data.items.map((o, i) => {
                const StatusIcon = STATUS_ICON[o.status] ?? Clock;
                const checked = selected.includes(o.id);
                return (
                  <div key={o.id} className={`p-4 ${checked ? "bg-[color-mix(in_srgb,var(--g2)_5%,white)]" : ""}`}>
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleOne(o.id)}
                        className="mt-1 w-4 h-4 accent-[var(--g2)] shrink-0"
                        aria-label={`Select order ${o.code}`}
                      />
                      <span className="inline-grid place-items-center w-7 h-7 rounded-lg bg-gray-100 text-[11.5px] font-extrabold text-gray-600 shrink-0">
                        {sl(i)}
                      </span>
                      <div className="min-w-0 flex-1 space-y-1">
                        <InfoChip icon={Receipt} tone="brand">
                          <Link href={`/admin/orders/${o.code}`} className="grad-text font-extrabold">
                            #{o.code}
                          </Link>
                        </InfoChip>
                        <InfoChip icon={CalendarDays}>{o.date}</InfoChip>
                        <InfoChip icon={Globe}>{o.customerIp ?? "IP not captured"}</InfoChip>
                      </div>
                      <span
                        className={`shrink-0 inline-flex items-center gap-1 text-[9.5px] font-extrabold uppercase tracking-wide px-2 py-1 rounded-full ${
                          ORDER_STATUS_CHIP[o.status] ?? "bg-gray-100 text-gray-500"
                        }`}
                      >
                        <StatusIcon size={10} />
                        {ORDER_STATUS_LABEL[o.status] ?? o.status}
                      </span>
                    </div>

                    <div className="mt-3 space-y-1.5">
                      <span className="flex items-center gap-1.5 text-[13px] font-bold text-gray-800 min-w-0">
                        <User size={12} className="shrink-0 text-[var(--g2)]" />
                        <span className="truncate">{o.customerName}</span>
                      </span>
                      <a href={`tel:${o.phone}`} className="flex items-center gap-1.5 text-[12.5px] font-bold text-gray-500">
                        <Phone size={12} className="shrink-0 text-[var(--g2)]" />
                        {o.phone}
                      </a>
                      <InlineEdit
                        value={o.address}
                        title="Edit address"
                        as="textarea"
                        prefix={<MapPin size={12} className="shrink-0 mt-[3px] text-[var(--g2)]" />}
                        display={
                          <span className="block text-[12px] font-semibold text-gray-500 leading-snug">{o.address}</span>
                        }
                        onSave={async (next) => {
                          await saveField(o.id, { address: next });
                          patchRow(o.id, { address: next });
                          showToast("ok", `Address updated for #${o.code}`);
                        }}
                      />
                    </div>

                    <div className="mt-3 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <InlineEdit
                          value={String(o.total)}
                          type="number"
                          title="Edit total"
                          inputClassName="w-[90px]"
                          prefix={<Banknote size={13} className="shrink-0 mt-[2px] text-[var(--g2)]" />}
                          display={<span className="font-display font-extrabold text-[16px] grad-text">{taka(o.total)}</span>}
                          onSave={async (next) => {
                            const n = Number(next);
                            if (!Number.isFinite(n) || n < 0) throw new Error("Invalid amount");
                            await saveField(o.id, { total: n });
                            patchRow(o.id, { total: Math.round(n) });
                            showToast("ok", `Total updated for #${o.code}`);
                          }}
                        />
                        <p className="mt-0.5 text-[10.5px] font-bold text-gray-400">
                          Sub {taka(o.subtotal)} · Dlv {taka(o.deliveryCharge)} · {o.deliveryAreaName}
                        </p>
                      </div>
                      <FraudBar fraud={o.fraud} />
                    </div>

                    <div className="mt-3">
                      <ItemTiles items={o.items} count={o.itemsCount} />
                    </div>

                    <div className="mt-3 flex items-center gap-2">
                      <span className="relative flex-1 min-w-0">
                        <select
                          value={o.status}
                          disabled={rowBusy === o.id}
                          onChange={(e) => changeStatus(o, e.target.value as OrderStatus)}
                          className={`w-full appearance-none rounded-xl border-[1.5px] px-3 py-2.5 pr-8 text-[12px] font-extrabold cursor-pointer transition disabled:opacity-60 ${
                            STATUS_SELECT[o.status] ?? "border-gray-200 bg-white text-gray-700"
                          }`}
                        >
                          {ORDER_STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {ORDER_STATUS_LABEL[s]}
                            </option>
                          ))}
                        </select>
                        {rowBusy === o.id && (
                          <Loader2 size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 animate-spin text-gray-500" />
                        )}
                      </span>
                      <ActionPad code={o.code} onCourier={courierNotice} onDelete={() => setToDelete(o)} />
                    </div>
                  </div>
                );
              })}
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
                  className="w-9 h-9 rounded-xl grid place-items-center border border-gray-200 text-gray-500 hover:border-[var(--g1)] hover:text-[var(--g2)] transition disabled:opacity-40"
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
                  className="w-9 h-9 rounded-xl grid place-items-center border border-gray-200 text-gray-500 hover:border-[var(--g1)] hover:text-[var(--g2)] transition disabled:opacity-40"
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
          loading={working}
          onConfirm={confirmDeleteOne}
          onClose={() => (working ? undefined : setToDelete(null))}
        />
      )}

      {bulkDelete && (
        <ConfirmModal
          title={`Delete ${selected.length} order(s)?`}
          message="All selected orders will be permanently removed. This cannot be undone."
          loading={working}
          confirmLabel={`Delete ${selected.length}`}
          onConfirm={() => bulk("delete")}
          onClose={() => (working ? undefined : setBulkDelete(false))}
        />
      )}

      <Toast state={toast} />
    </div>
  );
}
