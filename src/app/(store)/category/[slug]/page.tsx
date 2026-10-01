import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Package } from "lucide-react";
import { getCategoryBySlug, getProducts, getSettings } from "@/lib/data";
import ProductsBlock from "@/components/home/ProductsBlock";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const c = await getCategoryBySlug(slug);
  if (!c) return { title: "Category not found" };
  return { title: c.name };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [settings, category] = await Promise.all([getSettings(), getCategoryBySlug(slug)]);
  if (!category) notFound();

  const result = await getProducts({ categorySlug: slug, limit: 12 });

  return (
    <div>
      {/* category hero band */}
      <div className="grad-bg text-white">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-10 md:py-14 text-center">
          <h1 className="font-display text-2xl md:text-4xl font-extrabold tracking-tight">{category.name}</h1>
          <p className="mt-2 text-white/80 text-xs md:text-sm font-semibold flex items-center justify-center gap-1.5">
            <Package size={14} />
            {result.total} products available
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 lg:px-6 py-8 md:py-10">
        <ProductsBlock
          initialItems={result.items}
          initialHasMore={result.hasMore}
          categorySlug={slug}
          buyNowText={settings.buyNowText}
          mobilePeek={6}
        />
      </div>
    </div>
  );
}
