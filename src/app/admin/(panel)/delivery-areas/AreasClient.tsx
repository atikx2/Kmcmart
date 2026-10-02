"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowDownUp,
  Check,
  Eye,
  EyeOff,
  Hash,
  Inbox,
  Info,
  Loader2,
  MapPin,
  MousePointerClick,
  Plus,
  Trash2,
  Truck,
  Wallet,
  X,
} from "lucide-react";
import { taka } from "@/lib/format";
import type { AdminArea } from "@/lib/site-content";
import ConfirmModal from "@/components/admin/ConfirmModal";
import InlineEdit from "@/components/admin/InlineEdit";
import Toast, { useToast } from "@/components/admin/Toast";
import { ACTION_BTN, StatChip, Th } from "@/components/admin/table-ui";

export default function AreasClient({ initial }: { initial: AdminArea[] }) {
  const router = useRouter();
  const [toast, showToast] = useToast();
  const [items, setItems] = useState<AdminArea[]>(initial);
  const [loading, setLoading] = useState(false);
  const [rowBusy, setRowBusy] = useState<number | null>(null);
  const [toDelete, setToDelete] = useState<AdminArea | null>(null);
  const [working, setWorking] = useState(false);

  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [charge, setCharge] = useState("");
  const [sortOrder, setSortOrder] = useState("");
  const [addError, setAddError] = useState("");
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/delivery-areas");
      if (!res.ok) throw new Error();
      setItems((await res.json()).items);
    } catch {
      showToast("err", "Could not load delivery areas");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  const save = async (id: number, body: Record<string, unknown>) => {
    const res = await fetch(`/api/admin/delivery-areas/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Could not save");
    return json;
  };

  const nextSort = items.length ? Math.max(...items.map((a) => a.sortOrder)) + 1 : 1;

  const openAdd = () => {
    setName("");
    setCharge("");
    setSortOrder(String(nextSort));
    setAddError("");
    setAdding(true);
  };

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    if (name.trim().length < 2) {
      setAddError("Area name must be at least 2 characters");
      return;
    }
    const c = Math.round(Number(charge));
    if (!Number.isFinite(c) || c < 0) {
      setAddError("Delivery charge must be 0 or more");
      return;
    }
    setSaving(true);
    setAddError("");
    try {
      const res = await fetch("/api/admin/delivery-areas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          charge: c,
          sortOrder: Math.max(0, Math.round(Number(sortOrder) || 0)),
          isActive: true,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not add the area");
      setAdding(false);
      showToast("ok", "Delivery area added");
      await refresh();
      router.refresh();
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Could not add the area");
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (a: AdminArea) => {
    setRowBusy(a.id);
    setItems((prev) => prev.map((x) => (x.id === a.id ? { ...x, isActive: !a.isActive } : x)));
    try {
      await save(a.id, { isActive: !a.isActive });
      showToast("ok", !a.isActive ? `${a.name} is selectable` : `${a.name} hidden from checkout`);
      router.refresh();
    } catch (e) {
      setItems((prev) => prev.map((x) => (x.id === a.id ? { ...x, isActive: a.isActive } : x)));
      showToast("err", e instanceof Error ? e.message : "Could not update");
    } finally {
      setRowBusy(null);
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    setWorking(true);
    try {
      const res = await fetch(`/api/admin/delivery-areas/${toDelete.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Delete failed");
      setToDelete(null);
      showToast("ok", "Delivery area deleted");
      await refresh();
      router.refresh();
    } catch (e) {
      showToast("err", e instanceof Error ? e.message : "Delete failed");
    } finally {
      setWorking(false);
    }
  };

  const liveCount = items.filter((a) => a.isActive).length;
  const charges = items.filter((a) => a.isActive).map((a) => a.charge);
  const lowest = charges.length ? Math.min(...charges) : 0;
  const highest = charges.length ? Math.max(...charges) : 0;

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_4px_18px_rgba(17,18,28,0.05)] p-3 md:p-4">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-1 px-1 lg:mx-0 lg:px-0">
            <StatChip icon={MapPin} label="areas" value={items.length} />
            <StatChip icon={Eye} label="live" value={liveCount} />
            <StatChip icon={Wallet} label="lowest" value={taka(lowest)} />
            <StatChip icon={Truck} label="highest" value={taka(highest)} />
          </div>
          <button
            onClick={openAdd}
            className="lg:ml-auto shrink-0 flex items-center justify-center gap-2 grad-bg text-white rounded-2xl px-4 py-2.5 text-[12.5px] font-extrabold hover:opacity-90 transition"
          >
            <Plus size={15} strokeWidth={2.6} />
            Add Area
          </button>
        </div>

        <p className="mt-3 flex items-start gap-2 text-[11.5px] font-bold text-sky-700 bg-sky-50 border border-sky-100 rounded-2xl px-3.5 py-2.5">
          <Info size={14} className="shrink-0 mt-[1px]" />
          <span>
            These are the options in the checkout dropdown. Old orders keep the name and charge they were placed with, so
            editing here never changes past orders. Charge 0 means free for everyone in that area.
          </span>
        </p>

        {adding && (
          <form onSubmit={create} className="mt-3 rounded-2xl border-[1.5px] border-gray-100 bg-[#fbfbfe] p-3.5">
            <div className="grid grid-cols-1 sm:grid-cols-[1.4fr_130px_110px_auto] gap-2.5 items-start">
              <label className="block min-w-0">
                <span className="block text-[10.5px] font-extrabold uppercase tracking-wider text-gray-500 mb-1.5">Area name</span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Inside Dhaka"
                  autoFocus
                  className="w-full rounded-xl border-[1.5px] border-gray-200 bg-white px-3.5 py-2.5 text-[12.5px] font-bold outline-none focus:border-[var(--g1)] transition"
                />
              </label>
              <label className="block min-w-0">
                <span className="block text-[10.5px] font-extrabold uppercase tracking-wider text-gray-500 mb-1.5">Charge (৳)</span>
                <input
                  type="number"
                  min={0}
                  value={charge}
                  onChange={(e) => setCharge(e.target.value)}
                  placeholder="100"
                  className="w-full rounded-xl border-[1.5px] border-gray-200 bg-white px-3.5 py-2.5 text-[12.5px] font-bold outline-none focus:border-[var(--g1)] transition"
                />
              </label>
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

            {addError && (
              <p className="mt-2.5 flex items-center gap-2 text-[12px] font-bold text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-3.5 py-2">
                <AlertTriangle size={14} />
                {addError}
              </p>
            )}
          </form>
        )}
      </div>

      <div className="relative bg-white rounded-3xl border border-gray-100 shadow-[0_4px_18px_rgba(17,18,28,0.05)] overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-4 md:px-6 py-4 border-b border-gray-100">
          <h2 className="font-display font-extrabold text-base md:text-lg flex items-center gap-2.5 min-w-0">
            <span className="grad-bg text-white rounded-xl p-2 shrink-0">
              <Truck size={15} strokeWidth={2.4} />
            </span>
            <span className="truncate">Delivery Areas &amp; Charges</span>
          </h2>
          <span className="shrink-0 flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-wider text-gray-400">
            {loading && <Loader2 size={13} className="animate-spin text-[var(--g2)]" />}
            {items.length} areas
          </span>
        </div>

        {items.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <span className="mx-auto w-20 h-20 rounded-full grad-soft grid place-items-center mb-4">
              <Inbox size={30} className="text-gray-400" />
            </span>
            <p className="font-display font-extrabold text-gray-700">No delivery areas yet</p>
            <p className="text-[13px] font-semibold text-gray-400 mt-1.5 max-w-[360px] mx-auto">
              Checkout needs at least one area — add one to start taking orders.
            </p>
            <button
              onClick={openAdd}
              className="mt-5 inline-flex items-center gap-2 grad-bg text-white text-[12.5px] font-extrabold px-5 py-2.5 rounded-full hover:opacity-90 transition"
            >
              <Plus size={15} />
              Add Area
            </button>
          </div>
        ) : (
          <div className="relative">
            <div className="overflow-x-auto overscroll-x-contain [scrollbar-width:thin] [scrollbar-color:#d8d8e2_transparent]">
              <table className="w-full min-w-[780px] text-sm">
                <thead>
                  <tr className="text-left bg-gradient-to-r from-[#fff8f3] via-[#fff6f8] to-[#fff4f8] border-y border-gray-100">
                    <Th icon={Hash} label="SL" className="w-[64px]" />
                    <Th icon={MapPin} label="Area name" />
                    <Th icon={Wallet} label="Delivery charge" />
                    <Th icon={ArrowDownUp} label="Sort" />
                    <Th icon={Eye} label="Status" />
                    <Th icon={MousePointerClick} label="Action" className="text-right" />
                  </tr>
                </thead>
                <tbody>
                  {items.map((a, i) => (
                    <tr
                      key={a.id}
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
                        <div className="w-[260px]">
                          <InlineEdit
                            value={a.name}
                            title="Edit area name"
                            inputClassName="w-[200px]"
                            prefix={
                              <span className="w-[22px] h-[22px] rounded-lg grad-soft grid place-items-center shrink-0 text-[var(--g2)] mt-[2px]">
                                <MapPin size={11} strokeWidth={2.5} />
                              </span>
                            }
                            display={<span className="block text-[13px] font-extrabold text-gray-800 leading-snug line-clamp-2">{a.name}</span>}
                            onSave={async (next) => {
                              const v = next.trim();
                              if (v.length < 2) throw new Error("Too short");
                              await save(a.id, { name: v });
                              setItems((prev) => prev.map((x) => (x.id === a.id ? { ...x, name: v } : x)));
                              showToast("ok", "Area renamed");
                              router.refresh();
                            }}
                          />
                        </div>
                      </td>

                      <td className="px-3 py-4">
                        <div className="w-[150px]">
                          <InlineEdit
                            value={String(a.charge)}
                            type="number"
                            title="Edit delivery charge"
                            inputClassName="w-[88px]"
                            prefix={
                              <span className="w-[22px] h-[22px] rounded-lg grad-soft grid place-items-center shrink-0 text-[var(--g2)] mt-[2px]">
                                <Wallet size={11} strokeWidth={2.5} />
                              </span>
                            }
                            display={
                              a.charge <= 0 ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider text-emerald-600 bg-emerald-50 ring-1 ring-emerald-100 px-2 py-1 rounded-full">
                                  <Truck size={11} strokeWidth={2.6} />
                                  Free
                                </span>
                              ) : (
                                <span className="font-display font-extrabold text-[15.5px] grad-text leading-none">{taka(a.charge)}</span>
                              )
                            }
                            onSave={async (next) => {
                              const n = Number(next);
                              if (!Number.isFinite(n) || n < 0) throw new Error("Invalid");
                              await save(a.id, { charge: Math.round(n) });
                              setItems((prev) => prev.map((x) => (x.id === a.id ? { ...x, charge: Math.round(n) } : x)));
                              showToast("ok", "Charge updated");
                              router.refresh();
                            }}
                          />
                          <p className="mt-1.5 text-[9.5px] font-extrabold text-gray-400">0 = free delivery</p>
                        </div>
                      </td>

                      <td className="px-3 py-4">
                        <div className="w-[96px]">
                          <InlineEdit
                            value={String(a.sortOrder)}
                            type="number"
                            title="Edit sort order"
                            inputClassName="w-[64px]"
                            prefix={
                              <span className="w-[22px] h-[22px] rounded-lg grad-soft grid place-items-center shrink-0 text-[var(--g2)] mt-[2px]">
                                <ArrowDownUp size={11} strokeWidth={2.5} />
                              </span>
                            }
                            display={<span className="font-display font-extrabold text-[15.5px] text-gray-700 leading-none">{a.sortOrder}</span>}
                            onSave={async (next) => {
                              const n = Number(next);
                              if (!Number.isFinite(n) || n < 0) throw new Error("Invalid");
                              await save(a.id, { sortOrder: Math.round(n) });
                              showToast("ok", "Sort order updated");
                              await refresh();
                              router.refresh();
                            }}
                          />
                          <p className="mt-1.5 text-[9.5px] font-extrabold text-gray-400">lower = first</p>
                        </div>
                      </td>

                      <td className="px-3 py-4">
                        <button
                          onClick={() => toggle(a)}
                          disabled={rowBusy === a.id}
                          title={a.isActive ? "Shown at checkout — click to hide" : "Hidden — click to show"}
                          className={`inline-flex items-center gap-1 text-[9.5px] font-extrabold uppercase tracking-wider px-2 py-[4px] rounded-full ring-1 transition disabled:opacity-60 ${
                            a.isActive
                              ? "bg-emerald-50 text-emerald-600 ring-emerald-100 hover:bg-emerald-100"
                              : "bg-gray-100 text-gray-500 ring-gray-200 hover:bg-gray-200"
                          }`}
                        >
                          {rowBusy === a.id ? (
                            <Loader2 size={10} className="animate-spin" />
                          ) : a.isActive ? (
                            <Eye size={10} strokeWidth={2.6} />
                          ) : (
                            <EyeOff size={10} strokeWidth={2.6} />
                          )}
                          {a.isActive ? "Live" : "Hidden"}
                        </button>
                      </td>

                      <td className="px-3 py-4">
                        <div className="flex justify-end">
                          <div className="inline-grid grid-cols-1 gap-1.5 p-1.5 rounded-2xl bg-[#fafafc] border border-gray-100">
                            <button
                              onClick={() => setToDelete(a)}
                              title="Delete area"
                              className={`${ACTION_BTN} bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white`}
                            >
                              <Trash2 size={13} strokeWidth={2.4} />
                            </button>
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
        )}
      </div>

      {toDelete && (
        <ConfirmModal
          title={`Delete “${toDelete.name}”?`}
          message="Customers will not see this option at checkout any more. Orders already placed keep their saved area and charge."
          loading={working}
          onConfirm={confirmDelete}
          onClose={() => setToDelete(null)}
        />
      )}

      <Toast state={toast} />
    </div>
  );
}
