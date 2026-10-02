"use client";

import { useState } from "react";
import { ChevronDown, Loader2 } from "lucide-react";
import type { ProductLite } from "@/db/schema";
import { useText } from "@/components/site/Providers";
import ProductCard from "./ProductCard";

const PAGE = 12;

export default function ProductsBlock({
  initialItems,
  initialHasMore,
  categorySlug,
  mobilePeek = 4,
}: {
  initialItems: ProductLite[];
  initialHasMore: boolean;
  categorySlug: string;
  mobilePeek?: number;
}) {
  const text = useText();
  const [items, setItems] = useState<ProductLite[]>(initialItems);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const loadMore = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/products?category=${encodeURIComponent(categorySlug)}&offset=${items.length}&limit=${PAGE}`
      );
      const data = await res.json();
      setItems((prev) => [...prev, ...(data.items as ProductLite[])]);
      setHasMore(Boolean(data.hasMore));
      setExpanded(true);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  if (items.length === 0) {
    return (
      <p className="text-center text-sm text-gray-400 py-10">{text.noProducts}</p>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 md:gap-4">
        {items.map((p, i) => (
          <div key={p.id} className={!expanded && i >= mobilePeek ? "hidden md:block" : "animate-fade-up"}>
            <ProductCard product={p} />
          </div>
        ))}
      </div>

      {hasMore && (
        <div className="mt-7 md:mt-9 flex justify-center">
          <button
            onClick={loadMore}
            disabled={loading}
            className="grad-border rounded-full pl-7 pr-5 py-2.5 md:py-3 text-[13px] md:text-sm font-extrabold text-gray-800 flex items-center gap-2 hover:shadow-[0_10px_30px_rgba(17,18,28,0.12)] active:scale-[0.98] transition disabled:opacity-70"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin text-[var(--g2)]" />
                Loading…
              </>
            ) : (
              <>
                {text.loadMore}
                <span className="grad-bg text-white rounded-full p-1">
                  <ChevronDown size={13} strokeWidth={3} />
                </span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
