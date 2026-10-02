"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  ChevronRight,
  Loader2,
  Menu as MenuIcon,
  Phone,
  Search,
  ShoppingCart,
  User,
  X,
} from "lucide-react";
import type { Menu, ProductLite, Settings } from "@/db/schema";
import { effectivePrice, taka } from "@/lib/format";
import type { SiteText } from "@/lib/i18n";
import { useCart, useText } from "./Providers";
import Brand from "./Brand";

/* --------------------------- live search --------------------------- */

function LiveSearch({ autoFocus = false, onNavigate }: { autoFocus?: boolean; onNavigate?: () => void }) {
  const text = useText();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<ProductLite[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (q.trim().length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q.trim())}`);
        const data = await res.json();
        setResults(data.items ?? []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 280);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const go = (href: string) => {
    setOpen(false);
    onNavigate?.();
    router.push(href);
  };

  return (
    <div ref={boxRef} className="relative w-full">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (q.trim()) go(`/search?q=${encodeURIComponent(q.trim())}`);
        }}
        className="flex items-center w-full rounded-full border-[1.5px] border-gray-200 bg-gray-50 focus-within:bg-white focus-within:border-[var(--g1)] transition-all overflow-hidden"
      >
        <input
          value={q}
          autoFocus={autoFocus}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={text.searchPlaceholder}
          className="flex-1 bg-transparent px-4 md:px-5 py-2.5 text-sm outline-none placeholder:text-gray-400 min-w-0"
        />
        {loading && <Loader2 size={16} className="animate-spin text-gray-400 shrink-0" />}
        <button
          type="submit"
          className="grad-bg text-white h-9 md:h-10 px-4 md:px-6 mr-[3px] rounded-full flex items-center gap-1.5 text-sm font-bold shrink-0 hover:opacity-90 transition"
          aria-label={text.navSearch}
        >
          <Search size={15} />
          <span className="hidden md:inline">{text.navSearch}</span>
        </button>
      </form>

      {open && q.trim().length >= 2 && (
        <div className="absolute left-0 right-0 top-[calc(100%+8px)] bg-white rounded-2xl shadow-[0_20px_60px_rgba(17,18,28,0.16)] border border-gray-100 overflow-hidden z-[70] animate-slide-down">
          {results.length > 0 ? (
            <>
              <div className="max-h-[330px] overflow-y-auto py-1.5">
                {results.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => go(`/product/${p.slug}`)}
                    className="w-full flex items-center gap-3 px-3.5 py-2.5 hover:bg-gray-50 text-left transition"
                  >
                    <span className="relative w-11 h-11 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                      <Image src={p.image} alt={p.name} fill className="object-cover" sizes="44px" />
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-[13px] font-bold text-gray-800 truncate">{p.name}</span>
                      <span className="flex items-center gap-2 mt-0.5">
                        <span className="grad-text text-[13px] font-extrabold">
                          {taka(effectivePrice(p.regularPrice, p.sellPrice))}
                        </span>
                        {p.sellPrice && p.sellPrice < p.regularPrice && (
                          <span className="text-[11px] text-gray-400 line-through">{taka(p.regularPrice)}</span>
                        )}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
              <button
                onClick={() => go(`/search?q=${encodeURIComponent(q.trim())}`)}
                className="w-full text-center text-xs font-extrabold grad-text py-3 border-t border-gray-100 hover:bg-gray-50 transition uppercase tracking-wider"
              >
                {text.viewAll} — “{q.trim()}”
              </button>
            </>
          ) : (
            !loading && (
              <p className="text-sm text-gray-400 text-center py-6">
                {text.noProducts} — “{q.trim()}”
              </p>
            )
          )}
        </div>
      )}
    </div>
  );
}

/* --------------------------- mobile drawer --------------------------- */

function MobileMenu({
  open,
  onClose,
  settings,
  menus,
  text,
}: {
  open: boolean;
  onClose: () => void;
  settings: Settings;
  menus: Menu[];
  text: SiteText;
}) {
  const pathname = usePathname();
  const { count, setOpen: openCart } = useCart();

  useEffect(() => {
    onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return (
    <div
      className={`fixed inset-0 z-[95] overflow-hidden lg:hidden ${
        open ? "pointer-events-auto" : "pointer-events-none"
      }`}
    >
      <div
        className={`absolute inset-0 bg-black/50 backdrop-blur-[2px] transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
      />
      <aside
        className={`absolute left-0 top-0 h-full w-[310px] max-w-[86vw] bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-100">
          <Brand settings={settings} width={130} height={32} className="h-8 w-auto" textClassName="text-[19px]" />
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-gray-100 grid place-items-center" aria-label="Close menu">
            <X size={17} />
          </button>
        </div>

        {/* cart & account shortcuts */}
        <div className="grid grid-cols-2 gap-2.5 px-4 py-4">
          <button
            onClick={() => {
              onClose();
              openCart(true);
            }}
            className="grad-soft rounded-2xl px-3 py-3 flex items-center gap-2.5"
          >
            <span className="grad-bg text-white rounded-xl p-2 relative">
              <ShoppingCart size={16} />
              {count > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-black text-white text-[9px] font-extrabold w-4 h-4 rounded-full grid place-items-center">
                  {count}
                </span>
              )}
            </span>
            <span className="text-xs font-extrabold text-gray-800 text-left leading-tight">
              {text.navCart}
              <span className="block text-[10px] font-bold text-gray-400">
                {count} {text.itemsWord}
              </span>
            </span>
          </button>
          <Link href="/account" className="grad-soft rounded-2xl px-3 py-3 flex items-center gap-2.5">
            <span className="grad-bg text-white rounded-xl p-2">
              <User size={16} />
            </span>
            <span className="text-xs font-extrabold text-gray-800 text-left leading-tight">
              {text.myAccount}
              <span className="block text-[10px] font-bold text-gray-400">
                {text.login} / {text.myOrders}
              </span>
            </span>
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 pb-4">
          <p className="px-2 pb-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-gray-400">{text.navMenu}</p>
          <ul className="space-y-1">
            {menus.map((m) => {
              const active = pathname === m.href;
              return (
                <li key={m.id}>
                  <Link
                    href={m.href}
                    className={`flex items-center justify-between px-3.5 py-3 rounded-2xl text-sm font-bold transition ${
                      active ? "grad-bg text-white shadow-md" : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    {m.label}
                    <ChevronRight size={15} className={active ? "text-white" : "text-gray-300"} />
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="border-t border-gray-100 px-4 py-4">
          <a href={`tel:${settings.phone.replace(/\s/g, "")}`} className="flex items-center gap-2.5 text-sm font-bold text-gray-700">
            <span className="grad-bg text-white rounded-xl p-2">
              <Phone size={14} />
            </span>
            {text.hotline}: {settings.phone}
          </a>
        </div>
      </aside>
    </div>
  );
}

/* --------------------------- header --------------------------- */

export default function Header({
  settings,
  menus,
  text,
}: {
  settings: Settings;
  menus: Menu[];
  text: SiteText;
}) {
  const pathname = usePathname();
  const { count, setOpen } = useCart();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setSearchOpen(false);
  }, [pathname]);

  return (
    <>
    <header
      className={`sticky top-0 z-[60] bg-white/95 backdrop-blur-md transition-shadow ${
        scrolled ? "shadow-[0_6px_24px_rgba(17,18,28,0.08)]" : ""
      }`}
    >
      {/* primary bar */}
      <div className="max-w-7xl mx-auto px-4 lg:px-6">
        {/* mobile row */}
        <div className="flex lg:hidden items-center justify-between h-14">
          <button
            onClick={() => setMenuOpen(true)}
            className="w-10 h-10 grid place-items-center rounded-2xl hover:bg-gray-100 transition"
            aria-label="Open menu"
          >
            <MenuIcon size={21} />
          </button>
          <Link href="/" className="shrink-0">
            <Brand settings={settings} width={150} height={36} className="h-9 w-auto" textClassName="text-[21px]" priority />
          </Link>
          <button
            onClick={() => setSearchOpen((v) => !v)}
            className={`w-10 h-10 grid place-items-center rounded-2xl transition ${
              searchOpen ? "grad-bg text-white" : "hover:bg-gray-100"
            }`}
            aria-label="Toggle search"
          >
            {searchOpen ? <X size={19} /> : <Search size={19} />}
          </button>
        </div>

        {/* mobile search */}
        {searchOpen && (
          <div className="lg:hidden pb-3 animate-slide-down">
            <LiveSearch autoFocus onNavigate={() => setSearchOpen(false)} />
          </div>
        )}

        {/* desktop row */}
        <div className="hidden lg:flex items-center gap-8 h-[78px]">
          <Link href="/" className="shrink-0">
            <Brand settings={settings} width={196} height={48} className="h-12 w-auto" textClassName="text-[27px]" priority />
          </Link>
          <div className="flex-1 flex justify-center">
            <div className="w-full max-w-[560px]">
              <LiveSearch />
            </div>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={() => setOpen(true)}
              className="relative flex items-center gap-2.5 rounded-full border-[1.5px] border-gray-200 hover:border-[var(--g1)] pl-3.5 pr-4 py-2.5 transition group"
              aria-label="Open cart"
            >
              <span className="relative text-gray-700 group-hover:text-gray-900">
                <ShoppingCart size={19} />
                {count > 0 && (
                  <span className="absolute -top-2 -right-2 grad-bg text-white text-[9.5px] font-extrabold min-w-[17px] h-[17px] px-0.5 rounded-full grid place-items-center">
                    {count}
                  </span>
                )}
              </span>
              <span className="text-[13px] font-extrabold text-gray-700">{text.navCart}</span>
            </button>
            <Link
              href="/account"
              className="flex items-center gap-2.5 rounded-full grad-bg text-white px-4 py-2.5 hover:opacity-90 transition"
            >
              <User size={17} />
              <span className="text-[13px] font-extrabold">{text.navAccount}</span>
            </Link>
          </div>
        </div>
      </div>

      {/* secondary menu bar — desktop */}
      <nav className="hidden lg:block border-t border-gray-100 bg-white">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-center">
          {menus.map((m) => {
            const active = pathname === m.href;
            return (
              <Link
                key={m.id}
                href={m.href}
                className={`relative px-4 py-3.5 text-[13.5px] font-extrabold transition group ${
                  active ? "grad-text" : "text-gray-600 hover:text-gray-900"
                }`}
              >
                {m.label}
                <span
                  className={`absolute bottom-1.5 left-1/2 -translate-x-1/2 h-[3px] rounded-full grad-bg transition-all ${
                    active ? "w-7" : "w-0 group-hover:w-7"
                  }`}
                />
              </Link>
            );
          })}
        </div>
      </nav>

    </header>

    {/* NOTE: the drawer MUST live outside <header>. The header uses
        `backdrop-blur-md` (backdrop-filter), which makes it the containing
        block for position:fixed descendants — inside it, `fixed inset-0`
        collapses to the 56px header strip and the menu is invisible. */}
    <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} settings={settings} menus={menus} text={text} />
    </>
  );
}
