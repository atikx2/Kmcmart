"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowDownUp,
  Check,
  CircleDot,
  Eye,
  EyeOff,
  Hash,
  Info,
  Layers,
  Loader2,
  Lock,
  MousePointerClick,
  Palette,
  Plus,
  ShieldCheck,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import {
  slugifyStatusKey,
  STATUS_COLOR_PRESETS,
  STATUS_LABEL_MAX,
  statusTint,
  type OrderStatusOption,
} from "@/lib/order-status";
import ConfirmModal from "@/components/admin/ConfirmModal";
import InlineEdit from "@/components/admin/InlineEdit";
import Toast, { useToast } from "@/components/admin/Toast";
import { ACTION_BTN, StatChip, Th } from "@/components/admin/table-ui";

/* ---------------- colour picker ---------------- */

function Swatch({ color, size = 26 }: { color: string; size?: number }) {
  return (
    <span
      className="inline-block rounded-[9px] shrink-0"
      style={{ width: size, height: size, backgroundColor: color, boxShadow: `0 2px 8px ${color}59` }}
    />
  );
}

function ColorPicker({
  value,
  onPick,
  busy,
}: {
  value: string;
  onPick: (hex: string) => void | Promise<void>;
  busy?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState(value);
  const boxRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const fn = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, [open]);

  const choose = async (hex: string) => {
    setOpen(false);
    await onPick(hex.toUpperCase());
  };

  return (
    <div ref={boxRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => {
          setCustom(value);
          setOpen((v) => !v);
        }}
        disabled={busy}
        title="Change colour"
        className="flex items-center gap-2 rounded-xl border-[1.5px] border-gray-200 bg-white pl-1.5 pr-2.5 py-1.5 hover:border-[var(--g1)] transition disabled:opacity-60"
      >
        <Swatch color={value} />
        <span className="text-[11px] font-extrabold uppercase tracking-wider text-gray-600">{value}</span>
        {busy ? <Loader2 size={12} className="animate-spin text-gray-400" /> : <Palette size={12} className="text-gray-400" />}
      </button>

      {open && (
        <div className="absolute left-0 top-[calc(100%+8px)] z-40 w-[232px] rounded-2xl border border-gray-100 bg-white p-3 shadow-[0_20px_60px_rgba(17,18,28,0.16)] animate-slide-down">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400 mb-2">Pick a colour</p>
          <div className="grid grid-cols-5 gap-2">
            {STATUS_COLOR_PRESETS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => choose(c)}
                title={c}
                className={`h-8 rounded-xl transition hover:scale-110 ${
                  c.toUpperCase() === value.toUpperCase() ? "ring-2 ring-offset-2 ring-gray-800" : ""
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>

          <div className="mt-3 flex items-center gap-2 border-t border-gray-100 pt-3">
            <input
              type="color"
              value={/^#[0-9a-fA-F]{6}$/.test(custom) ? custom : "#6B7280"}
              onChange={(e) => setCustom(e.target.value.toUpperCase())}
              className="w-9 h-9 rounded-xl border-[1.5px] border-gray-200 bg-white p-0.5 cursor-pointer"
              aria-label="Custom colour"
            />
            <input
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              maxLength={7}
              placeholder="#FF7A00"
              className="w-full min-w-0 rounded-xl border-[1.5px] border-gray-200 bg-white px-2.5 py-2 text-[12px] font-extrabold uppercase outline-none focus:border-[var(--g1)] transition"
            />
            <button
              type="button"
              onClick={() => {
                if (/^#[0-9a-fA-F]{6}$/.test(custom.trim())) void choose(custom.trim());
              }}
              className="shrink-0 w-9 h-9 rounded-xl grad-bg text-white grid place-items-center hover:opacity-90 transition"
              aria-label="Use this colour"
            >
              <Check size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- page ---------------- */

export default function StatusesClient({ initial, ready }: { initial: OrderStatusOption[]; ready: boolean }) {
  const router = useRouter();
  const [toast, showToast] = useToast();
  const [items, setItems] = useState<OrderStatusOption[]>(initial);
  const [rowBusy, setRowBusy] = useState<number | null>(null);
  const [toDelete, setToDelete] = useState<OrderStatusOption | null>(null);
  const [working, setWorking] = useState(false);

  const [adding, setAdding] = useState(false);
  const [label, setLabel] = useState("");
  const [color, setColor] = useState<string>("#6366F1");
  const [sortOrder, setSortOrder] = useState("");
  const [addError, setAddError] = useState("");
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/order-statuses", { cache: "no-store" });
      if (!res.ok) throw new Error();
      setItems((await res.json()).items);
    } catch {
      showToast("err", "Could not load order statuses");
    }
  }, [showToast]);

  const save = async (id: number, body: Record<string, unknown>) => {
    const res = await fetch(`/api/admin/order-statuses/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Could not save");
    return json;
  };

  const nextSort = items.length ? Math.max(...items.map((s) => s.sortOrder)) + 1 : 1;

  const openAdd = () => {
    setLabel("");
    setColor(STATUS_COLOR_PRESETS[(items.length * 3) % STATUS_COLOR_PRESETS.length]);
    setSortOrder(String(nextSort));
    setAddError("");
    setAdding(true);
  };

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    const name = label.trim();
    if (name.length < 2) {
      setAddError("Status name must be at least 2 characters");
      return;
    }
    setSaving(true);
    setAddError("");
    try {
      const res = await fetch("/api/admin/order-statuses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: name,
          color,
          sortOrder: Math.max(0, Math.round(Number(sortOrder) || 0)),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not add the status");
      setAdding(false);
      showToast("ok", `“${name}” added`);
      await refresh();
      router.refresh();
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Could not add the status");
    } finally {
      setSaving(false);
    }
  };

  const patchRow = (id: number, patch: Partial<OrderStatusOption>) =>
    setItems((prev) => prev.map((x) => (x.id === id ? { ...x, ...patch } : x)));

  const setColorOf = async (s: OrderStatusOption, hex: string) => {
    if (hex.toUpperCase() === s.color.toUpperCase()) return;
    setRowBusy(s.id);
    const prev = s.color;
    patchRow(s.id, { color: hex });
    try {
      await save(s.id, { color: hex });
      showToast("ok", `${s.label} colour updated`);
      router.refresh();
    } catch (e) {
      patchRow(s.id, { color: prev });
      showToast("err", e instanceof Error ? e.message : "Could not update");
    } finally {
      setRowBusy(null);
    }
  };

  const toggle = async (s: OrderStatusOption) => {
    setRowBusy(s.id);
    patchRow(s.id, { isActive: !s.isActive });
    try {
      await save(s.id, { isActive: !s.isActive });
      showToast("ok", !s.isActive ? `${s.label} is selectable` : `${s.label} hidden from the status list`);
      router.refresh();
    } catch (e) {
      patchRow(s.id, { isActive: s.isActive });
      showToast("err", e instanceof Error ? e.message : "Could not update");
    } finally {
      setRowBusy(null);
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    setWorking(true);
    try {
      const res = await fetch(`/api/admin/order-statuses/${toDelete.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Delete failed");
      setToDelete(null);
      showToast("ok", "Status deleted");
      await refresh();
      router.refresh();
    } catch (e) {
      showToast("err", e instanceof Error ? e.message : "Delete failed");
    } finally {
      setWorking(false);
    }
  };

  const builtIn = items.filter((s) => s.isSystem).length;
  const custom = items.length - builtIn;
  const live = items.filter((s) => s.isActive).length;
  const keyPreview = slugifyStatusKey(label) || "auto";

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_4px_18px_rgba(17,18,28,0.05)] p-3 md:p-4">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-1 px-1 lg:mx-0 lg:px-0">
            <StatChip icon={Layers} label="statuses" value={items.length} />
            <StatChip icon={ShieldCheck} label="built-in" value={builtIn} />
            <StatChip icon={Tag} label="custom" value={custom} />
            <StatChip icon={Eye} label="live" value={live} />
          </div>
          <button
            onClick={openAdd}
            disabled={!ready}
            className="lg:ml-auto shrink-0 flex items-center justify-center gap-2 grad-bg text-white rounded-2xl px-4 py-2.5 text-[12.5px] font-extrabold hover:opacity-90 transition disabled:opacity-50"
          >
            <Plus size={15} strokeWidth={2.6} />
            Add Status
          </button>
        </div>

        {!ready && (
          <p className="mt-3 flex items-start gap-2 text-[11.5px] font-bold text-amber-800 bg-amber-50 border border-amber-200 rounded-2xl px-3.5 py-2.5">
            <AlertTriangle size={14} className="shrink-0 mt-[1px]" />
            <span>
              The <code className="font-mono">order_statuses</code> table does not exist on this database yet, so you are
              looking at the built-in defaults. Run the migration SQL once in the Neon SQL Editor and this page becomes
              fully editable.
            </span>
          </p>
        )}

        <p className="mt-3 flex items-start gap-2 text-[11.5px] font-bold text-sky-700 bg-sky-50 border border-sky-100 rounded-2xl px-3.5 py-2.5">
          <Info size={14} className="shrink-0 mt-[1px]" />
          <span>
            These are the options in the Orders page status dropdown, and the colour is used for the chip everywhere.
            The four built-in ones cannot be deleted — reports count revenue on <b>Delivered</b>, skip{" "}
            <b>Cancelled</b>, and every new order starts at <b>Pending</b>. Your own statuses behave like “in progress”.
          </span>
        </p>

        {adding && (
          <form onSubmit={create} className="mt-3 rounded-2xl border-[1.5px] border-gray-100 bg-[#fbfbfe] p-3.5">
            <div className="grid grid-cols-1 sm:grid-cols-[1.4fr_auto_110px_auto] gap-2.5 items-start">
              <label className="block min-w-0">
                <span className="block text-[10.5px] font-extrabold uppercase tracking-wider text-gray-500 mb-1.5">
                  Status name
                </span>
                <input
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="Packed"
                  maxLength={STATUS_LABEL_MAX}
                  autoFocus
                  className="w-full rounded-xl border-[1.5px] border-gray-200 bg-white px-3.5 py-2.5 text-[12.5px] font-bold outline-none focus:border-[var(--g1)] transition"
                />
              </label>
              <div className="min-w-0">
                <span className="block text-[10.5px] font-extrabold uppercase tracking-wider text-gray-500 mb-1.5">
                  Colour
                </span>
                <ColorPicker value={color} onPick={(hex) => setColor(hex)} />
              </div>
              <label className="block min-w-0">
                <span className="block text-[10.5px] font-extrabold uppercase tracking-wider text-gray-500 mb-1.5">Sort</span>
                <input
                  type="number"
                  min={0}
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                  className="w-full rounded-xl border-[1.5px] border-gray-200 bg-white px-3.5 py-2.5 text-[12.5px] font-bold outline-none focus:border-[var(--g1)] transition"
                />
              </label>
              <div className="flex gap-2 sm:pt-[26px]">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 grad-bg text-white rounded-xl px-4 py-2.5 text-[12.5px] font-extrabold hover:opacity-90 transition disabled:opacity-70"
                >
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setAdding(false)}
                  className="w-10 rounded-xl bg-gray-100 text-gray-500 grid place-items-center hover:bg-gray-200 transition"
                  aria-label="Cancel"
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              <span className="text-[10.5px] font-extrabold uppercase tracking-wider text-gray-400">Preview</span>
              <span
                className="text-[10.5px] font-extrabold uppercase tracking-wide px-3 py-1.5 rounded-full border"
                style={statusTint(color)}
              >
                {label.trim() || "Packed"}
              </span>
              <span className="text-[10.5px] font-bold text-gray-400">
                saved as <code className="font-mono text-gray-500">{keyPreview}</code> — the name can be renamed any
                time, this internal key never changes
              </span>
            </div>

            {addError && (
              <p className="mt-2.5 flex items-center gap-2 text-[12px] font-bold text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-3.5 py-2">
                <AlertTriangle size={14} className="shrink-0" />
                {addError}
              </p>
            )}
          </form>
        )}
      </div>

      <div className="relative bg-white rounded-3xl border border-gray-100 shadow-[0_4px_18px_rgba(17,18,28,0.05)] overflow-hidden">
        <div className="relative">
          <div className="overflow-x-auto overscroll-x-contain [scrollbar-width:thin] [scrollbar-color:#d8d8e2_transparent]">
            <table className="w-full min-w-[840px] text-sm">
              <thead>
                <tr className="text-left bg-gradient-to-r from-[#fff8f3] via-[#fff6f8] to-[#fff4f8] border-y border-gray-100">
                  <Th icon={Hash} label="SL" className="w-[64px]" />
                  <Th icon={CircleDot} label="Status name" />
                  <Th icon={Palette} label="Colour" />
                  <Th icon={ArrowDownUp} label="Sort" />
                  <Th icon={Eye} label="Visibility" />
                  <Th icon={MousePointerClick} label="Action" className="text-right" />
                </tr>
              </thead>
              <tbody>
                {items.map((s, i) => (
                  <tr
                    key={s.key}
                    className={`group border-b border-gray-50 last:border-0 align-top transition-colors ${
                      i % 2 === 1 ? "bg-[#fcfcfd] hover:bg-[#fff7f3]" : "hover:bg-[#fff7f3]"
                    }`}
                  >
                    <td className="px-3 py-4">
                      <span className="inline-grid place-items-center w-7 h-7 rounded-lg bg-[#fafafc] border border-gray-100 text-[11px] font-extrabold text-gray-500">
                        {i + 1}
                      </span>
                    </td>

                    <td className="px-3 py-4">
                      <div className="w-[270px]">
                        <InlineEdit
                          value={s.label}
                          title="Edit status name"
                          inputClassName="w-[190px]"
                          prefix={
                            <span
                              className="w-[22px] h-[22px] rounded-lg grid place-items-center shrink-0 mt-[2px]"
                              style={statusTint(s.color)}
                            >
                              <CircleDot size={11} strokeWidth={2.5} />
                            </span>
                          }
                          display={
                            <span
                              className="inline-block text-[10.5px] font-extrabold uppercase tracking-wide px-3 py-1.5 rounded-full border"
                              style={statusTint(s.color)}
                            >
                              {s.label}
                            </span>
                          }
                          onSave={async (next) => {
                            const v = next.trim();
                            if (v.length < 2) throw new Error("Too short");
                            await save(s.id, { label: v });
                            patchRow(s.id, { label: v });
                            showToast("ok", "Status renamed");
                            router.refresh();
                          }}
                        />
                        <p className="mt-1.5 flex items-center gap-1 text-[9.5px] font-extrabold text-gray-400">
                          <Lock size={9} strokeWidth={2.6} />
                          <code className="font-mono">{s.key}</code>
                        </p>
                      </div>
                    </td>

                    <td className="px-3 py-4">
                      <ColorPicker
                        value={s.color}
                        busy={rowBusy === s.id}
                        onPick={(hex) => setColorOf(s, hex)}
                      />
                    </td>

                    <td className="px-3 py-4">
                      <div className="w-[96px]">
                        <InlineEdit
                          value={String(s.sortOrder)}
                          type="number"
                          title="Edit sort order"
                          inputClassName="w-[64px]"
                          prefix={
                            <span className="w-[22px] h-[22px] rounded-lg grad-soft grid place-items-center shrink-0 text-[var(--g2)] mt-[2px]">
                              <ArrowDownUp size={11} strokeWidth={2.5} />
                            </span>
                          }
                          display={
                            <span className="font-display font-extrabold text-[15.5px] text-gray-700 leading-none">
                              {s.sortOrder}
                            </span>
                          }
                          onSave={async (next) => {
                            const n = Number(next);
                            if (!Number.isFinite(n) || n < 0) throw new Error("Invalid");
                            await save(s.id, { sortOrder: Math.round(n) });
                            showToast("ok", "Sort order updated");
                            await refresh();
                            router.refresh();
                          }}
                        />
                        <p className="mt-1.5 text-[9.5px] font-extrabold text-gray-400">lower = first</p>
                      </div>
                    </td>

                    <td className="px-3 py-4">
                      {s.isSystem ? (
                        <span
                          title="Built-in status — always available"
                          className="inline-flex items-center gap-1 text-[9.5px] font-extrabold uppercase tracking-wider px-2 py-[4px] rounded-full ring-1 bg-gray-100 text-gray-500 ring-gray-200"
                        >
                          <ShieldCheck size={10} strokeWidth={2.6} />
                          Built-in
                        </span>
                      ) : (
                        <button
                          onClick={() => toggle(s)}
                          disabled={rowBusy === s.id}
                          title={s.isActive ? "Selectable on orders — click to hide" : "Hidden — click to show"}
                          className={`inline-flex items-center gap-1 text-[9.5px] font-extrabold uppercase tracking-wider px-2 py-[4px] rounded-full ring-1 transition disabled:opacity-60 ${
                            s.isActive
                              ? "bg-emerald-50 text-emerald-600 ring-emerald-100 hover:bg-emerald-100"
                              : "bg-gray-100 text-gray-500 ring-gray-200 hover:bg-gray-200"
                          }`}
                        >
                          {rowBusy === s.id ? (
                            <Loader2 size={10} className="animate-spin" />
                          ) : s.isActive ? (
                            <Eye size={10} strokeWidth={2.6} />
                          ) : (
                            <EyeOff size={10} strokeWidth={2.6} />
                          )}
                          {s.isActive ? "Live" : "Hidden"}
                        </button>
                      )}
                    </td>

                    <td className="px-3 py-4">
                      <div className="flex justify-end">
                        <div className="inline-grid grid-cols-1 gap-1.5 p-1.5 rounded-2xl bg-[#fafafc] border border-gray-100">
                          {s.isSystem ? (
                            <span
                              title="Built-in statuses cannot be deleted"
                              className={`${ACTION_BTN} bg-gray-50 text-gray-300 cursor-not-allowed shadow-none hover:translate-y-0 hover:shadow-none`}
                            >
                              <Lock size={13} strokeWidth={2.4} />
                            </span>
                          ) : (
                            <button
                              onClick={() => setToDelete(s)}
                              title="Delete status"
                              className={`${ACTION_BTN} bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white`}
                            >
                              <Trash2 size={13} strokeWidth={2.4} />
                            </button>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <span className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-white to-transparent 2xl:hidden" />
        </div>
      </div>

      {toDelete && (
        <ConfirmModal
          title={`Delete “${toDelete.label}”?`}
          message="It disappears from every status dropdown. Orders that already use it must be moved to another status first — otherwise the delete is blocked."
          loading={working}
          onConfirm={confirmDelete}
          onClose={() => setToDelete(null)}
        />
      )}

      <Toast state={toast} />
    </div>
  );
}
