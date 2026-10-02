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
  Link2,
  List,
  Loader2,
  MousePointerClick,
  Plus,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import { HREF_HINT, isValidHref, normalizeHref, type AdminMenu } from "@/lib/site-content";
import ConfirmModal from "@/components/admin/ConfirmModal";
import InlineEdit from "@/components/admin/InlineEdit";
import Toast, { useToast } from "@/components/admin/Toast";
import { ACTION_BTN, StatChip, Th } from "@/components/admin/table-ui";

const QUICK_LINKS = ["/", "/search", "/checkout", "/account", "/category/electronics"];

export default function MenusClient({ initial }: { initial: AdminMenu[] }) {
  const router = useRouter();
  const [toast, showToast] = useToast();
  const [items, setItems] = useState<AdminMenu[]>(initial);
  const [loading, setLoading] = useState(false);
  const [rowBusy, setRowBusy] = useState<number | null>(null);
  const [toDelete, setToDelete] = useState<AdminMenu | null>(null);
  const [working, setWorking] = useState(false);

  /* add row */
  const [adding, setAdding] = useState(false);
  const [label, setLabel] = useState("");
  const [href, setHref] = useState("");
  const [sortOrder, setSortOrder] = useState("");
  const [addError, setAddError] = useState("");
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/menus");
      if (!res.ok) throw new Error();
      setItems((await res.json()).items);
    } catch {
      showToast("err", "Could not load menu items");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  const save = async (id: number, body: Record<string, unknown>) => {
    const res = await fetch(`/api/admin/menus/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Could not save");
    return json;
  };

  const nextSort = items.length ? Math.max(...items.map((m) => m.sortOrder)) + 1 : 1;

  const openAdd = () => {
    setLabel("");
    setHref("");
    setSortOrder(String(nextSort));
    setAddError("");
    setAdding(true);
  };

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    if (!label.trim()) {
      setAddError("Menu label is required");
      return;
    }
    if (!isValidHref(normalizeHref(href))) {
      setAddError(HREF_HINT);
      return;
    }
    setSaving(true);
    setAddError("");
    try {
      const res = await fetch("/api/admin/menus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: label.trim(),
          href: normalizeHref(href),
          sortOrder: Math.max(0, Math.round(Number(sortOrder) || 0)),
          isActive: true,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not add the menu item");
      setAdding(false);
      showToast("ok", "Menu item added");
      await refresh();
      router.refresh();
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Could not add the menu item");
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (m: AdminMenu) => {
    setRowBusy(m.id);
    setItems((prev) => prev.map((x) => (x.id === m.id ? { ...x, isActive: !m.isActive } : x)));
    try {
      await save(m.id, { isActive: !m.isActive });
      showToast("ok", !m.isActive ? `${m.label} is visible` : `${m.label} hidden`);
      router.refresh();
    } catch (e) {
      setItems((prev) => prev.map((x) => (x.id === m.id ? { ...x, isActive: m.isActive } : x)));
      showToast("err", e instanceof Error ? e.message : "Could not update");
    } finally {
      setRowBusy(null);
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    setWorking(true);
    try {
      const res = await fetch(`/api/admin/menus/${toDelete.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Delete failed");
      setToDelete(null);
      showToast("ok", "Menu item deleted");
      await refresh();
      router.refresh();
    } catch (e) {
      showToast("err", e instanceof Error ? e.message : "Delete failed");
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_4px_18px_rgba(17,18,28,0.05)] p-3 md:p-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <p className="flex items-start gap-2 text-[11.5px] font-bold text-sky-700 bg-sky-50 border border-sky-100 rounded-2xl px-3.5 py-2.5 min-w-0 flex-1">
            <Info size={14} className="shrink-0 mt-[1px]" />
            <span className="min-w-0">{HREF_HINT}</span>
          </p>
          <div className="shrink-0 flex items-center gap-2.5">
            <StatChip icon={Eye} label="live" value={`${items.filter((m) => m.isActive).length}/${items.length}`} />
            <button
              onClick={openAdd}
              className="flex items-center justify-center gap-2 grad-bg text-white rounded-2xl px-4 py-2.5 text-[12.5px] font-extrabold hover:opacity-90 transition"
            >
              <Plus size={15} strokeWidth={2.6} />
              Add Menu
            </button>
          </div>
        </div>

        {adding && (
          <form onSubmit={create} className="mt-3 rounded-2xl border-[1.5px] border-gray-100 bg-[#fbfbfe] p-3.5">
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_1.3fr_110px_auto] gap-2.5 items-start">
              <label className="block min-w-0">
                <span className="block text-[10.5px] font-extrabold uppercase tracking-wider text-gray-500 mb-1.5">Label</span>
                <input
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="Offers"
                  autoFocus
                  className="w-full rounded-xl border-[1.5px] border-gray-200 bg-white px-3.5 py-2.5 text-[12.5px] font-bold outline-none focus:border-[var(--g1)] transition"
                />
              </label>
              <label className="block min-w-0">
                <span className="block text-[10.5px] font-extrabold uppercase tracking-wider text-gray-500 mb-1.5">Link (href)</span>
                <input
                  value={href}
                  onChange={(e) => setHref(e.target.value)}
                  placeholder="/category/electronics"
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

            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
              <span className="text-[10.5px] font-extrabold uppercase tracking-wider text-gray-400">Quick</span>
              {QUICK_LINKS.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setHref(q)}
                  className="text-[10.5px] font-extrabold text-gray-500 bg-white border border-gray-200 rounded-lg px-2 py-1 hover:border-[var(--g1)] hover:text-[var(--g2)] transition"
                >
                  {q}
                </button>
              ))}
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
              <List size={15} strokeWidth={2.4} />
            </span>
            <span className="truncate">Header Menu</span>
          </h2>
          <span className="shrink-0 flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-wider text-gray-400">
            {loading && <Loader2 size={13} className="animate-spin text-[var(--g2)]" />}
            {items.length} links
          </span>
        </div>

        {items.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <span className="mx-auto w-20 h-20 rounded-full grad-soft grid place-items-center mb-4">
              <Inbox size={30} className="text-gray-400" />
            </span>
            <p className="font-display font-extrabold text-gray-700">No menu links yet</p>
            <p className="text-[13px] font-semibold text-gray-400 mt-1.5 max-w-[360px] mx-auto">
              These links show in the header nav and the footer quick links.
            </p>
            <button
              onClick={openAdd}
              className="mt-5 inline-flex items-center gap-2 grad-bg text-white text-[12.5px] font-extrabold px-5 py-2.5 rounded-full hover:opacity-90 transition"
            >
              <Plus size={15} />
              Add Menu
            </button>
          </div>
        ) : (
          <div className="relative">
            <div className="overflow-x-auto overscroll-x-contain [scrollbar-width:thin] [scrollbar-color:#d8d8e2_transparent]">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="text-left bg-gradient-to-r from-[#fff8f3] via-[#fff6f8] to-[#fff4f8] border-y border-gray-100">
                    <Th icon={Hash} label="SL" className="w-[64px]" />
                    <Th icon={Tag} label="Label" />
                    <Th icon={Link2} label="Link" />
                    <Th icon={ArrowDownUp} label="Sort" />
                    <Th icon={Eye} label="Status" />
                    <Th icon={MousePointerClick} label="Action" className="text-right" />
                  </tr>
                </thead>
                <tbody>
                  {items.map((m, i) => (
                    <tr
                      key={m.id}
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
                        <div className="w-[190px]">
                          <InlineEdit
                            value={m.label}
                            title="Edit label"
                            inputClassName="w-[140px]"
                            display={<span className="block text-[13px] font-extrabold text-gray-800 leading-snug">{m.label}</span>}
                            onSave={async (next) => {
                              const v = next.trim();
                              if (!v) throw new Error("Required");
                              await save(m.id, { label: v });
                              setItems((prev) => prev.map((x) => (x.id === m.id ? { ...x, label: v } : x)));
                              showToast("ok", "Label updated");
                              router.refresh();
                            }}
                          />
                        </div>
                      </td>

                      <td className="px-3 py-4">
                        <div className="w-[240px]">
                          <InlineEdit
                            value={m.href}
                            title="Edit link"
                            inputClassName="w-[190px]"
                            prefix={
                              <span className="w-[22px] h-[22px] rounded-lg grad-soft grid place-items-center shrink-0 text-[var(--g2)] mt-[2px]">
                                <Link2 size={11} strokeWidth={2.5} />
                              </span>
                            }
                            display={
                              <span className="inline-block max-w-[210px] truncate rounded-lg bg-[#fafafc] border border-gray-100 px-2 py-1 text-[11.5px] font-extrabold text-gray-600">
                                {m.href}
                              </span>
                            }
                            onSave={async (next) => {
                              const v = normalizeHref(next);
                              if (!isValidHref(v)) throw new Error("Must start with /");
                              await save(m.id, { href: v });
                              setItems((prev) => prev.map((x) => (x.id === m.id ? { ...x, href: v } : x)));
                              showToast("ok", "Link updated");
                              router.refresh();
                            }}
                          />
                        </div>
                      </td>

                      <td className="px-3 py-4">
                        <div className="w-[96px]">
                          <InlineEdit
                            value={String(m.sortOrder)}
                            type="number"
                            title="Edit sort order"
                            inputClassName="w-[64px]"
                            prefix={
                              <span className="w-[22px] h-[22px] rounded-lg grad-soft grid place-items-center shrink-0 text-[var(--g2)] mt-[2px]">
                                <ArrowDownUp size={11} strokeWidth={2.5} />
                              </span>
                            }
                            display={<span className="font-display font-extrabold text-[15.5px] grad-text leading-none">{m.sortOrder}</span>}
                            onSave={async (next) => {
                              const n = Number(next);
                              if (!Number.isFinite(n) || n < 0) throw new Error("Invalid");
                              await save(m.id, { sortOrder: Math.round(n) });
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
                          onClick={() => toggle(m)}
                          disabled={rowBusy === m.id}
                          title={m.isActive ? "Visible — click to hide" : "Hidden — click to show"}
                          className={`inline-flex items-center gap-1 text-[9.5px] font-extrabold uppercase tracking-wider px-2 py-[4px] rounded-full ring-1 transition disabled:opacity-60 ${
                            m.isActive
                              ? "bg-emerald-50 text-emerald-600 ring-emerald-100 hover:bg-emerald-100"
                              : "bg-gray-100 text-gray-500 ring-gray-200 hover:bg-gray-200"
                          }`}
                        >
                          {rowBusy === m.id ? (
                            <Loader2 size={10} className="animate-spin" />
                          ) : m.isActive ? (
                            <Eye size={10} strokeWidth={2.6} />
                          ) : (
                            <EyeOff size={10} strokeWidth={2.6} />
                          )}
                          {m.isActive ? "Live" : "Hidden"}
                        </button>
                      </td>

                      <td className="px-3 py-4">
                        <div className="flex justify-end">
                          <div className="inline-grid grid-cols-1 gap-1.5 p-1.5 rounded-2xl bg-[#fafafc] border border-gray-100">
                            <button
                              onClick={() => setToDelete(m)}
                              title="Delete menu item"
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
          title={`Delete “${toDelete.label}”?`}
          message="The link disappears from the header and footer right away."
          loading={working}
          onConfirm={confirmDelete}
          onClose={() => setToDelete(null)}
        />
      )}

      <Toast state={toast} />
    </div>
  );
}
