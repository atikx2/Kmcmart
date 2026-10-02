"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  BadgeCheck,
  Heart,
  Minus,
  Plus,
  RotateCcw,
  ShoppingBag,
  ShoppingCart,
  Truck,
} from "lucide-react";
import type { ProductLite } from "@/db/schema";
import { discountPercent, effectivePrice, taka } from "@/lib/format";
import { useCart } from "@/components/site/Providers";

export type ProductView = ProductLite & {
  images: string[];
  stock: number;
  categoryName: string;
};

export default function ProductClient({
  product,
  buyNowText,
  deliveryCharge,
}: {
  product: ProductView;
  buyNowText: string;
  deliveryCharge: number;
}) {
  const router = useRouter();
  const { addItem } = useCart();
  const [qty, setQty] = useState(1);
  const [active, setActive] = useState(0);

  const pct = discountPercent(product.regularPrice, product.sellPrice);
  const price = effectivePrice(product.regularPrice, product.sellPrice);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10 items-start">
      {/* gallery */}
      <div>
        <div className="relative rounded-3xl overflow-hidden bg-white border border-gray-100 shadow-[0_14px_50px_rgba(17,18,28,0.1)] h-[300px] sm:h-[360px] md:h-auto md:aspect-[4/4.7]">
          {pct !== null && <span className="offer-tag text-xs">{pct}% OFF</span>}
          <Image
            src={product.images[active] || product.image}
            alt={product.name}
            fill
            priority
            sizes="(max-width: 768px) 100vw, 45vw"
            className="object-cover"
          />
        </div>
        {product.images.length > 1 && (
          <div className="mt-3 flex gap-2.5">
            {product.images.map((src, i) => (
              <button
                key={src + i}
                onClick={() => setActive(i)}
                className={`relative w-16 h-16 rounded-xl overflow-hidden border-2 transition ${
                  i === active ? "border-[var(--g1)]" : "border-transparent opacity-70 hover:opacity-100"
                }`}
              >
                <Image src={src} alt={`Thumb ${i + 1}`} fill className="object-cover" sizes="64px" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* details */}
      <div>
        <span className="inline-flex items-center gap-1.5 grad-soft grad-text text-[11px] font-extrabold uppercase tracking-[0.14em] px-3.5 py-1.5 rounded-full">
          <ShoppingBag size={12} />
          {product.categoryName}
        </span>

        <h1 className="mt-3 font-display text-[21px] sm:text-2xl md:text-[30px] font-extrabold tracking-tight text-gray-900 leading-snug">
          {product.name}
        </h1>

        <div className="mt-3.5 flex flex-wrap items-end gap-x-3 gap-y-1.5">
          <span className="grad-text font-display font-extrabold text-3xl md:text-4xl leading-none">
            {taka(price)}
          </span>
          {pct !== null && (
            <>
              <span className="text-gray-400 line-through font-bold text-lg">{taka(product.regularPrice)}</span>
              <span className="grad-bg text-white text-[11px] font-extrabold px-2.5 py-1 rounded-full">
                Save {taka(product.regularPrice - price)}
              </span>
            </>
          )}
        </div>

        <div className="mt-4 flex items-center gap-2 text-sm">
          <span
            className={`inline-flex items-center gap-1.5 font-bold text-xs px-3 py-1.5 rounded-full ${
              product.stock > 0 ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500"
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${product.stock > 0 ? "bg-emerald-500" : "bg-red-500"}`} />
            {product.stock > 0 ? `In Stock (${product.stock} pcs)` : "Out of Stock"}
          </span>
        </div>

        {/* qty + actions */}
        <div className="mt-6 flex items-stretch gap-3">
          <div className="inline-flex items-center border-[1.5px] border-gray-200 rounded-2xl bg-white">
            <button
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              className="w-10 h-full grid place-items-center text-gray-500 hover:text-gray-900"
              aria-label="Decrease quantity"
            >
              <Minus size={15} />
            </button>
            <span className="w-9 text-center font-extrabold text-sm">{qty}</span>
            <button
              onClick={() => setQty((q) => Math.min(product.stock || 99, q + 1))}
              className="w-10 h-full grid place-items-center text-gray-500 hover:text-gray-900"
              aria-label="Increase quantity"
            >
              <Plus size={15} />
            </button>
          </div>
          <button
            onClick={() =>
              addItem(
                {
                  id: product.id,
                  name: product.name,
                  slug: product.slug,
                  image: product.image,
                  regularPrice: product.regularPrice,
                  sellPrice: product.sellPrice,
                  freeDelivery: product.freeDelivery,
                },
                qty
              )
            }
            className="flex-1 grad-border rounded-2xl text-sm font-extrabold text-gray-800 flex items-center justify-center gap-2 hover:shadow-lg active:scale-[0.99] transition min-h-[48px]"
          >
            <ShoppingCart size={16} className="text-[var(--g2)]" />
            Add to Cart
          </button>
          <button
            aria-label="Add to wishlist"
            className="w-12 rounded-2xl border-[1.5px] border-gray-200 grid place-items-center text-gray-400 hover:text-[var(--g2)] hover:border-[var(--g2)] transition"
          >
            <Heart size={17} />
          </button>
        </div>

        <button
          onClick={() => router.push(`/checkout?buy=${product.slug}&qty=${qty}`)}
          disabled={product.stock <= 0}
          className="mt-3 w-full grad-bg text-white rounded-2xl py-3.5 md:py-4 text-sm md:text-[15px] font-extrabold flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.99] transition disabled:opacity-50 shadow-[0_12px_32px_rgba(255,61,119,0.3)]"
        >
          <ShoppingBag size={17} strokeWidth={2.4} />
          {buyNowText} — {taka(price * qty)}
        </button>

        {/* delivery perks */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {[
            {
              icon: Truck,
              title: product.freeDelivery ? "Free Delivery" : "Home Delivery",
              sub: product.freeDelivery ? "No delivery charge" : `Charge from ${taka(deliveryCharge)}`,
            },
            { icon: BadgeCheck, title: "100% Genuine", sub: "Quality checked" },
            { icon: RotateCcw, title: "Easy Return", sub: "7 days replacement" },
          ].map(({ icon: Icon, title, sub }) => (
            <div key={title} className="bg-white border border-gray-100 rounded-2xl px-3.5 py-3 flex items-center gap-2.5">
              <span className="grad-bg text-white rounded-xl p-2 shrink-0">
                <Icon size={14} />
              </span>
              <span className="min-w-0">
                <span className="block text-[11.5px] font-extrabold text-gray-800 leading-tight">{title}</span>
                <span className="block text-[10.5px] text-gray-400 font-semibold truncate">{sub}</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
