"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Category } from "@/db/schema";

export default function CategorySlider({ categories }: { categories: Category[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [scrollable, setScrollable] = useState(false);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const check = () => setScrollable(el.scrollWidth > el.clientWidth + 8);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, [categories]);

  const scrollBy = (dir: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: "smooth" });
  };

  return (
    <div className="relative">
      {scrollable && (
        <>
          <button
            onClick={() => scrollBy(-1)}
            aria-label="Scroll categories left"
            className="absolute -left-3 md:-left-5 top-[38%] -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white shadow-[0_6px_20px_rgba(17,18,28,0.15)] border border-gray-100 grid place-items-center text-gray-600 hover:grad-bg hover:text-white transition-all"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={() => scrollBy(1)}
            aria-label="Scroll categories right"
            className="absolute -right-3 md:-right-5 top-[38%] -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white shadow-[0_6px_20px_rgba(17,18,28,0.15)] border border-gray-100 grid place-items-center text-gray-600 hover:grad-bg hover:text-white transition-all"
          >
            <ChevronRight size={18} />
          </button>
        </>
      )}

      <div
        ref={trackRef}
        className="flex gap-1 md:gap-2 overflow-x-auto no-scrollbar snap-x snap-mandatory scroll-smooth px-1 py-2"
      >
        {categories.map((c) => (
          <Link
            key={c.id}
            href={`/category/${c.slug}`}
            className="group basis-1/3 sm:basis-1/4 md:basis-1/6 shrink-0 snap-start flex flex-col items-center px-1 py-3"
          >
            <span className="relative w-[88px] h-[88px] sm:w-24 sm:h-24 md:w-[108px] md:h-[108px] rounded-full p-[3px] bg-white shadow-[0_10px_28px_rgba(17,18,28,0.12)] group-hover:shadow-[0_14px_34px_rgba(17,18,28,0.2)] group-hover:-translate-y-1.5 transition-all duration-300">
              <span className="block w-full h-full rounded-full overflow-hidden ring-2 ring-gray-100 group-hover:ring-[var(--g1)] transition-all">
                <Image
                  src={c.imageUrl}
                  alt={c.name}
                  width={220}
                  height={220}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
              </span>
            </span>
            <span className="mt-3 text-center text-[11px] sm:text-xs md:text-[13px] font-extrabold text-gray-700 group-hover:grad-text transition leading-tight px-1">
              {c.name}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
