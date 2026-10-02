"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ShoppingBag, Truck } from "lucide-react";
import type { ProductLite } from "@/db/schema";
import { discountPercent, effectivePrice, taka } from "@/lib/format";
import { useText } from "@/components/site/Providers";

export default function ProductCard({ product }: { product: ProductLite }) {
  const text = useText();
  const router = useRouter();
  const pct = discountPercent(product.regularPrice, product.sellPrice);
  const price = effectivePrice(product.regularPrice, product.sellPrice);

  return (
    <div className="group h-full flex flex-col bg-white rounded-2xl border border-gray-100 shadow-[0_2px_12px_rgba(17,18,28,0.06)] hover:shadow-[0_16px_44px_rgba(17,18,28,0.14)] hover:-translate-y-1 transition-all duration-300 overflow-hidden">
      <Link href={`/product/${product.slug}`} className="relative block aspect-[4/4.4] md:aspect-[4/4.6] bg-gray-50 overflow-hidden">
        {pct !== null && (
          <span className="offer-tag">
            {pct}% {text.off}
          </span>
        )}
        {product.freeDelivery && (
          <span className="absolute top-2 right-2 z-[2] inline-flex items-center gap-1 bg-emerald-500 text-white text-[9px] md:text-[10px] font-extrabold uppercase tracking-wider px-2 py-1 rounded-full shadow-sm">
            <Truck size={10} strokeWidth={2.6} />
            {text.free}
          </span>
        )}
        <Image
          src={product.image}
          alt={product.name}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 16vw"
          className="object-cover group-hover:scale-105 transition-transform duration-500"
        />
      </Link>

      <div className="flex flex-col flex-1 p-2.5 md:p-3.5">
        <div className="flex items-baseline gap-1.5 md:gap-2 flex-nowrap">
          <span className="grad-text font-extrabold text-[15px] md:text-[17px] leading-none whitespace-nowrap">
            {taka(price)}
          </span>
          {pct !== null && (
            <span className="text-[11px] md:text-xs text-gray-400 line-through font-semibold whitespace-nowrap">
              {taka(product.regularPrice)}
            </span>
          )}
        </div>

        <Link href={`/product/${product.slug}`} className="mt-1.5 block">
          <h3 className="text-[12.5px] md:text-[13.5px] font-bold text-gray-800 leading-snug line-clamp-1 group-hover:text-black transition">
            {product.name}
          </h3>
        </Link>

        <button
          onClick={() => router.push(`/checkout?buy=${product.slug}&qty=1`)}
          className="mt-2.5 md:mt-3 grad-bg text-white rounded-xl py-2 md:py-2.5 text-[11.5px] md:text-[13px] font-extrabold flex items-center justify-center gap-1.5 hover:opacity-90 active:scale-[0.98] transition"
        >
          <ShoppingBag size={14} strokeWidth={2.4} />
          {text.buyNow}
        </button>
      </div>
    </div>
  );
}
