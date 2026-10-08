"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  BadgePercent,
  Boxes,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Hash,
  Image as ImageIcon,
  Inbox,
  Layers,
  Loader2,
  MousePointerClick,
  Package,
  PackageSearch,
  Pencil,
  PiggyBank,
  Plus,
  RotateCcw,
  Search,
  Shapes,
  ShieldCheck,
  Tag,
  Trash2,
  Truck,
  Wallet,
  X,
} from "lucide-react";
import { taka } from "@/lib/format";
import {
  PRODUCTS_PAGE_SIZES,
  stockInfo,
  STOCK_BAR,
  STOCK_CHIP,
  STOCK_TEXT,
  type AdminProductList,
  type AdminProductRow,
} from "@/lib/product-admin";
import ConfirmModal from "@/components/admin/ConfirmModal";
import InlineEdit from "@/components/admin/InlineEdit";
import Toast, { useToast } from "@/components/admin/Toast";

type IconCmp = React.ComponentType<{ size?: number | string; className?: string; strokeWidth?: number }>;
type StockKey = "all" | "in" | "low" | "out";

const STOCK_TABS: { key: StockKey; label: string; icon: IconCmp }[] = [
  { key: "all", label: "All", icon: Layers },
  { key: "in", label: "In Stock", icon: ShieldCheck },
  { key: "low", label: "Low Stock", icon: AlertTriangle },
  { key: "out", label: "Out of Stock", icon: X },
];

function Th({
  icon: Icon,
  label,
  className = "",
}: {
  icon: IconCmp;
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

const ACTION_BTN =
  "w-[30px] h-[30px] rounded-full grid place-items-center transition-all duration-200 shadow-[0_1px_3px_rgba(17,18,28,0.08)] hover:-translate-y-0.5 hover:shadow-[0_6px_14px_rgba(17,18,28,0.18)]";

export default function ProductsClient({
  initial,
  initialCategoryId = 0,
}: {
  initial: AdminProductList;
  initialCategoryId?: number;
}) {
  const router = useRouter();
  const [toast, showToast] = useToast();

  const [stock, setStock] = useState<StockKey>("all");
  const [categoryId, setCategoryId] = useState<number | 0>(initialCategoryId);
  const [input, setInput] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState<number>(initial.limit);

  const [data, setData] = useState<AdminProductList>(initial);
  const [loading, setLoading] = useState(false);
  const [rowBusy, setRowBusy] = useState<number | null>(null);
  const [toDelete, setToDelete] = useState<AdminProductRow | null>(null);
  const [working, setWorking] = useState(false);
  const [selected, setSelected] = useState<number[]>([]);

  const firstRender = useRef(true);

  /* debounce the search box */
  useEffect(() => {
    const t = setTimeout(() => {
      setQ(input.trim());
      setPage(0);
    }, 350);
    return () => clearTimeout(t);
  }, [input]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const sp = new URLSearchParams({
        stock,
        q,
        offset: String(page * limit),
        limit: String(limit),
      });
      if (categoryId) sp.set("categoryId", String(categoryId));
      const res = await fetch(`/api/admin/products?${sp.toString()}`);
      if (!res.ok) throw new Error("Failed to load products");
      setData(await res.json());
    } catch {
      showToast("err", "Could not load products");
    } finally {
      setLoading(false);
    }
  }, [stock, categoryId, q, page, limit, showToast]);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    refresh();
  }, [refresh]);

  const patchRow = (id: number, patch: Partial<AdminProductRow>) =>
    setData((d) => ({ ...d, items: d.items.map((p) => (p.id === id ? { ...p, ...patch } : p)) }));

  const saveField = async (id: number, body: Record<string, unknown>) => {
    const res = await fetch(`/api/admin/products/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Could not save");
    return json;
  };

  const changeCategory = async (p: AdminProductRow, nextId: number) => {
    if (nextId === p.categoryId) return;
    const prev = { categoryId: p.categoryId, categoryName: p.categoryName };
    const nextName = data.categories.find((c) => c.id === nextId)?.name ?? "";
    setRowBusy(p.id);
    patchRow(p.id, { categoryId: nextId, categoryName: nextName });
    try {
      await saveField(p.id, { categoryId: nextId });
      showToast("ok", `${p.name.split(" ").slice(0, 2).join(" ")} → ${nextName}`);
      router.refresh();
    } catch (e) {
      patchRow(p.id, prev);
      showToast("err", e instanceof Error ? e.message : "Category update failed");
    } finally {
      setRowBusy(null);
    }
  };

  const toggleActive = async (p: AdminProductRow) => {
    setRowBusy(p.id);
    patchRow(p.id, { isActive: !p.isActive });
    try {
      await saveField(p.id, { isActive: !p.isActive });
      router.refresh();
    } catch (e) {
      patchRow(p.id, { isActive: p.isActive });
      showToast("err", e instanceof Error ? e.message : "Could not change visibility");
    } finally {
      setRowBusy(null);
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    setWorking(true);
    try {
      const res = await fetch(`/api/admin/products/${toDelete.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Delete failed");
      showToast("ok", "Product deleted");
      setToDelete(null);
      await refresh();
      router.refresh();
    } catch (e) {
      showToast("err", e instanceof Error ? e.message : "Delete failed");
    } finally {
      setWorking(false);
    }
  };

  const bulk = async (action: "activate" | "hide" | "delete") => {
    if (!selected.length || (action === "delete" && !confirm(`Delete ${selected.length} selected product(s)?`))) return;
    setWorking(true); try { const res = await fetch("/api/admin/products/bulk", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: selected, action }) }); const json = await res.json(); if (!res.ok) throw new Error(json.error); showToast("ok", `${json.count} product(s) updated`); setSelected([]); await refresh(); router.refresh(); } catch (e) { showToast("err", e instanceof Error ? e.message : "Bulk action failed"); } finally { setWorking(false); }
  };
  const totalPages = Math.max(1, Math.ceil(data.total / limit));
  const from = data.total === 0 ? 0 : page * limit + 1;
  const to = Math.min(data.total, page * limit + data.items.length);
  const sl = (i: number) => page * limit + i + 1;
  const filtered = q !== "" || stock !== "all" || categoryId !== 0;

  return (
    <div className="space-y-4">
      {/* ---------------- filters ---------------- */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_4px_18px_rgba(17,18,28,0.05)] p-3 md:p-4">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-1 px-1 lg:mx-0 lg:px-0">
            {STOCK_TABS.map((t) => {
              const Icon = t.icon;
              const active = stock === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => {
                    setStock(t.key);
                    setPage(0);
                  }}
                  className={`shrink-0 flex items-center gap-2 rounded-2xl px-3.5 py-2.5 text-[12px] font-extrabold transition ${
                    active ? "grad-bg text-white shadow-[0_8px_20px_rgba(255,61,119,0.3)]" : "text-gray-500 hover:bg-gray-50"
                  }`}
                >
                  <Icon size={14} strokeWidth={2.4} />
                  {t.label}
                </button>
              );
            })}
          </div>

          <div className="lg:ml-auto flex flex-col sm:flex-row gap-2.5 min-w-0">
            <span className="relative min-w-0 sm:w-[190px]">
              <Shapes size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--g2)] pointer-events-none" />
              <select
                value={categoryId}
                onChange={(e) => {
                  setCategoryId(Number(e.target.value));
                  setPage(0);
                }}
                className="w-full appearance-none rounded-2xl border-[1.5px] border-gray-200 bg-white pl-9 pr-8 py-2.5 text-[12.5px] font-extrabold text-gray-700 cursor-pointer hover:border-[var(--g1)] transition"
              >
                <option value={0}>All categories</option>
                {data.categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </span>

            <span className="relative min-w-0 sm:w-[230px]">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Search products…"
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

            <Link
              href="/admin/products/new"
              className="shrink-0 flex items-center justify-center gap-2 grad-bg text-white rounded-2xl px-4 py-2.5 text-[12.5px] font-extrabold hover:opacity-90 transition"
            >
              <Plus size={15} strokeWidth={2.6} />
              Add Product
            </Link>
          </div>
        </div>
      </div>

      {/* ---------------- list ---------------- */}
      <div className="relative bg-white rounded-3xl border border-gray-100 shadow-[0_4px_18px_rgba(17,18,28,0.05)] overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-4 md:px-6 py-4 border-b border-gray-100">
          <h2 className="font-display font-extrabold text-base md:text-lg flex items-center gap-2.5 min-w-0">
            <span className="grad-bg text-white rounded-xl p-2 shrink-0">
              <Package size={15} strokeWidth={2.4} />
            </span>
            <span className="truncate">All Products</span>
          </h2>

          <div className="shrink-0 flex items-center gap-3">
            <span className="hidden sm:flex items-center gap-2 text-[11.5px] font-extrabold text-gray-400">
              Show
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setPage(0);
                }}
                className="rounded-xl border-[1.5px] border-gray-200 bg-white px-2.5 py-1.5 text-[12px] font-extrabold text-gray-700 cursor-pointer hover:border-[var(--g1)] transition"
              >
                {PRODUCTS_PAGE_SIZES.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </span>
            <span className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-wider text-gray-400">
              {loading && <Loader2 size={13} className="animate-spin text-[var(--g2)]" />}
              {data.total} total
            </span>
          </div>
        </div>

        {selected.length > 0 && <div className="mx-4 md:mx-6 my-3 flex flex-wrap items-center gap-2 rounded-2xl bg-[#fff7f3] border border-orange-100 px-3 py-2.5"><span className="text-xs font-extrabold text-gray-700 mr-auto">{selected.length} selected</span><button onClick={()=>bulk("activate")} disabled={working} className="rounded-xl bg-emerald-500 text-white px-3 py-2 text-xs font-extrabold">Show</button><button onClick={()=>bulk("hide")} disabled={working} className="rounded-xl bg-gray-700 text-white px-3 py-2 text-xs font-extrabold">Hide</button><button onClick={()=>bulk("delete")} disabled={working} className="rounded-xl bg-rose-500 text-white px-3 py-2 text-xs font-extrabold">Delete</button><button onClick={()=>setSelected([])} className="rounded-xl border border-gray-200 px-3 py-2 text-xs font-extrabold">Clear</button></div>}
        {data.items.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <span className="mx-auto w-20 h-20 rounded-full grad-soft grid place-items-center mb-4">
              <Inbox size={30} className="text-gray-400" />
            </span>
            <p className="font-display font-extrabold text-gray-700">
              {filtered ? "No products matched your filters" : "No products yet"}
            </p>
            <p className="text-[13px] font-semibold text-gray-400 mt-1.5 max-w-[360px] mx-auto">
              {filtered
                ? "Try a different search, category or stock filter."
                : "Add your first product and it will show up on the storefront instantly."}
            </p>
            {filtered ? (
              <button
                onClick={() => {
                  setInput("");
                  setStock("all");
                  setCategoryId(0);
                  setPage(0);
                }}
                className="mt-5 inline-flex items-center gap-2 grad-bg text-white text-[12.5px] font-extrabold px-5 py-2.5 rounded-full hover:opacity-90 transition"
              >
                <RotateCcw size={14} />
                Reset filters
              </button>
            ) : (
              <Link
                href="/admin/products/new"
                className="mt-5 inline-flex items-center gap-2 grad-bg text-white text-[12.5px] font-extrabold px-5 py-2.5 rounded-full hover:opacity-90 transition"
              >
                <Plus size={15} />
                Add Product
              </Link>
            )}
          </div>
        ) : (
          <>
            <div className="relative">
              <div className="overflow-x-auto overscroll-x-contain [scrollbar-width:thin] [scrollbar-color:#d8d8e2_transparent]">
                <table className="w-full min-w-[980px] text-sm">
                  <thead>
                    <tr className="text-left bg-gradient-to-r from-[#fff8f3] via-[#fff6f8] to-[#fff4f8] border-y border-gray-100">
                      <th className="px-3 py-3.5 w-[42px]"><input type="checkbox" checked={data.items.length>0 && data.items.every(p=>selected.includes(p.id))} onChange={e=>setSelected(e.target.checked ? data.items.map(p=>p.id) : [])} /></th><Th icon={Hash} label="SL" className="w-[64px]" />
                      <Th icon={ImageIcon} label="Image" className="w-[92px]" />
                      <Th icon={Tag} label="Name" />
                      <Th icon={Boxes} label="Stock" />
                      <Th icon={Shapes} label="Category" />
                      <Th icon={Wallet} label="Price" />
                      <Th icon={MousePointerClick} label="Action" className="text-right" />
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((p, i) => {
                      const st = stockInfo(p.stock);
                      const effective = p.sellPrice && p.sellPrice > 0 ? p.sellPrice : p.regularPrice;
                      const discount =
                        p.sellPrice && p.sellPrice > 0 && p.sellPrice < p.regularPrice
                          ? Math.round(((p.regularPrice - p.sellPrice) / p.regularPrice) * 100)
                          : null;
                      return (
                        <tr
                          key={p.id}
                          className={`group border-b border-gray-50 last:border-0 align-top transition-colors ${
                            i % 2 === 1 ? "bg-[#fcfcfd] hover:bg-[#fff7f3]" : "hover:bg-[#fff7f3]"
                          }`}
                        >
                          <td className="px-3 py-4"><input type="checkbox" checked={selected.includes(p.id)} onChange={e=>setSelected(s=>e.target.checked?[...s,p.id]:s.filter(id=>id!==p.id))} /></td>
                          {/* SL */}
                          <td className="px-3 py-4">
                            <span className="inline-grid place-items-center w-7 h-7 rounded-lg bg-[#fafafc] border border-gray-100 text-[11px] font-extrabold text-gray-500">
                              {sl(i)}
                            </span>
                          </td>

                          {/* image */}
                          <td className="px-3 py-4">
                            <Link
                              href={`/admin/products/${p.id}/edit`}
                              className="relative block w-[62px] h-[62px] rounded-xl overflow-hidden bg-gray-100 ring-1 ring-gray-100 shadow-[0_1px_3px_rgba(17,18,28,0.08)]"
                            >
                              {p.image ? (
                                /* eslint-disable-next-line @next/next/no-img-element */
                                <img src={p.image} alt={p.name} className="w-full h-full object-cover" loading="lazy" />
                              ) : (
                                <span className="w-full h-full grid place-items-center">
                                  <PackageSearch size={18} className="text-gray-300" />
                                </span>
                              )}
                              {p.imagesCount > 1 && (
                                <span className="absolute bottom-1 right-1 bg-black/65 text-white text-[9px] font-extrabold leading-none px-1.5 py-[3px] rounded-md">
                                  +{p.imagesCount - 1}
                                </span>
                              )}
                            </Link>
                          </td>

                          {/* name */}
                          <td className="px-3 py-4">
                            <div className="w-[230px]">
                              <Link
                                href={`/admin/products/${p.id}/edit`}
                                title={p.name}
                                className="block text-[13px] font-extrabold text-gray-800 hover:grad-text leading-snug line-clamp-2"
                              >
                                {p.name}
                              </Link>
                              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                                <button
                                  onClick={() => toggleActive(p)}
                                  disabled={rowBusy === p.id}
                                  title={p.isActive ? "Visible — click to hide" : "Hidden — click to show"}
                                  className={`inline-flex items-center gap-1 text-[9.5px] font-extrabold uppercase tracking-wider px-2 py-[3px] rounded-full ring-1 transition disabled:opacity-60 ${
                                    p.isActive
                                      ? "bg-emerald-50 text-emerald-600 ring-emerald-100 hover:bg-emerald-100"
                                      : "bg-gray-100 text-gray-500 ring-gray-200 hover:bg-gray-200"
                                  }`}
                                >
                                  {p.isActive ? <Eye size={10} strokeWidth={2.6} /> : <EyeOff size={10} strokeWidth={2.6} />}
                                  {p.isActive ? "Live" : "Hidden"}
                                </button>
                                {p.freeDelivery && (
                                  <span className="inline-flex items-center gap-1 text-[9.5px] font-extrabold uppercase tracking-wider px-2 py-[3px] rounded-full ring-1 bg-sky-50 text-sky-600 ring-sky-100">
                                    <Truck size={10} strokeWidth={2.6} />
                                    Free
                                  </span>
                                )}
                                <span className="text-[9.5px] font-bold text-gray-400">{p.createdAt}</span>
                              </div>
                            </div>
                          </td>

                          {/* stock */}
                          <td className="px-3 py-4">
                            <div className="w-[124px]">
                              <div className="flex items-center justify-between gap-1.5">
                                <span
                                  className={`inline-flex items-center gap-1 text-[9.5px] font-extrabold uppercase tracking-[0.1em] px-2 py-[3px] rounded-full ring-1 ${
                                    STOCK_CHIP[st.tone]
                                  }`}
                                >
                                  {st.tone === "emerald" ? (
                                    <ShieldCheck size={10} strokeWidth={2.6} />
                                  ) : (
                                    <AlertTriangle size={10} strokeWidth={2.6} />
                                  )}
                                  {st.label}
                                </span>
                                <span className={`font-display text-[14px] font-extrabold leading-none ${STOCK_TEXT[st.tone]}`}>
                                  {p.stock}
                                </span>
                              </div>
                              <div className="relative mt-2 h-[8px] rounded-full bg-gray-100 shadow-[inset_0_1px_2px_rgba(17,18,28,0.09)] overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-[width] duration-500 ${STOCK_BAR[st.tone]}`}
                                  style={{ width: `${Math.max(st.percent, p.stock > 0 ? 8 : 0)}%` }}
                                >
                                  <span className="block h-1/2 rounded-full bg-gradient-to-b from-white/45 to-transparent" />
                                </div>
                              </div>
                              <p className="mt-2 text-[9.5px] font-extrabold text-gray-400">
                                {p.stock === 0 ? "Restock needed" : `${p.stock} pcs available`}
                              </p>
                            </div>
                          </td>

                          {/* category — inline AJAX */}
                          <td className="px-3 py-4">
                            <span className="relative block w-[156px]">
                              <Shapes
                                size={13}
                                strokeWidth={2.5}
                                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--g2)] pointer-events-none"
                              />
                              <select
                                value={p.categoryId}
                                disabled={rowBusy === p.id}
                                onChange={(e) => changeCategory(p, Number(e.target.value))}
                                className="w-full appearance-none rounded-xl border-[1.5px] border-gray-200 bg-white pl-8 pr-7 py-2.5 text-[11.5px] font-extrabold text-gray-700 cursor-pointer transition hover:border-[var(--g1)] hover:shadow-[0_2px_8px_rgba(17,18,28,0.08)] disabled:opacity-60"
                              >
                                {data.categories.map((c) => (
                                  <option key={c.id} value={c.id}>
                                    {c.name}
                                  </option>
                                ))}
                              </select>
                              {rowBusy === p.id ? (
                                <Loader2
                                  size={12}
                                  className="absolute right-2.5 top-1/2 -translate-y-1/2 animate-spin text-gray-500 pointer-events-none"
                                />
                              ) : (
                                <ChevronDown
                                  size={13}
                                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                                />
                              )}
                            </span>
                          </td>

                          {/* price — inline AJAX */}
                          <td className="px-3 py-4">
                            <div className="w-[150px]">
                              <InlineEdit
                                value={String(effective)}
                                type="number"
                                title="Edit selling price"
                                inputClassName="w-[88px]"
                                prefix={
                                  <span className="w-[22px] h-[22px] rounded-lg grad-soft grid place-items-center shrink-0 text-[var(--g2)] mt-[2px]">
                                    <Wallet size={11} strokeWidth={2.5} />
                                  </span>
                                }
                                display={
                                  <span className="flex items-baseline gap-1.5 flex-wrap">
                                    <span className="font-display font-extrabold text-[15.5px] grad-text leading-none">
                                      {taka(effective)}
                                    </span>
                                    {discount !== null && (
                                      <span className="text-[10.5px] font-bold text-gray-400 line-through">
                                        {taka(p.regularPrice)}
                                      </span>
                                    )}
                                  </span>
                                }
                                onSave={async (next) => {
                                  const n = Number(next);
                                  if (!Number.isFinite(n) || n <= 0) throw new Error("Invalid amount");
                                  const body =
                                    n >= p.regularPrice
                                      ? { regularPrice: Math.round(n), sellPrice: null }
                                      : { sellPrice: Math.round(n) };
                                  await saveField(p.id, body);
                                  patchRow(
                                    p.id,
                                    n >= p.regularPrice
                                      ? { regularPrice: Math.round(n), sellPrice: null }
                                      : { sellPrice: Math.round(n) }
                                  );
                                  showToast("ok", "Price updated");
                                }}
                              />

                              <div className="mt-2 flex flex-wrap gap-1">
                                {discount !== null && (
                                  <span className="inline-flex items-center gap-1 text-[9.5px] font-extrabold text-rose-500 bg-rose-50 border border-rose-100 rounded-md px-1.5 py-[3px]">
                                    <BadgePercent size={10} strokeWidth={2.6} />
                                    {discount}% off
                                  </span>
                                )}
                                <span className="inline-flex items-center gap-1 text-[9.5px] font-extrabold text-gray-500 bg-[#fafafc] border border-gray-100 rounded-md px-1.5 py-[3px]">
                                  <PiggyBank size={10} strokeWidth={2.6} />
                                  {p.costPrice ? taka(p.costPrice) : "no cost"}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* actions */}
                          <td className="px-3 py-4">
                            <div className="flex justify-end">
                              <div className="inline-grid grid-cols-2 gap-1.5 p-1.5 rounded-2xl bg-[#fafafc] border border-gray-100">
                                <Link
                                  href={`/admin/products/${p.id}/edit`}
                                  title="Edit product"
                                  className={`${ACTION_BTN} bg-indigo-50 text-indigo-500 hover:bg-indigo-500 hover:text-white`}
                                >
                                  <Pencil size={13} strokeWidth={2.4} />
                                </Link>
                                <button
                                  onClick={() => setToDelete(p)}
                                  title="Delete product"
                                  className={`${ACTION_BTN} bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white`}
                                >
                                  <Trash2 size={13} strokeWidth={2.4} />
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

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
          title="Delete this product?"
          message={
            <>
              <b className="text-gray-700">{toDelete.name}</b> will be removed from the store permanently. This cannot
              be undone.
            </>
          }
          loading={working}
          onConfirm={confirmDelete}
          onClose={() => (working ? undefined : setToDelete(null))}
        />
      )}

      <Toast state={toast} />
    </div>
  );
}
