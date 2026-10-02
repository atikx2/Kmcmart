"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Activity,
  Boxes,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  CircleUserRound,
  Clock,
  Eye,
  Fingerprint,
  Inbox,
  ListChecks,
  Loader2,
  MapPinned,
  MousePointerClick,
  PackageCheck,
  PackageSearch,
  Pencil,
  PackageX,
  PhoneCall,
  Printer,
  ReceiptText,
  RotateCcw,
  Search,
  ShieldAlert,
  ShieldCheck,
  ShieldQuestionMark,
  ShoppingBasket,
  ShoppingCart,
  Send,
  Trash2,
  Truck,
  User,
  Wallet,
  X,
  XCircle,
} from "lucide-react";
import { taka } from "@/lib/format";
import {
  FRAUD_BAR,
  FRAUD_TEXT,
  ORDERS_PAGE_SIZES,
  selectableStatuses,
  statusColor,
  statusLabel,
  statusTint,
  type AdminOrderList,
  type AdminOrderRow,
  type OrderStatus,
  type OrderStatusOption,
} from "@/lib/order-status";
import { COURIER_TONE_CHIP, courierStatusLabel, courierStatusTone, type CourierSendResult } from "@/lib/courier";
import {
  FRAUD_TONE_BAR,
  FRAUD_TONE_CHIP,
  FRAUD_TONE_TEXT,
  formatRate,
  fraudRiskLabel,
  fraudTone,
  type FraudCheckReport,
} from "@/lib/fraud-check";
import FraudModal from "@/components/admin/FraudModal";
import ConfirmModal from "@/components/admin/ConfirmModal";
import InlineEdit from "@/components/admin/InlineEdit";
import Toast, { useToast } from "@/components/admin/Toast";

type IconCmp = React.ComponentType<{
  size?: number | string;
  className?: string;
  strokeWidth?: number;
  style?: React.CSSProperties;
}>;

/* Icons for the four built-in keys — admin-made statuses get a neutral dot. */
const STATUS_ICON: Record<string, IconCmp> = {
  pending: Clock,
  confirmed: Truck,
  delivered: PackageCheck,
  cancelled: XCircle,
};

const EMPTY_TEXT: Record<string, string> = {
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
  icon: React.ComponentType<{ size?: number | string; className?: string; strokeWidth?: number }>;
  label: string;
  className?: string;
}) {
  return (
    <th className={`px-3 py-3.5 align-middle ${className}`}>
      <span className="inline-flex items-center gap-2 whitespace-nowrap">
        <span className="w-[26px] h-[26px] rounded-[9px] bg-white grid place-items-center text-[var(--g2)] shadow-[0_1px_3px_rgba(17,18,28,0.07),inset_0_0_0_1px_rgba(255,122,0,0.14)]">
          <Icon size={13} strokeWidth={2.4} />
        </span>
        <span className="text-[10.5px] font-extrabold uppercase tracking-[0.14em] text-gray-500">{label}</span>
      </span>
    </th>
  );
}

function InfoChip({
  icon: Icon,
  children,
  tone = "default",
  title,
}: {
  icon: React.ComponentType<{ size?: number | string; className?: string; strokeWidth?: number }>;
  children: React.ReactNode;
  tone?: "default" | "brand";
  title?: string;
}) {
  return (
    <span
      title={title}
      className={`flex items-center gap-2 rounded-xl pl-1.5 pr-2.5 py-1.5 text-[11px] font-bold min-w-0 border transition ${
        tone === "brand"
          ? "grad-soft border-[color-mix(in_srgb,var(--g1)_22%,transparent)] text-gray-800"
          : "bg-[#fafafc] border-gray-100 text-gray-600 hover:border-gray-200"
      }`}
    >
      <span
        className={`w-[22px] h-[22px] rounded-lg grid place-items-center shrink-0 ${
          tone === "brand" ? "grad-bg text-white" : "bg-white text-[var(--g2)] shadow-[0_1px_2px_rgba(17,18,28,0.08)]"
        }`}
      >
        <Icon size={11} strokeWidth={2.5} />
      </span>
      <span className="min-w-0 truncate">{children}</span>
    </span>
  );
}

const FRAUD_CHIP: Record<string, string> = {
  emerald: "bg-emerald-50 text-emerald-600 ring-emerald-100",
  amber: "bg-amber-50 text-amber-600 ring-amber-100",
  rose: "bg-rose-50 text-rose-600 ring-rose-100",
  slate: "bg-slate-100 text-slate-500 ring-slate-200",
};

const FRAUD_GLOW: Record<string, string> = {
  emerald: "shadow-[0_0_10px_rgba(16,185,129,0.45)]",
  amber: "shadow-[0_0_10px_rgba(245,158,11,0.45)]",
  rose: "shadow-[0_0_10px_rgba(244,63,94,0.45)]",
  slate: "",
};

/**
 * The courier-wide report when we have one, this shop's own record otherwise.
 * Clicking opens the per-courier breakdown.
 */
function FraudBar({
  fraud,
  report,
  onOpen,
}: {
  fraud: AdminOrderRow["fraud"];
  report: FraudCheckReport | null;
  onOpen: () => void;
}) {
  const external = report && report.totalParcels > 0;
  const tone = report ? fraudTone(report) : fraud.tone;

  const pct = external ? report.deliveryRate : (fraud.percent ?? 0);
  const headline = external
    ? `${formatRate(report.deliveryRate)}%`
    : fraud.percent === null
      ? "—"
      : `${fraud.percent}%`;
  const label = report ? fraudRiskLabel(report) : fraud.label;
  const delivered = external ? report.totalDelivered : fraud.delivered;
  const cancelled = external ? report.totalCancelled : fraud.cancelled;
  const total = external ? report.totalParcels : fraud.totalOrders;

  const chip = external ? FRAUD_TONE_CHIP[tone] : (FRAUD_CHIP[tone] ?? FRAUD_CHIP.slate);
  const text = external ? FRAUD_TONE_TEXT[tone] : FRAUD_TEXT[tone];
  const bar = external ? FRAUD_TONE_BAR[tone] : FRAUD_BAR[tone];

  const Icon = tone === "rose" ? ShieldAlert : tone === "slate" ? ShieldQuestionMark : ShieldCheck;

  return (
    <button
      onClick={onOpen}
      title={
        report
          ? "Courier-wide record — tap for the breakdown"
          : "Not checked by the fraud API yet — tap to check"
      }
      className="w-[124px] text-left rounded-xl -m-1 p-1 hover:bg-[#fff7f3] transition cursor-pointer"
    >
      <div className="flex items-center justify-between gap-1.5">
        <span
          className={`inline-flex items-center gap-1 text-[9.5px] font-extrabold uppercase tracking-[0.1em] px-2 py-[3px] rounded-full ring-1 ${chip}`}
        >
          <Icon size={10} strokeWidth={2.6} />
          <span className="truncate max-w-[52px]">{label}</span>
        </span>
        <span className={`font-display text-[13px] font-extrabold leading-none ${text}`}>{headline}</span>
      </div>

      <div className="relative mt-2 h-[8px] rounded-full bg-gray-100 shadow-[inset_0_1px_2px_rgba(17,18,28,0.09)] overflow-hidden">
        <span className="absolute inset-0 opacity-[0.55] bg-[repeating-linear-gradient(135deg,transparent_0_5px,rgba(255,255,255,0.7)_5px_10px)]" />
        <div
          className={`relative h-full rounded-full transition-[width] duration-500 ease-out ${bar} ${
            FRAUD_GLOW[tone] ?? ""
          }`}
          style={{ width: `${Math.min(100, Math.max(pct, pct === 0 ? 0 : 6))}%` }}
        >
          <span className="absolute inset-x-0 top-0 h-1/2 rounded-full bg-gradient-to-b from-white/45 to-transparent" />
        </div>
      </div>

      <div className="mt-2 flex items-center gap-2.5 text-[9.5px] font-extrabold text-gray-400">
        <span className="inline-flex items-center gap-1 text-emerald-500">
          <CheckCircle2 size={10} strokeWidth={2.6} />
          {delivered}
        </span>
        <span className="inline-flex items-center gap-1 text-rose-400">
          <XCircle size={10} strokeWidth={2.6} />
          {cancelled}
        </span>
        <span className="inline-flex items-center gap-1">
          <Boxes size={10} strokeWidth={2.6} />
          {total}
        </span>
        {external && <ChevronRight size={11} strokeWidth={3} className="ml-auto text-gray-300" />}
      </div>
    </button>
  );
}

const ACTION_BTN =
  "w-[30px] h-[30px] rounded-full grid place-items-center transition-all duration-200 shadow-[0_1px_3px_rgba(17,18,28,0.08)] hover:-translate-y-0.5 hover:shadow-[0_6px_14px_rgba(17,18,28,0.18)]";

function ActionPad({
  code,
  courierState,
  busy,
  onCourier,
  onDelete,
}: {
  code: string;
  /** "sent" locks the button for good — a parcel is never booked twice. */
  courierState: "sent" | "ready" | "off";
  busy: boolean;
  onCourier: () => void;
  onDelete: () => void;
}) {
  const courierTitle =
    courierState === "sent"
      ? "Already sent to the courier"
      : courierState === "off"
        ? "Courier is not connected — set it up on the API page"
        : "Send this order to the courier";

  return (
    <div className="inline-grid grid-cols-2 gap-1.5 p-1.5 rounded-2xl bg-[#fafafc] border border-gray-100">
      <Link
        href={`/admin/orders/${code}`}
        title="View order"
        className={`${ACTION_BTN} grad-soft text-[var(--g2)] hover:grad-bg hover:text-white`}
      >
        <Eye size={14} strokeWidth={2.4} />
      </Link>
      <Link
        href={`/admin/orders/${code}?edit=1`}
        title="Edit order"
        className={`${ACTION_BTN} bg-indigo-50 text-indigo-500 hover:bg-indigo-500 hover:text-white`}
      >
        <Pencil size={13} strokeWidth={2.4} />
      </Link>
      <button
        onClick={onCourier}
        disabled={busy || courierState !== "ready"}
        title={courierTitle}
        className={`${ACTION_BTN} ${
          courierState === "sent"
            ? "bg-emerald-50 text-emerald-500 cursor-not-allowed shadow-none hover:translate-y-0 hover:shadow-none"
            : courierState === "off"
              ? "bg-gray-100 text-gray-300 cursor-not-allowed shadow-none hover:translate-y-0 hover:shadow-none"
              : "bg-sky-50 text-sky-500 hover:bg-sky-500 hover:text-white"
        }`}
      >
        {busy ? (
          <Loader2 size={13} className="animate-spin" />
        ) : courierState === "sent" ? (
          <PackageCheck size={14} strokeWidth={2.4} />
        ) : courierState === "off" ? (
          <PackageX size={14} strokeWidth={2.4} />
        ) : (
          <Truck size={14} strokeWidth={2.4} />
        )}
      </button>
      <button
        onClick={onDelete}
        title="Delete order"
        className={`${ACTION_BTN} bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white`}
      >
        <Trash2 size={13} strokeWidth={2.4} />
      </button>
    </div>
  );
}

/** Long product names used to stretch the row — show the first two words only. */
function shortName(name: string): string {
  const words = name.trim().split(/\s+/);
  return words.length <= 2 ? name : `${words.slice(0, 2).join(" ")}…`;
}

function ItemTiles({ items, count }: { items: AdminOrderRow["items"]; count: number }) {
  const shown = items.slice(0, 2);
  const rest = count - shown.reduce((a, i) => a + i.qty, 0);
  return (
    <div className="flex items-start gap-2 w-[176px]">
      {shown.map((it, i) => (
        <div key={i} className="w-[64px] shrink-0">
          <span className="relative grid place-items-center w-[64px] h-[54px] rounded-xl overflow-hidden bg-gray-100 ring-1 ring-gray-100 shadow-[0_1px_3px_rgba(17,18,28,0.08)]">
            {it.image ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={it.image} alt={it.name} className="w-full h-full object-cover" loading="lazy" />
            ) : (
              <PackageSearch size={16} className="text-gray-300" />
            )}
            <span className="absolute bottom-1 right-1 grad-bg text-white text-[9px] font-extrabold leading-none px-1.5 py-[3px] rounded-md shadow-sm">
              ×{it.qty}
            </span>
          </span>
          <span
            className="mt-1.5 block text-[10.5px] font-bold text-gray-700 leading-tight truncate"
            title={it.name}
          >
            {shortName(it.name)}
          </span>
        </div>
      ))}
      {rest > 0 && (
        <span className="shrink-0 mt-5 inline-grid place-items-center min-w-[34px] h-[26px] px-1.5 text-[10.5px] font-extrabold text-gray-500 bg-[#fafafc] border border-gray-100 rounded-lg">
          +{rest}
        </span>
      )}
      {items.length === 0 && <span className="text-[11px] font-bold text-gray-400">{count} pcs</span>}
    </div>
  );
}

/* ---------------- page ---------------- */

export default function OrdersClient({
  initial,
  statuses,
  courierOn,
}: {
  initial: AdminOrderList;
  statuses: OrderStatusOption[];
  /** Courier connected and switched on — set on the API page. */
  courierOn: boolean;
}) {
  const router = useRouter();
  const [toast, showToast] = useToast();

  /* "all" + every status the admin manages on the Delivery Area page. */
  const tabs: { key: string; label: string; icon: IconCmp; color: string | null }[] = [
    { key: "all", label: "All", icon: ShoppingCart, color: null },
    ...statuses.map((s) => ({
      key: s.key,
      label: s.label,
      icon: STATUS_ICON[s.key] ?? CircleDot,
      color: s.color,
    })),
  ];
  const colorOf = (key: string) => statusColor(statuses, key);
  const labelOf = (key: string) => statusLabel(statuses, key);

  const [status, setStatus] = useState<string>("all");
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
  const [courierBusy, setCourierBusy] = useState<number | null>(null);
  const [fraudFor, setFraudFor] = useState<AdminOrderRow | null>(null);
  const [bulkCourier, setBulkCourier] = useState(false);

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
    async (nextStatus: string, nextQ: string, nextPage: number, nextLimit: number) => {
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
      showToast("ok", `#${o.code} → ${labelOf(next)}`);
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
          : `${json.affected} order(s) → ${labelOf(bulkStatus ?? "")}`
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

  /* ---------- courier ---------- */
  const applySendResults = (results: CourierSendResult[]) => {
    setData((d) => ({
      ...d,
      items: d.items.map((o) => {
        const r = results.find((x) => x.orderId === o.id && x.ok);
        if (!r) return o;
        return {
          ...o,
          courierConsignmentId: r.consignmentId ?? o.courierConsignmentId,
          courierTrackingCode: r.trackingCode ?? o.courierTrackingCode,
          courierTrackingLink: r.trackingLink ?? o.courierTrackingLink,
          courierStatus: o.courierStatus ?? "in_review",
        };
      }),
    }));
  };

  const postSend = async (ids: number[]) => {
    const res = await fetch("/api/admin/courier/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Could not send to the courier");
    return json as { sent: number; failed: number; results: CourierSendResult[] };
  };

  const sendOne = async (o: AdminOrderRow) => {
    if (o.courierConsignmentId || !courierOn) return;
    setCourierBusy(o.id);
    try {
      const json = await postSend([o.id]);
      applySendResults(json.results);
      const r = json.results[0];
      if (r?.ok) showToast("ok", `#${o.code} booked — consignment ${r.consignmentId}`);
      else showToast("err", r?.error ?? "Courier refused the parcel");
      await refresh();
      router.refresh();
    } catch (e) {
      showToast("err", e instanceof Error ? e.message : "Could not send to the courier");
    } finally {
      setCourierBusy(null);
    }
  };

  const sendSelected = async () => {
    const ids = data.items.filter((o) => selected.includes(o.id) && !o.courierConsignmentId).map((o) => o.id);
    if (ids.length === 0) {
      setBulkCourier(false);
      showToast("err", "Every selected order has already been sent");
      return;
    }
    setWorking(true);
    try {
      const json = await postSend(ids);
      applySendResults(json.results);
      setBulkCourier(false);
      const firstError = json.results.find((r) => !r.ok)?.error;
      if (json.sent > 0) {
        showToast(
          "ok",
          json.failed > 0
            ? `${json.sent} sent, ${json.failed} failed — ${firstError ?? ""}`
            : `${json.sent} order(s) sent to the courier`
        );
      } else {
        showToast("err", firstError ?? "Nothing could be sent");
      }
      await refresh();
      router.refresh();
    } catch (e) {
      showToast("err", e instanceof Error ? e.message : "Bulk courier send failed");
    } finally {
      setWorking(false);
    }
  };

  const selectedUnsent = data.items.filter((o) => selected.includes(o.id) && !o.courierConsignmentId).length;

  const totalPages = Math.max(1, Math.ceil(data.total / limit));
  const from = data.total === 0 ? 0 : page * limit + 1;
  const to = Math.min(data.total, page * limit + data.items.length);
  const sl = (i: number) => page * limit + i + 1;

  return (
    <div className="space-y-4">
      {/* ---------------- filters ---------------- */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_4px_18px_rgba(17,18,28,0.05)] p-3 md:p-4">
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-0.5">
          {tabs.map(({ key, label, icon: Icon, color }) => {
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
                <Icon
                  size={15}
                  className={active ? "text-white" : "text-gray-400"}
                  style={active || !color ? undefined : { color }}
                />
                <span className="whitespace-nowrap">{label}</span>
                <span
                  className={`min-w-[22px] h-5 px-1.5 rounded-full grid place-items-center text-[10.5px] font-extrabold ${
                    active ? "bg-white/25 text-white" : "bg-white text-gray-400 border border-gray-200"
                  }`}
                >
                  {data.counts[key] ?? 0}
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
                const v = e.target.value;
                if (v) bulk("status", v);
                e.target.value = "";
              }}
              className="appearance-none rounded-xl border-[1.5px] border-gray-200 bg-white pl-8 pr-7 py-2.5 text-[12px] font-extrabold text-gray-700 disabled:opacity-45 cursor-pointer hover:border-[var(--g1)] transition"
            >
              <option value="">Change status</option>
              {statuses
                .filter((s) => s.isActive)
                .map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
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
            onClick={() => setBulkCourier(true)}
            disabled={selected.length === 0 || !courierOn || working}
            title={
              courierOn
                ? "Book the selected orders as courier parcels"
                : "Courier is not connected — set it up on the API page"
            }
            className="flex items-center gap-1.5 rounded-xl border-[1.5px] border-sky-200 bg-sky-50 px-3 py-2.5 text-[12px] font-extrabold text-sky-600 hover:bg-sky-100 transition disabled:opacity-45"
          >
            <Send size={14} />
            Send to Courier
            {selectedUnsent > 0 && (
              <span className="text-[9.5px] font-extrabold bg-white text-sky-600 ring-1 ring-sky-200 px-1.5 py-0.5 rounded-md">
                {selectedUnsent}
              </span>
            )}
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
            <span className="truncate">{tabs.find((t) => t.key === status)?.label ?? "All"} Orders</span>
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
              {q
                ? `No invoice, name or phone matches “${q}”.`
                : (EMPTY_TEXT[status] ?? `No orders are marked “${labelOf(status)}” right now.`)}
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
            {/* ---------- table (same table on every screen; scrolls inside the
                 card so the page itself never overflows sideways) ---------- */}
            <div className="relative">
              <div className="overflow-x-auto overscroll-x-contain [scrollbar-width:thin] [scrollbar-color:#d8d8e2_transparent]">
                <table className="w-full min-w-[1040px] text-sm">
                  <thead>
                    <tr className="text-left bg-gradient-to-r from-[#fff8f3] via-[#fff6f8] to-[#fff4f8] border-y border-gray-100">
                      <th className="px-3 py-3.5 w-[48px]">
                        <span className="flex flex-col items-center gap-1">
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
                          <span className="text-[8.5px] font-extrabold uppercase tracking-wider text-gray-400">All</span>
                        </span>
                      </th>
                      <Th icon={ReceiptText} label="Info" />
                      <Th icon={CircleUserRound} label="Customer Info" />
                      <Th icon={Wallet} label="Price" />
                      <Th icon={ShoppingBasket} label="Order Details" />
                      <Th icon={Activity} label="Status" />
                      <Th icon={ShieldCheck} label="Fraud" />
                      <Th icon={MousePointerClick} label="Action" className="text-right" />
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((o, i) => {
                      const StatusIcon = STATUS_ICON[o.status] ?? CircleDot;
                      const checked = selected.includes(o.id);
                      return (
                        <tr
                          key={o.id}
                          className={`group border-b border-gray-50 last:border-0 align-top transition-colors ${
                            checked
                              ? "bg-[color-mix(in_srgb,var(--g2)_6%,white)]"
                              : i % 2 === 1
                                ? "bg-[#fcfcfd] hover:bg-[#fff7f3]"
                                : "hover:bg-[#fff7f3]"
                          }`}
                        >
                          {/* checkbox + serial */}
                          <td className="px-3 py-4">
                            <span className="flex flex-col items-center gap-1.5">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleOne(o.id)}
                                className="w-4 h-4 accent-[var(--g2)] cursor-pointer"
                                aria-label={`Select order ${o.code}`}
                              />
                              <span className="text-[10px] font-extrabold text-gray-300 group-hover:text-gray-400 transition-colors">
                                {sl(i)}
                              </span>
                            </span>
                          </td>

                          {/* info */}
                          <td className="px-3 py-4">
                            <div className="flex flex-col gap-1.5 w-[162px]">
                              <InfoChip icon={ReceiptText} tone="brand" title="Invoice number">
                                <Link href={`/admin/orders/${o.code}`} className="grad-text font-extrabold">
                                  #{o.code}
                                </Link>
                              </InfoChip>
                              <InfoChip icon={CalendarDays} title="Order date">
                                {o.date}
                              </InfoChip>
                              <InfoChip icon={Fingerprint} title="Customer IP address">
                                {o.customerIp ?? "No IP"}
                              </InfoChip>
                              {o.courierConsignmentId && (
                                <span
                                  title={`Courier: ${courierStatusLabel(o.courierStatus)}${
                                    o.courierSentAt ? ` · sent ${o.courierSentAt}` : ""
                                  }`}
                                  className={`inline-flex items-center gap-1.5 text-[10px] font-extrabold px-2 py-[5px] rounded-lg ring-1 ${
                                    COURIER_TONE_CHIP[courierStatusTone(o.courierStatus)]
                                  }`}
                                >
                                  <Truck size={11} strokeWidth={2.6} className="shrink-0" />
                                  <span className="truncate">
                                    {o.courierTrackingCode || o.courierConsignmentId}
                                  </span>
                                </span>
                              )}
                            </div>
                          </td>

                          {/* customer */}
                          <td className="px-3 py-4">
                            <div className="flex flex-col gap-1.5 w-[196px]">
                              <span className="flex items-center gap-2 text-[12.5px] font-extrabold text-gray-800 min-w-0">
                                <span className="w-[22px] h-[22px] rounded-lg grad-soft grid place-items-center shrink-0 text-[var(--g2)]">
                                  <User size={11} strokeWidth={2.5} />
                                </span>
                                <span className="truncate">{o.customerName}</span>
                              </span>
                              <a
                                href={`tel:${o.phone}`}
                                className="flex items-center gap-2 text-[12px] font-bold text-gray-600 hover:grad-text min-w-0"
                              >
                                <span className="w-[22px] h-[22px] rounded-lg bg-[#fafafc] border border-gray-100 grid place-items-center shrink-0 text-[var(--g2)]">
                                  <PhoneCall size={11} strokeWidth={2.5} />
                                </span>
                                <span className="truncate">{o.phone}</span>
                              </a>
                              <InlineEdit
                                value={o.address}
                                title="Edit address"
                                as="textarea"
                                prefix={
                                  <span className="w-[22px] h-[22px] rounded-lg bg-[#fafafc] border border-gray-100 grid place-items-center shrink-0 text-[var(--g2)] mt-[1px]">
                                    <MapPinned size={11} strokeWidth={2.5} />
                                  </span>
                                }
                                display={
                                  <span className="block text-[11.5px] font-semibold text-gray-500 leading-snug line-clamp-2">
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
                          <td className="px-3 py-4">
                            <div className="w-[126px]">
                              <InlineEdit
                                value={String(o.total)}
                                type="number"
                                title="Edit total"
                                inputClassName="w-[88px]"
                                prefix={
                                  <span className="w-[22px] h-[22px] rounded-lg grad-soft grid place-items-center shrink-0 text-[var(--g2)] mt-[2px]">
                                    <Wallet size={11} strokeWidth={2.5} />
                                  </span>
                                }
                                display={
                                  <span className="font-display font-extrabold text-[15.5px] grad-text leading-none">
                                    {taka(o.total)}
                                  </span>
                                }
                                onSave={async (next) => {
                                  const n = Number(next);
                                  if (!Number.isFinite(n) || n < 0) throw new Error("Invalid amount");
                                  await saveField(o.id, { total: n });
                                  patchRow(o.id, { total: Math.round(n) });
                                  showToast("ok", `Total updated for #${o.code}`);
                                }}
                              />
                              <div className="mt-2 flex flex-wrap gap-1">
                                <span className="text-[9.5px] font-extrabold text-gray-500 bg-[#fafafc] border border-gray-100 rounded-md px-1.5 py-[3px]">
                                  Sub {taka(o.subtotal)}
                                </span>
                                <span className="text-[9.5px] font-extrabold text-gray-500 bg-[#fafafc] border border-gray-100 rounded-md px-1.5 py-[3px]">
                                  Dlv {taka(o.deliveryCharge)}
                                </span>
                              </div>
                              <p
                                className="mt-1 text-[10px] font-bold text-gray-400 truncate"
                                title={o.deliveryAreaName}
                              >
                                {o.deliveryAreaName}
                              </p>
                            </div>
                          </td>

                          {/* items */}
                          <td className="px-3 py-4">
                            <ItemTiles items={o.items} count={o.itemsCount} />
                          </td>

                          {/* status */}
                          <td className="px-3 py-4">
                            <div className="w-[130px]">
                              <span className="relative block">
                                <StatusIcon
                                  size={13}
                                  strokeWidth={2.6}
                                  className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
                                  style={{ color: colorOf(o.status) }}
                                />
                                <select
                                  value={o.status}
                                  disabled={rowBusy === o.id}
                                  onChange={(e) => changeStatus(o, e.target.value)}
                                  style={statusTint(colorOf(o.status))}
                                  className="w-full appearance-none rounded-xl border-[1.5px] pl-8 pr-7 py-2.5 text-[11.5px] font-extrabold cursor-pointer transition disabled:opacity-60 hover:shadow-[0_2px_8px_rgba(17,18,28,0.08)]"
                                >
                                  {selectableStatuses(statuses, o.status).map((s) => (
                                    <option key={s.key} value={s.key} className="text-gray-700">
                                      {s.label}
                                    </option>
                                  ))}
                                </select>
                                {rowBusy === o.id ? (
                                  <Loader2
                                    size={12}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 animate-spin text-gray-500 pointer-events-none"
                                  />
                                ) : (
                                  <ChevronDown
                                    size={13}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 opacity-60 pointer-events-none"
                                  />
                                )}
                              </span>
                            </div>
                          </td>

                          {/* fraud */}
                          <td className="px-3 py-4">
                            <FraudBar
                              fraud={o.fraud}
                              report={o.fraudReport}
                              onOpen={() => setFraudFor(o)}
                            />
                          </td>

                          {/* actions */}
                          <td className="px-3 py-4">
                            <div className="flex justify-end">
                              <ActionPad
                                code={o.code}
                                courierState={o.courierConsignmentId ? "sent" : courierOn ? "ready" : "off"}
                                busy={courierBusy === o.id}
                                onCourier={() => sendOne(o)}
                                onDelete={() => setToDelete(o)}
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* soft edge so it reads as "scroll me" on narrow screens */}
              <span className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-white to-transparent 2xl:hidden" />
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

      {bulkCourier && (
        <ConfirmModal
          title={`Send ${selectedUnsent} order(s) to the courier?`}
          message="Each one is booked as a real parcel at Steadfast and cannot be un-booked from here. Orders that were already sent are skipped automatically."
          loading={working}
          confirmLabel={`Send ${selectedUnsent}`}
          onConfirm={sendSelected}
          onClose={() => (working ? undefined : setBulkCourier(false))}
        />
      )}

      {fraudFor && (
        <FraudModal
          phone={fraudFor.phone}
          customerName={fraudFor.customerName}
          report={fraudFor.fraudReport}
          ownHistory={fraudFor.fraud}
          onClose={() => setFraudFor(null)}
          onUpdated={(r) => {
            /* One report serves every order from that number. */
            setData((d) => ({
              ...d,
              items: d.items.map((o) => (o.phone === r.phone ? { ...o, fraudReport: r } : o)),
            }));
            setFraudFor((f) => (f ? { ...f, fraudReport: r } : f));
          }}
        />
      )}

      <Toast state={toast} />
    </div>
  );
}
