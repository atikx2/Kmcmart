import type { Metadata } from "next";
import Link from "next/link";
import { SearchX } from "lucide-react";
import { getProducts, getSettings } from "@/lib/data";
import ProductCard from "@/components/home/ProductCard";

export const metadata: Metadata = { title: "Search" };

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const settings = await getSettings();
  const result = q.trim()
    ? await getProducts({ q, limit: 60 })
    : { items: [], hasMore: false, total: 0 };

  return (
    <div className="max-w-7xl mx-auto px-3 lg:px-6 py-8 md:py-12">
      <div className="text-center mb-8 md:mb-10">
        <h1 className="font-display text-2xl md:text-3xl font-extrabold tracking-tight">
          {q.trim() ? (
            <>
              Results for <span className="grad-text">“{q.trim()}”</span>
            </>
          ) : (
            "Search Products"
          )}
        </h1>
        <p className="mt-2 text-sm text-gray-400 font-semibold">
          {result.total} product{result.total === 1 ? "" : "s"} found
        </p>
      </div>

      {result.items.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 md:gap-4">
          {result.items.map((p) => (
            <ProductCard key={p.id} product={p} buyNowText={settings.buyNowText} />
          ))}
        </div>
      ) : (
        <div className="max-w-md mx-auto text-center bg-white rounded-3xl border border-gray-100 shadow-sm px-6 py-12">
          <div className="mx-auto w-20 h-20 rounded-full grad-soft grid place-items-center mb-4">
            <SearchX size={30} className="text-gray-400" />
          </div>
          <p className="font-extrabold text-gray-800">Nothing found</p>
          <p className="text-sm text-gray-400 mt-1">
            Try a different keyword or browse our categories
          </p>
          <Link
            href="/"
            className="inline-block mt-6 grad-bg text-white text-sm font-extrabold px-7 py-3 rounded-full hover:opacity-90 transition"
          >
            Back to Home
          </Link>
        </div>
      )}
    </div>
  );
}
