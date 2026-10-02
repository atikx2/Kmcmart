"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ChevronDown,
  Loader2,
  PackageSearch,
  Shapes,
  Trash2,
  X,
} from "lucide-react";
import type { AdminCategoryRow } from "@/lib/category-admin";
import type { AdminProductRow } from "@/lib/product-admin";

export default function DeleteCategoryModal({
  category,
  others,
  onClose,
  onDeleted,
}: {
  category: AdminCategoryRow;
  others: AdminCategoryRow[];
  onClose: () => void;
  onDeleted: (message: string) => void;
}) {
  const blocked = category.productCount > 0;
  const [moveTo, setMoveTo] = useState<number>(others[0]?.id ?? 0);
  const [products, setProducts] = useState<AdminProductRow[] | null>(null);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");

  /* Show the admin exactly which products are blocking the delete. */
  useEffect(() => {
    if (!blocked) return;
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`/api/admin/products?categoryId=${category.id}&limit=100`);
        const json = await res.json();
        if (alive) setProducts(res.ok ? json.items : []);
      } catch {
        if (alive) setProducts([]);
      }
    })();
    return () => {
      alive = false;
    };
  }, [blocked, category.id]);

  const run = async () => {
    if (working) return;
    if (blocked && !moveTo) {
      setError("Create another category first, then move these products into it.");
      return;
    }
    setWorking(true);
    setError("");
    try {
      const url = blocked
        ? `/api/admin/categories/${category.id}?moveTo=${moveTo}`
        : `/api/admin/categories/${category.id}`;
      const res = await fetch(url, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Delete failed");
      onDeleted(
        blocked
          ? `Category deleted — ${category.productCount} product${category.productCount > 1 ? "s" : ""} moved`
          : "Category deleted"
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
      setWorking(false);
    }
  };

  const target = others.find((c) => c.id === moveTo);

  return (
    <div className="fixed inset-0 z-[130] grid place-items-center px-4 py-6 overflow-y-auto">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[3px]" onClick={working ? undefined : onClose} />

      <div className="relative w-full max-w-[460px] bg-white rounded-3xl shadow-2xl animate-slide-down my-auto">
        <div className="p-6 pb-0">
          <button
            onClick={onClose}
            disabled={working}
            className="absolute right-4 top-4 w-9 h-9 rounded-full bg-gray-100 grid place-items-center hover:bg-gray-200 transition disabled:opacity-50"
            aria-label="Close"
          >
            <X size={16} />
          </button>

          <span className="w-12 h-12 rounded-2xl grid place-items-center text-white shadow-md bg-gradient-to-br from-rose-500 to-red-500">
            <AlertTriangle size={20} />
          </span>

          <h3 className="font-display font-extrabold text-lg mt-4 pr-10">Delete “{category.name}”?</h3>

          {blocked ? (
            <p className="text-[13px] font-semibold text-gray-500 mt-1.5 leading-relaxed">
              This category still holds{" "}
              <b className="text-rose-600">
                {category.productCount} product{category.productCount > 1 ? "s" : ""}
              </b>
              , so it cannot be deleted on its own. Move them to another category first.
            </p>
          ) : (
            <p className="text-[13px] font-semibold text-gray-500 mt-1.5 leading-relaxed">
              It has no products, so deleting it is safe. This cannot be undone.
            </p>
          )}
        </div>

        {blocked && (
          <div className="px-6 pt-4 space-y-3">
            <div className="rounded-2xl border border-gray-100 bg-[#fafafc] max-h-[168px] overflow-y-auto">
              {products === null ? (
                <p className="flex items-center justify-center gap-2 py-6 text-[12px] font-bold text-gray-400">
                  <Loader2 size={14} className="animate-spin" />
                  Loading products…
                </p>
              ) : products.length === 0 ? (
                <p className="py-6 text-center text-[12px] font-bold text-gray-400">No products found</p>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {products.map((p) => (
                    <li key={p.id} className="flex items-center gap-2.5 px-3 py-2">
                      <span className="relative w-8 h-8 rounded-lg overflow-hidden bg-gray-100 ring-1 ring-gray-100 shrink-0">
                        {p.image ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img src={p.image} alt={p.name} className="w-full h-full object-cover" loading="lazy" />
                        ) : (
                          <span className="w-full h-full grid place-items-center">
                            <PackageSearch size={13} className="text-gray-300" />
                          </span>
                        )}
                      </span>
                      <span className="min-w-0 flex-1 text-[12px] font-bold text-gray-700 truncate" title={p.name}>
                        {p.name}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <label className="block">
              <span className="block text-[11px] font-extrabold uppercase tracking-wider text-gray-500 mb-1.5">
                Move these products to
              </span>
              <span className="relative block">
                <Shapes size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--g2)] pointer-events-none" />
                <select
                  value={moveTo}
                  disabled={working || others.length === 0}
                  onChange={(e) => setMoveTo(Number(e.target.value))}
                  className="w-full appearance-none rounded-2xl border-[1.5px] border-gray-200 bg-white pl-10 pr-9 py-3 text-[12.5px] font-extrabold text-gray-700 cursor-pointer hover:border-[var(--g1)] transition disabled:opacity-60"
                >
                  {others.length === 0 ? (
                    <option value={0}>No other category available</option>
                  ) : (
                    others.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.productCount})
                      </option>
                    ))
                  )}
                </select>
                <ChevronDown size={15} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </span>
            </label>
          </div>
        )}

        {error && (
          <p className="mx-6 mt-4 flex items-center gap-2 text-[12px] font-bold text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-3.5 py-2.5">
            <AlertTriangle size={14} />
            {error}
          </p>
        )}

        <div className="flex gap-2.5 p-6">
          <button
            onClick={onClose}
            disabled={working}
            className="flex-1 rounded-2xl py-3 text-[13px] font-extrabold text-gray-600 bg-gray-100 hover:bg-gray-200 transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={run}
            disabled={working || (blocked && others.length === 0)}
            className="flex-1 rounded-2xl py-3 text-[13px] font-extrabold text-white flex items-center justify-center gap-2 bg-gradient-to-br from-rose-500 to-red-500 hover:opacity-90 active:scale-[0.99] transition disabled:opacity-60"
          >
            {working ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={14} />}
            {working ? "Deleting…" : blocked ? `Move & Delete` : "Delete"}
          </button>
        </div>

        {blocked && others.length > 0 && !error && (
          <p className="px-6 pb-5 -mt-3 text-[11px] font-semibold text-gray-400 text-center">
            {category.productCount} product{category.productCount > 1 ? "s" : ""} → {target?.name}
          </p>
        )}
      </div>
    </div>
  );
}
