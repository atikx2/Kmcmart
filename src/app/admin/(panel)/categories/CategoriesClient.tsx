"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowDownUp,
  Eye,
  EyeOff,
  Hash,
  Home,
  Image as ImageIcon,
  Inbox,
  Layers,
  Loader2,
  MousePointerClick,
  Package,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Shapes,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import {
  emptyCategoryForm,
  type AdminCategoryList,
  type AdminCategoryRow,
  type CategoryFormValues,
} from "@/lib/category-admin";
import InlineEdit from "@/components/admin/InlineEdit";
import Toast, { useToast } from "@/components/admin/Toast";
import CategoryModal from "./CategoryModal";
import DeleteCategoryModal from "./DeleteCategoryModal";

type IconCmp = React.ComponentType<{ size?: number | string; className?: string; strokeWidth?: number }>;

function Th({ icon: Icon, label, className = "" }: { icon: IconCmp; label: string; className?: string }) {
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

const ACTION_BTN =
  "w-[30px] h-[30px] rounded-full grid place-items-center transition-all duration-200 shadow-[0_1px_3px_rgba(17,18,28,0.08)] hover:-translate-y-0.5 hover:shadow-[0_6px_14px_rgba(17,18,28,0.18)]";

function TogglePill({
  on,
  busy,
  onClick,
  iconOn: IconOn,
  iconOff: IconOff,
  labelOn,
  labelOff,
  title,
  tone,
}: {
  on: boolean;
  busy: boolean;
  onClick: () => void;
  iconOn: IconCmp;
  iconOff: IconCmp;
  labelOn: string;
  labelOff: string;
  title: string;
  tone: "emerald" | "violet";
}) {
  const active =
    tone === "emerald"
      ? "bg-emerald-50 text-emerald-600 ring-emerald-100 hover:bg-emerald-100"
      : "bg-violet-50 text-violet-600 ring-violet-100 hover:bg-violet-100";
  const Icon = on ? IconOn : IconOff;
  return (
    <button
      onClick={onClick}
      disabled={busy}
      title={title}
      className={`inline-flex items-center gap-1 text-[9.5px] font-extrabold uppercase tracking-wider px-2 py-[4px] rounded-full ring-1 transition disabled:opacity-60 ${
        on ? active : "bg-gray-100 text-gray-500 ring-gray-200 hover:bg-gray-200"
      }`}
    >
      {busy ? <Loader2 size={10} className="animate-spin" /> : <Icon size={10} strokeWidth={2.6} />}
      {on ? labelOn : labelOff}
    </button>
  );
}

export default function CategoriesClient({ initial }: { initial: AdminCategoryList }) {
  const router = useRouter();
  const [toast, showToast] = useToast();

  const [data, setData] = useState<AdminCategoryList>(initial);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [rowBusy, setRowBusy] = useState<number | null>(null);
  const [modal, setModal] = useState<{ mode: "create" | "edit"; row?: AdminCategoryRow } | null>(null);
  const [toDelete, setToDelete] = useState<AdminCategoryRow | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/categories");
      if (!res.ok) throw new Error("Failed");
      setData(await res.json());
    } catch {
      showToast("err", "Could not load categories");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  const patchRow = (id: number, patch: Partial<AdminCategoryRow>) =>
    setData((d) => ({ ...d, items: d.items.map((c) => (c.id === id ? { ...c, ...patch } : c)) }));

  const saveField = async (id: number, body: Record<string, unknown>) => {
    const res = await fetch(`/api/admin/categories/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Could not save");
    return json;
  };

  const toggle = async (c: AdminCategoryRow, key: "isActive" | "showOnHome") => {
    const next = !c[key];
    setRowBusy(c.id);
    patchRow(c.id, { [key]: next });
    try {
      await saveField(c.id, { [key]: next });
      showToast(
        "ok",
        key === "isActive"
          ? next
            ? `${c.name} is visible in the store`
            : `${c.name} is hidden`
          : next
            ? `${c.name} section shows on home`
            : `${c.name} section removed from home`
      );
      router.refresh();
    } catch (e) {
      patchRow(c.id, { [key]: !next });
      showToast("err", e instanceof Error ? e.message : "Could not update");
    } finally {
      setRowBusy(null);
    }
  };

  const q = input.trim().toLowerCase();
  const items = useMemo(
    () => (q ? data.items.filter((c) => c.name.toLowerCase().includes(q) || c.slug.includes(q)) : data.items),
    [data.items, q]
  );

  const nextSort = useMemo(
    () => (data.items.length ? Math.max(...data.items.map((c) => c.sortOrder)) + 1 : 1),
    [data.items]
  );

  const initialForm: CategoryFormValues =
    modal?.mode === "edit" && modal.row
      ? {
          name: modal.row.name,
          slug: modal.row.slug,
          imageUrl: modal.row.imageUrl,
          sortOrder: String(modal.row.sortOrder),
          isActive: modal.row.isActive,
          showOnHome: modal.row.showOnHome,
        }
      : emptyCategoryForm(nextSort);

  const totalProducts = data.items.reduce((a, c) => a + c.productCount, 0);
  const liveCount = data.items.filter((c) => c.isActive).length;
  const homeCount = data.items.filter((c) => c.showOnHome).length;

  return (
    <div className="space-y-4">
      {/* ---------------- summary + search ---------------- */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_4px_18px_rgba(17,18,28,0.05)] p-3 md:p-4">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-1 px-1 lg:mx-0 lg:px-0">
            {[
              { icon: Layers, label: "Total", value: data.total },
              { icon: Eye, label: "Live", value: liveCount },
              { icon: Home, label: "On home", value: homeCount },
              { icon: Package, label: "Products", value: totalProducts },
            ].map((s) => {
              const Icon = s.icon;
              return (
                <span
                  key={s.label}
                  className="shrink-0 flex items-center gap-2 rounded-2xl bg-[#fafafc] border border-gray-100 px-3.5 py-2.5"
                >
                  <span className="w-[26px] h-[26px] rounded-[9px] grad-soft grid place-items-center text-[var(--g2)]">
                    <Icon size={13} strokeWidth={2.4} />
                  </span>
                  <span className="font-display text-[15px] font-extrabold leading-none text-gray-800">{s.value}</span>
                  <span className="text-[10.5px] font-extrabold uppercase tracking-wider text-gray-400">{s.label}</span>
                </span>
              );
            })}
          </div>

          <div className="lg:ml-auto flex flex-col sm:flex-row gap-2.5 min-w-0">
            <span className="relative min-w-0 sm:w-[230px]">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Search categories…"
                className="w-full rounded-2xl border-[1.5px] border-gray-200 bg-[#fbfbfe] pl-10 pr-9 py-2.5 text-[12.5px] font-bold outline-none focus:border-[var(--g1)] focus:bg-white transition"
              />
              {input && (
                <button
                  onClick={() => setInput("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  aria-label="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </span>

            <button
              onClick={() => setModal({ mode: "create" })}
              className="shrink-0 flex items-center justify-center gap-2 grad-bg text-white rounded-2xl px-4 py-2.5 text-[12.5px] font-extrabold hover:opacity-90 transition"
            >
              <Plus size={15} strokeWidth={2.6} />
              Add Category
            </button>
          </div>
        </div>
      </div>

      {/* ---------------- list ---------------- */}
      <div className="relative bg-white rounded-3xl border border-gray-100 shadow-[0_4px_18px_rgba(17,18,28,0.05)] overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-4 md:px-6 py-4 border-b border-gray-100">
          <h2 className="font-display font-extrabold text-base md:text-lg flex items-center gap-2.5 min-w-0">
            <span className="grad-bg text-white rounded-xl p-2 shrink-0">
              <Shapes size={15} strokeWidth={2.4} />
            </span>
            <span className="truncate">All Categories</span>
          </h2>

          <span className="shrink-0 flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-wider text-gray-400">
            {loading && <Loader2 size={13} className="animate-spin text-[var(--g2)]" />}
            {items.length} shown
          </span>
        </div>

        {items.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <span className="mx-auto w-20 h-20 rounded-full grad-soft grid place-items-center mb-4">
              <Inbox size={30} className="text-gray-400" />
            </span>
            <p className="font-display font-extrabold text-gray-700">
              {q ? "No category matched your search" : "No categories yet"}
            </p>
            <p className="text-[13px] font-semibold text-gray-400 mt-1.5 max-w-[360px] mx-auto">
              {q
                ? "Try a different name or slug."
                : "Create your first category — products are grouped under it on the storefront."}
            </p>
            {q ? (
              <button
                onClick={() => setInput("")}
                className="mt-5 inline-flex items-center gap-2 grad-bg text-white text-[12.5px] font-extrabold px-5 py-2.5 rounded-full hover:opacity-90 transition"
              >
                <RotateCcw size={14} />
                Clear search
              </button>
            ) : (
              <button
                onClick={() => setModal({ mode: "create" })}
                className="mt-5 inline-flex items-center gap-2 grad-bg text-white text-[12.5px] font-extrabold px-5 py-2.5 rounded-full hover:opacity-90 transition"
              >
                <Plus size={15} />
                Add Category
              </button>
            )}
          </div>
        ) : (
          <div className="relative">
            <div className="overflow-x-auto overscroll-x-contain [scrollbar-width:thin] [scrollbar-color:#d8d8e2_transparent]">
              <table className="w-full min-w-[880px] text-sm">
                <thead>
                  <tr className="text-left bg-gradient-to-r from-[#fff8f3] via-[#fff6f8] to-[#fff4f8] border-y border-gray-100">
                    <Th icon={Hash} label="SL" className="w-[64px]" />
                    <Th icon={ImageIcon} label="Image" className="w-[92px]" />
                    <Th icon={Tag} label="Name" />
                    <Th icon={Package} label="Products" />
                    <Th icon={ArrowDownUp} label="Sort" />
                    <Th icon={Eye} label="Visibility" />
                    <Th icon={MousePointerClick} label="Action" className="text-right" />
                  </tr>
                </thead>
                <tbody>
                  {items.map((c, i) => (
                    <tr
                      key={c.id}
                      className={`group border-b border-gray-50 last:border-0 align-top transition-colors ${
                        i % 2 === 1 ? "bg-[#fcfcfd] hover:bg-[#fff7f3]" : "hover:bg-[#fff7f3]"
                      }`}
                    >
                      {/* SL */}
                      <td className="px-3 py-4">
                        <span className="inline-grid place-items-center w-7 h-7 rounded-lg bg-[#fafafc] border border-gray-100 text-[11px] font-extrabold text-gray-500">
                          {i + 1}
                        </span>
                      </td>

                      {/* image */}
                      <td className="px-3 py-4">
                        <button
                          onClick={() => setModal({ mode: "edit", row: c })}
                          className="relative block w-[62px] h-[62px] rounded-xl overflow-hidden bg-gray-100 ring-1 ring-gray-100 shadow-[0_1px_3px_rgba(17,18,28,0.08)]"
                          title="Edit category"
                        >
                          {c.imageUrl ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img src={c.imageUrl} alt={c.name} className="w-full h-full object-cover" loading="lazy" />
                          ) : (
                            <span className="w-full h-full grid place-items-center">
                              <Shapes size={18} className="text-gray-300" />
                            </span>
                          )}
                        </button>
                      </td>

                      {/* name — inline AJAX */}
                      <td className="px-3 py-4">
                        <div className="w-[240px]">
                          <InlineEdit
                            value={c.name}
                            title="Edit category name"
                            inputClassName="w-[170px]"
                            display={
                              <span className="block text-[13px] font-extrabold text-gray-800 leading-snug line-clamp-2">
                                {c.name}
                              </span>
                            }
                            onSave={async (next) => {
                              const name = next.trim();
                              if (name.length < 2) throw new Error("Too short");
                              await saveField(c.id, { name });
                              patchRow(c.id, { name });
                              showToast("ok", "Category renamed");
                              router.refresh();
                            }}
                          />
                          <p className="mt-1 text-[10px] font-bold text-gray-400 truncate">/category/{c.slug}</p>
                        </div>
                      </td>

                      {/* products */}
                      <td className="px-3 py-4">
                        <div className="w-[128px]">
                          {c.productCount > 0 ? (
                            <Link
                              href={`/admin/products?category=${c.id}`}
                              className="inline-flex items-center gap-1.5 rounded-xl bg-[#fafafc] border border-gray-100 px-2.5 py-1.5 hover:border-[var(--g1)] transition"
                              title={`View the ${c.productCount} products in ${c.name}`}
                            >
                              <Package size={12} strokeWidth={2.5} className="text-[var(--g2)]" />
                              <span className="font-display text-[14px] font-extrabold leading-none text-gray-800">
                                {c.productCount}
                              </span>
                              <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">
                                item{c.productCount > 1 ? "s" : ""}
                              </span>
                            </Link>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-xl bg-[#fafafc] border border-gray-100 px-2.5 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-gray-400">
                              <Package size={12} strokeWidth={2.5} />
                              Empty
                            </span>
                          )}
                        </div>
                      </td>

                      {/* sort order — inline AJAX */}
                      <td className="px-3 py-4">
                        <div className="w-[96px]">
                          <InlineEdit
                            value={String(c.sortOrder)}
                            type="number"
                            title="Edit sort order"
                            inputClassName="w-[64px]"
                            prefix={
                              <span className="w-[22px] h-[22px] rounded-lg grad-soft grid place-items-center shrink-0 text-[var(--g2)] mt-[2px]">
                                <ArrowDownUp size={11} strokeWidth={2.5} />
                              </span>
                            }
                            display={
                              <span className="font-display font-extrabold text-[15.5px] grad-text leading-none">
                                {c.sortOrder}
                              </span>
                            }
                            onSave={async (next) => {
                              const n = Number(next);
                              if (!Number.isFinite(n) || n < 0) throw new Error("Invalid");
                              await saveField(c.id, { sortOrder: Math.round(n) });
                              showToast("ok", "Sort order updated");
                              await refresh();
                              router.refresh();
                            }}
                          />
                          <p className="mt-1.5 text-[9.5px] font-extrabold text-gray-400">lower = first</p>
                        </div>
                      </td>

                      {/* visibility toggles */}
                      <td className="px-3 py-4">
                        <div className="w-[168px] flex flex-col items-start gap-1.5">
                          <TogglePill
                            on={c.isActive}
                            busy={rowBusy === c.id}
                            onClick={() => toggle(c, "isActive")}
                            iconOn={Eye}
                            iconOff={EyeOff}
                            labelOn="Live"
                            labelOff="Hidden"
                            tone="emerald"
                            title={c.isActive ? "Visible in the store — click to hide" : "Hidden — click to show"}
                          />
                          <TogglePill
                            on={c.showOnHome}
                            busy={rowBusy === c.id}
                            onClick={() => toggle(c, "showOnHome")}
                            iconOn={Home}
                            iconOff={Home}
                            labelOn="Home section on"
                            labelOff="Home section off"
                            tone="violet"
                            title="Home page section visible"
                          />
                        </div>
                      </td>

                      {/* actions */}
                      <td className="px-3 py-4">
                        <div className="flex justify-end">
                          <div className="inline-grid grid-cols-2 gap-1.5 p-1.5 rounded-2xl bg-[#fafafc] border border-gray-100">
                            <button
                              onClick={() => setModal({ mode: "edit", row: c })}
                              title="Edit category"
                              className={`${ACTION_BTN} bg-indigo-50 text-indigo-500 hover:bg-indigo-500 hover:text-white`}
                            >
                              <Pencil size={13} strokeWidth={2.4} />
                            </button>
                            <button
                              onClick={() => setToDelete(c)}
                              title={c.productCount > 0 ? "Has products — move them first" : "Delete category"}
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

      {modal && (
        <CategoryModal
          key={modal.mode === "edit" ? `edit-${modal.row?.id}` : "create"}
          mode={modal.mode}
          category={modal.row}
          initial={initialForm}
          onClose={() => setModal(null)}
          onSaved={async (msg) => {
            setModal(null);
            showToast("ok", msg);
            await refresh();
            router.refresh();
          }}
        />
      )}

      {toDelete && (
        <DeleteCategoryModal
          category={toDelete}
          others={data.items.filter((c) => c.id !== toDelete.id)}
          onClose={() => setToDelete(null)}
          onDeleted={async (msg) => {
            setToDelete(null);
            showToast("ok", msg);
            await refresh();
            router.refresh();
          }}
        />
      )}

      <Toast state={toast} />
    </div>
  );
}
