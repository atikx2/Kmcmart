import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, FileText } from "lucide-react";
import {
  getDeliveryAreas,
  getProductBySlug,
  getRelatedProducts,
  getSettings,
} from "@/lib/data";
import ProductClient from "./ProductClient";
import ProductCard from "@/components/home/ProductCard";
import SectionTitle from "@/components/site/SectionTitle";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const p = await getProductBySlug(slug);
  if (!p) return { title: "Product not found" };
  return { title: p.name, description: p.description.slice(0, 150) };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [settings, product, areas] = await Promise.all([
    getSettings(),
    getProductBySlug(slug),
    getDeliveryAreas(),
  ]);
  if (!product) notFound();

  const related = await getRelatedProducts(product.categoryId, product.id, 6);
  const images = product.images.length > 0 ? product.images : ["/assets/logo-header.svg"];

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-6 py-5 md:py-9">
      {/* breadcrumb */}
      <nav className="flex items-center gap-1.5 text-[12px] md:text-[13px] font-semibold text-gray-400 mb-5 md:mb-7 overflow-x-auto no-scrollbar whitespace-nowrap">
        <Link href="/" className="hover:text-gray-700 transition">Home</Link>
        <ChevronRight size={13} />
        {product.category && (
          <>
            <Link href={`/category/${product.category.slug}`} className="hover:text-gray-700 transition">
              {product.category.name}
            </Link>
            <ChevronRight size={13} />
          </>
        )}
        <span className="text-gray-700 truncate max-w-[200px] md:max-w-none">{product.name}</span>
      </nav>

      <ProductClient
        product={{
          id: product.id,
          name: product.name,
          slug: product.slug,
          image: images[0],
          images,
          regularPrice: product.regularPrice,
          sellPrice: product.sellPrice,
          stock: product.stock,
          categoryName: product.category?.name ?? "Product",
        }}
        buyNowText={settings.buyNowText}
        deliveryCharge={areas[0]?.charge ?? 100}
      />

      {/* description */}
      <section className="mt-10 md:mt-14 bg-white rounded-3xl border border-gray-100 shadow-[0_8px_30px_rgba(17,18,28,0.05)] p-5 md:p-8">
        <h2 className="font-display font-extrabold text-lg md:text-xl flex items-center gap-2.5">
          <span className="grad-bg text-white rounded-xl p-2">
            <FileText size={16} />
          </span>
          Product Description
        </h2>
        <span className="block mt-3 h-[3px] w-12 rounded-full grad-bg" />
        <p className="mt-4 text-sm md:text-[15px] text-gray-600 leading-relaxed">{product.description}</p>
        <ul className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-[13px] text-gray-600">
          {[
            "100% authentic & brand new",
            "Cash on delivery available",
            "Fast delivery inside Dhaka (24–48h)",
            "Easy 7-day replacement guarantee",
          ].map((f) => (
            <li key={f} className="flex items-center gap-2.5 bg-gray-50 rounded-xl px-3.5 py-2.5 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full grad-bg shrink-0" />
              {f}
            </li>
          ))}
        </ul>
      </section>

      {/* related */}
      {related.length > 0 && (
        <section className="mt-12 md:mt-16">
          <SectionTitle eyebrow="You may also like" title="Related Products" />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 md:gap-4">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} buyNowText={settings.buyNowText} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
