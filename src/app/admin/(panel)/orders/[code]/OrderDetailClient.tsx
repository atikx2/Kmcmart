"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Clock,
  Globe,
  Loader2,
  MapPin,
  PackageCheck,
  Pencil,
  Phone,
  Plus,
  Printer,
  ReceiptText,
  ShieldAlert,
  ShoppingBag,
  Trash2,
  Truck,
  User,
  X,
  XCircle,
} from "lucide-react";
import { taka } from "@/lib/format";
import {
  FRAUD_BAR,
  FRAUD_TEXT,
  ORDER_STATUSES,
  ORDER_STATUS_CHIP,
  ORDER_STATUS_LABEL,
  type AdminOrderDetail,
  type OrderStatus,
} from "@/lib/order-status";
import type { OrderItem } from "@/db/schema";
import ConfirmModal from "@/components/admin/ConfirmModal";
import Toast, { useToast } from "@/components/admin/Toast";

const STATUS_ICON: Record<string, React.ComponentType<{ size?: number | string; className?: string }>> = {
  pending: Clock,
  confirmed: Truck,
  delivered: PackageCheck,
  cancelled: XCircle,
};

const STATUS_DOT: Record<string, string> = {
  pending: "bg-amber-400",
  confirmed: "bg-sky-400",
  delivered: "bg-emerald-400",
  cancelled: "bg-rose-400",
};

const TIMELINE = [
  { label: "Placed", icon: ClipboardList },
  { label: "Confirmed", icon: CheckCircle2 },
  { label: "On Delivery", icon: Truck },
  { label: "Delivered", icon: PackageCheck },
];

function timelineIndex(status: string): number {
  if (status === "delivered") return 3;
  if (status === "confirmed") return 2;
  if (status === "pending") return 0;
  return -1;
}

type Draft = {
  customerName: string;
  phone: string;
  address: string;
  deliveryAreaName: string;
  deliveryCharge: string;
  items: OrderItem[];
};

function toDraft(o: AdminOrderDetail): Draft {
  return {
    customerName: o.customerName,
    phone: o.phone,
    address: o.address,
    deliveryAreaName: o.deliveryAreaName,
    deliveryCharge: String(o.deliveryCharge),
    items: o.items.map((i) => ({ ...i })),
  };
}

/* ---------------- labelled field ---------------- */

function Row({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ size?: number | string; className?: string }>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="grad-soft rounded-xl p-2.5 text-[var(--g2)] shrink-0">
        <Icon size={14} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[10.5px] font-extrabold uppercase tracking-wide text-gray-400">{label}</p>
        {children}
      </div>
    </div>
  );
}

export default function OrderDetailClient({
  order,
  startInEdit = false,
}: {
  order: AdminOrderDetail;
  startInEdit?: boolean;
}) {
  const router = useRouter();
  const [toast, showToast] = useToast();

  const [status, setStatus] = useState(order.status);
  const [serverStatus, setServerStatus] = useState(order.status);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState<OrderStatus | null>(null);
  const [justSaved, setJustSaved] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const ddRef = useRef<HTMLDivElement>(null);

  const [editing, setEditing] = useState(startInEdit);
  const [draft, setDraft] = useState<Draft>(() => toDraft(order));
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState("");

  if (serverStatus !== order.status) {
    setServerStatus(order.status);
    setStatus(order.status);
  }

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (ddRef.current && !ddRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  const changeStatus = async (next: OrderStatus) => {
    setOpen(false);
    if (next === status || saving) return;
    setSaving(next);
    try {
      const res = await fetch(`/api/admin/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not update status");
      setStatus(next);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2200);
      showToast("ok", `Status changed to “${ORDER_STATUS_LABEL[next]}”`);
      router.refresh();
    } catch (e) {
      showToast("err", e instanceof Error ? e.message : "Could not update status");
    } finally {
      setSaving(null);
    }
  };

  const removeOrder = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/orders/${order.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Delete failed");
      router.push("/admin/orders");
      router.refresh();
    } catch (e) {
      showToast("err", e instanceof Error ? e.message : "Delete failed");
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  /* ---------------- edit mode ---------------- */

  const draftSubtotal = draft.items.reduce((a, i) => a + i.price * i.qty, 0);
  const draftCharge = Math.max(0, Math.round(Number(draft.deliveryCharge) || 0));
  const draftTotal = draftSubtotal + draftCharge;

  const setItem = (idx: number, patch: Partial<OrderItem>) =>
    setDraft((d) => ({ ...d, items: d.items.map((it, i) => (i === idx ? { ...it, ...patch } : it)) }));

  const removeItem = (idx: number) =>
    setDraft((d) => ({ ...d, items: d.items.filter((_, i) => i !== idx) }));

  const addItem = () =>
    setDraft((d) => ({
      ...d,
      items: [...d.items, { productId: 0, name: "Custom item", image: "", price: 0, qty: 1 }],
    }));

  const cancelEdit = () => {
    setDraft(toDraft(order));
    setEditError("");
    setEditing(false);
  };

  const saveEdit = async () => {
    setSavingEdit(true);
    setEditError("");
    try {
      const res = await fetch(`/api/admin/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: draft.customerName.trim(),
          phone: draft.phone.trim(),
          address: draft.address.trim(),
          deliveryAreaName: draft.deliveryAreaName.trim(),
          deliveryCharge: draftCharge,
          subtotal: draftSubtotal,
          total: draftTotal,
          items: draft.items,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not save the order");
      showToast("ok", `Order #${order.code} updated`);
      setEditing(false);
      router.refresh();
    } catch (e) {
      setEditError(e instanceof Error ? e.message : "Could not save the order");
    } finally {
      setSavingEdit(false);
    }
  };

  const active = timelineIndex(status);
  const cancelled = status === "cancelled";
  const CurrentIcon = STATUS_ICON[status] ?? Clock;
  const fraud = order.fraud;

  const inputCls =
    "w-full rounded-xl border-[1.5px] border-gray-200 bg-[#fbfbfe] px-3 py-2 text-[13px] font-bold outline-none focus:border-[var(--g1)] focus:bg-white transition";

  return (
    <div className="space-y-4">
      {/* ---------- top bar ---------- */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_4px_18px_rgba(17,18,28,0.05)] p-4 md:p-5">
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/admin/orders"
            className="w-10 h-10 rounded-2xl grid place-items-center border border-gray-200 text-gray-500 hover:border-[var(--g1)] hover:text-[var(--g2)] transition shrink-0"
            aria-label="Back to orders"
          >
            <ArrowLeft size={17} />
          </Link>

          <div className="min-w-0">
            <h2 className="font-display font-extrabold text-xl md:text-2xl grad-text leading-none">#{order.code}</h2>
            <p className="mt-1.5 text-[11.5px] font-bold text-gray-400 flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="flex items-center gap-1.5">
                <CalendarClock size={13} />
                {order.placedAt}
              </span>
              <span className="flex items-center gap-1.5">
                <Globe size={13} />
                {order.customerIp ?? "IP not captured"}
              </span>
            </p>
          </div>

          <span
            className={`ml-auto text-[10.5px] font-extrabold uppercase tracking-wide px-3 py-1.5 rounded-full whitespace-nowrap ${
              ORDER_STATUS_CHIP[status] ?? "bg-gray-100 text-gray-500"
            }`}
          >
            {ORDER_STATUS_LABEL[status] ?? status}
          </span>
        </div>

        <div className="mt-4 flex flex-col sm:flex-row flex-wrap gap-2.5">
          {/* status dropdown */}
          <div ref={ddRef} className="relative flex-1 min-w-0 sm:min-w-[230px]">
            <button
              onClick={() => setOpen((v) => !v)}
              className="w-full flex items-center gap-2.5 rounded-2xl border-[1.5px] border-gray-200 hover:border-[var(--g1)] bg-[#fbfbfe] px-4 py-3 text-[13px] font-extrabold text-gray-700 transition"
            >
              <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${STATUS_DOT[status] ?? "bg-gray-300"}`} />
              <CurrentIcon size={16} className="text-[var(--g2)] shrink-0" />
              <span className="flex-1 text-left truncate">Status: {ORDER_STATUS_LABEL[status] ?? status}</span>
              {justSaved ? (
                <Check size={16} className="text-emerald-500 shrink-0" />
              ) : (
                <ChevronDown size={16} className={`text-gray-400 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
              )}
            </button>

            {open && (
              <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-30 bg-white rounded-2xl border border-gray-100 shadow-[0_20px_60px_rgba(17,18,28,0.16)] overflow-hidden animate-slide-down">
                {ORDER_STATUSES.map((s) => {
                  const Icon = STATUS_ICON[s];
                  const isCurrent = s === status;
                  return (
                    <button
                      key={s}
                      onClick={() => changeStatus(s)}
                      disabled={saving !== null}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-[13px] font-bold transition disabled:opacity-60 ${
                        isCurrent ? "bg-gray-50 text-gray-900" : "text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      <span className="grad-soft rounded-lg p-2 text-[var(--g2)]">
                        <Icon size={14} />
                      </span>
                      {ORDER_STATUS_LABEL[s]}
                      {isCurrent && <Check size={15} className="ml-auto text-emerald-500" />}
                      {saving === s && (
                        <span className="ml-auto w-3.5 h-3.5 rounded-full border-2 border-gray-200 border-t-[var(--g2)] animate-spin" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {editing ? (
            <>
              <button
                onClick={saveEdit}
                disabled={savingEdit}
                className="rounded-2xl px-5 py-3 text-[13px] font-extrabold text-white grad-bg flex items-center justify-center gap-2 hover:opacity-90 transition disabled:opacity-70"
              >
                {savingEdit ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                {savingEdit ? "Saving…" : "Save changes"}
              </button>
              <button
                onClick={cancelEdit}
                disabled={savingEdit}
                className="rounded-2xl px-5 py-3 text-[13px] font-extrabold text-gray-600 bg-gray-100 hover:bg-gray-200 flex items-center justify-center gap-2 transition"
              >
                <X size={15} />
                Cancel
              </button>
            </>
          ) : (
            <button
              onClick={() => setEditing(true)}
              className="rounded-2xl px-5 py-3 text-[13px] font-extrabold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 flex items-center justify-center gap-2 transition"
            >
              <Pencil size={15} />
              Edit order
            </button>
          )}

          <button
            onClick={() => window.open(`/admin/print?ids=${order.id}`, "_blank", "noopener")}
            className="rounded-2xl px-5 py-3 text-[13px] font-extrabold text-gray-600 bg-gray-100 hover:bg-gray-200 flex items-center justify-center gap-2 transition"
          >
            <Printer size={15} />
            Print
          </button>

          <button
            onClick={() => setConfirmDelete(true)}
            className="rounded-2xl px-5 py-3 text-[13px] font-extrabold text-rose-600 bg-rose-50 hover:bg-rose-100 flex items-center justify-center gap-2 transition"
          >
            <Trash2 size={15} />
            Delete
          </button>
        </div>

        {editError && (
          <p className="mt-3 text-[12.5px] font-bold text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-4 py-2.5">
            {editError}
          </p>
        )}
      </div>

      {/* ---------- timeline ---------- */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_4px_18px_rgba(17,18,28,0.05)] p-4 md:p-6">
        {cancelled ? (
          <div className="flex items-center gap-3 bg-rose-50 border border-rose-100 rounded-2xl px-4 py-4">
            <span className="w-11 h-11 rounded-2xl bg-gradient-to-br from-rose-500 to-red-500 text-white grid place-items-center shrink-0">
              <XCircle size={19} />
            </span>
            <div className="min-w-0">
              <p className="font-display font-extrabold text-rose-600">This order was cancelled</p>
              <p className="text-[12px] font-semibold text-rose-400 mt-0.5">
                Pick another status above to bring it back into the flow.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-start">
            {TIMELINE.map((step, i) => {
              const Icon = step.icon;
              const done = i <= active;
              const current = i === active;
              return (
                <div key={step.label} className="flex-1 flex flex-col items-center relative min-w-0">
                  {i > 0 && (
                    <span
                      className={`absolute top-[18px] md:top-[22px] right-1/2 left-[-50%] h-[3px] rounded-full ${
                        i <= active ? "grad-bg" : "bg-gray-100"
                      }`}
                    />
                  )}
                  <span
                    className={`relative z-10 w-9 h-9 md:w-11 md:h-11 rounded-full grid place-items-center transition-all ${
                      done ? "grad-bg text-white shadow-[0_8px_20px_rgba(255,61,119,0.3)]" : "bg-gray-100 text-gray-400"
                    } ${current ? "ring-4 ring-[color-mix(in_srgb,var(--g2)_18%,transparent)]" : ""}`}
                  >
                    <Icon size={16} />
                  </span>
                  <span
                    className={`mt-2 text-[10px] md:text-[11.5px] font-extrabold text-center leading-tight px-1 ${
                      done ? "text-gray-800" : "text-gray-400"
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* ---------- items ---------- */}
        <div className="min-w-0 lg:col-span-3 bg-white rounded-3xl border border-gray-100 shadow-[0_4px_18px_rgba(17,18,28,0.05)] overflow-hidden">
          <div className="flex items-center justify-between px-4 md:px-6 py-4 border-b border-gray-100">
            <h3 className="font-display font-extrabold text-base md:text-lg flex items-center gap-2.5">
              <span className="grad-bg text-white rounded-xl p-2">
                <ShoppingBag size={15} />
              </span>
              Items
            </h3>
            {editing ? (
              <button
                onClick={addItem}
                className="flex items-center gap-1.5 text-[11.5px] font-extrabold grad-text hover:opacity-80 transition"
              >
                <Plus size={13} />
                Add line
              </button>
            ) : (
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-gray-400">
                {order.items.reduce((a, i) => a + i.qty, 0)} pcs
              </span>
            )}
          </div>

          <div className="divide-y divide-gray-50">
            {(editing ? draft.items : order.items).map((it, idx) => (
              <div key={idx} className="flex items-start gap-3 px-4 md:px-6 py-3.5">
                <span className="w-14 h-14 rounded-xl overflow-hidden bg-gray-100 shrink-0 grid place-items-center">
                  {it.image ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={it.image} alt={it.name} className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <ShoppingBag size={18} className="text-gray-300" />
                  )}
                </span>

                {editing ? (
                  <div className="flex-1 min-w-0 space-y-2">
                    <input
                      value={it.name}
                      onChange={(e) => setItem(idx, { name: e.target.value })}
                      className={inputCls}
                      placeholder="Product name"
                    />
                    <div className="flex gap-2">
                      <label className="flex-1 min-w-0">
                        <span className="block text-[10px] font-extrabold uppercase tracking-wide text-gray-400 mb-1">
                          Price
                        </span>
                        <input
                          type="number"
                          min={0}
                          value={it.price}
                          onChange={(e) => setItem(idx, { price: Math.max(0, Number(e.target.value) || 0) })}
                          className={inputCls}
                        />
                      </label>
                      <label className="w-[92px] shrink-0">
                        <span className="block text-[10px] font-extrabold uppercase tracking-wide text-gray-400 mb-1">
                          Qty
                        </span>
                        <input
                          type="number"
                          min={1}
                          value={it.qty}
                          onChange={(e) => setItem(idx, { qty: Math.max(1, Number(e.target.value) || 1) })}
                          className={inputCls}
                        />
                      </label>
                      <button
                        onClick={() => removeItem(idx)}
                        className="self-end w-10 h-[38px] rounded-xl grid place-items-center text-rose-500 bg-rose-50 hover:bg-rose-100 transition shrink-0"
                        aria-label="Remove item"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-bold text-gray-800 line-clamp-2">{it.name}</p>
                      <p className="text-[11.5px] font-semibold text-gray-400 mt-0.5">
                        {taka(it.price)} × {it.qty}
                      </p>
                    </div>
                    <span className="text-[13px] font-extrabold text-gray-900 whitespace-nowrap shrink-0">
                      {taka(it.price * it.qty)}
                    </span>
                  </>
                )}
              </div>
            ))}
            {(editing ? draft.items : order.items).length === 0 && (
              <p className="px-6 py-10 text-center text-sm font-semibold text-gray-400">No items on this order.</p>
            )}
          </div>

          <div className="border-t border-gray-100 px-4 md:px-6 py-4 space-y-2 text-[13px] font-semibold text-gray-500">
            <div className="flex justify-between gap-3">
              <span>Subtotal</span>
              <span className="text-gray-800 font-bold whitespace-nowrap">
                {taka(editing ? draftSubtotal : order.subtotal)}
              </span>
            </div>
            <div className="flex justify-between gap-3 items-center">
              <span className="min-w-0 truncate">Delivery ({editing ? draft.deliveryAreaName : order.deliveryAreaName})</span>
              {editing ? (
                <input
                  type="number"
                  min={0}
                  value={draft.deliveryCharge}
                  onChange={(e) => setDraft((d) => ({ ...d, deliveryCharge: e.target.value }))}
                  className={`${inputCls} w-[110px] shrink-0 text-right`}
                />
              ) : (
                <span className="text-gray-800 font-bold whitespace-nowrap">{taka(order.deliveryCharge)}</span>
              )}
            </div>
            <div className="flex justify-between gap-3 pt-2 border-t border-dashed border-gray-200">
              <span className="font-display font-extrabold text-gray-900 text-[15px]">Total</span>
              <span className="font-display font-extrabold grad-text text-[18px] whitespace-nowrap">
                {taka(editing ? draftTotal : order.total)}
              </span>
            </div>
          </div>
        </div>

        {/* ---------- customer / delivery / fraud ---------- */}
        <div className="min-w-0 lg:col-span-2 space-y-4">
          <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_4px_18px_rgba(17,18,28,0.05)] p-4 md:p-6">
            <h3 className="font-display font-extrabold text-base md:text-lg flex items-center gap-2.5 mb-4">
              <span className="grad-bg text-white rounded-xl p-2">
                <User size={15} />
              </span>
              Customer
            </h3>

            <div className="space-y-3.5">
              <Row icon={User} label="Name">
                {editing ? (
                  <input
                    value={draft.customerName}
                    onChange={(e) => setDraft((d) => ({ ...d, customerName: e.target.value }))}
                    className={`${inputCls} mt-1`}
                  />
                ) : (
                  <p className="text-[13.5px] font-bold text-gray-800 break-words">{order.customerName}</p>
                )}
              </Row>

              <Row icon={Phone} label="Phone">
                {editing ? (
                  <input
                    value={draft.phone}
                    inputMode="numeric"
                    maxLength={11}
                    onChange={(e) => setDraft((d) => ({ ...d, phone: e.target.value.replace(/\D/g, "") }))}
                    className={`${inputCls} mt-1`}
                  />
                ) : (
                  <a href={`tel:${order.phone}`} className="text-[13.5px] font-bold text-gray-800 hover:grad-text break-words">
                    {order.phone}
                  </a>
                )}
              </Row>

              <Row icon={MapPin} label="Address">
                {editing ? (
                  <textarea
                    value={draft.address}
                    rows={3}
                    onChange={(e) => setDraft((d) => ({ ...d, address: e.target.value }))}
                    className={`${inputCls} mt-1 resize-none`}
                  />
                ) : (
                  <p className="text-[13.5px] font-bold text-gray-800 break-words leading-relaxed">{order.address}</p>
                )}
              </Row>

              <Row icon={Globe} label="IP address">
                <p className="text-[13.5px] font-bold text-gray-800 break-words">
                  {order.customerIp ?? <span className="text-gray-400">not captured</span>}
                </p>
              </Row>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_4px_18px_rgba(17,18,28,0.05)] p-4 md:p-6">
            <h3 className="font-display font-extrabold text-base md:text-lg flex items-center gap-2.5 mb-4">
              <span className="grad-bg text-white rounded-xl p-2">
                <ReceiptText size={15} />
              </span>
              Delivery
            </h3>
            {editing ? (
              <input
                value={draft.deliveryAreaName}
                onChange={(e) => setDraft((d) => ({ ...d, deliveryAreaName: e.target.value }))}
                className={inputCls}
                placeholder="Delivery area name"
              />
            ) : (
              <div className="flex items-center justify-between gap-3 bg-gray-50 rounded-2xl px-4 py-3">
                <span className="text-[12.5px] font-bold text-gray-600 min-w-0 truncate">{order.deliveryAreaName}</span>
                <span className="text-[13px] font-extrabold text-gray-900 whitespace-nowrap shrink-0">
                  {taka(order.deliveryCharge)}
                </span>
              </div>
            )}
            <p className="mt-3 text-[11.5px] font-semibold text-gray-400 leading-relaxed">
              Payment method: Cash on Delivery. Area name and charge are snapshots taken when the order was placed.
            </p>
          </div>

          <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_4px_18px_rgba(17,18,28,0.05)] p-4 md:p-6">
            <h3 className="font-display font-extrabold text-base md:text-lg flex items-center gap-2.5 mb-4">
              <span className="grad-bg text-white rounded-xl p-2">
                <ShieldAlert size={15} />
              </span>
              Fraud check
            </h3>
            <div className="flex items-center justify-between gap-2">
              <span className={`text-[12px] font-extrabold uppercase tracking-wide ${FRAUD_TEXT[fraud.tone]}`}>
                {fraud.label}
              </span>
              <span className="text-[13px] font-extrabold text-gray-700">
                {fraud.percent === null ? "—" : `${fraud.percent}%`}
              </span>
            </div>
            <div className="mt-2 h-2 rounded-full bg-gray-100 overflow-hidden">
              <div className={`h-full rounded-full ${FRAUD_BAR[fraud.tone]}`} style={{ width: `${fraud.percent ?? 0}%` }} />
            </div>
            <p className="mt-2.5 text-[11.5px] font-semibold text-gray-400 leading-relaxed">
              {fraud.delivered} delivered · {fraud.cancelled} cancelled · {fraud.totalOrders} total orders from{" "}
              {order.phone}. Based on this store&apos;s own delivery history — a courier fraud API can replace it later.
            </p>
          </div>
        </div>
      </div>

      {confirmDelete && (
        <ConfirmModal
          title={`Delete order #${order.code}?`}
          message={
            <>
              This permanently removes <b className="text-gray-700">{order.customerName}</b>&apos;s order ({taka(order.total)}).
              This cannot be undone.
            </>
          }
          loading={deleting}
          onConfirm={removeOrder}
          onClose={() => (deleting ? undefined : setConfirmDelete(false))}
        />
      )}

      <Toast state={toast} />
    </div>
  );
}
