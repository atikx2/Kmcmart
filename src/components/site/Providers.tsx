"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import Image from "next/image";
import { Minus, Plus, ShoppingBag, Trash2, X, ArrowRight } from "lucide-react";
import type { ProductLite } from "@/db/schema";
import { effectivePrice, taka } from "@/lib/format";

export type CartItem = {
  id: number;
  slug: string;
  name: string;
  image: string;
  price: number;
  qty: number;
};

type CartContextType = {
  items: CartItem[];
  count: number;
  subtotal: number;
  addItem: (p: ProductLite, qty?: number) => void;
  setQty: (id: number, qty: number) => void;
  removeItem: (id: number) => void;
  clearCart: () => void;
  open: boolean;
  setOpen: (v: boolean) => void;
};

const CartContext = createContext<CartContextType | null>(null);

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside Providers");
  return ctx;
}

const STORAGE_KEY = "kmc_cart_v1";

export default function Providers({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [open, setOpen] = useState(false);
  const loaded = useRef(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {
      /* ignore */
    }
    loaded.current = true;
  }, []);

  useEffect(() => {
    if (!loaded.current) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const addItem = useCallback((p: ProductLite, qty = 1) => {
    const price = effectivePrice(p.regularPrice, p.sellPrice);
    setItems((prev) => {
      const found = prev.find((i) => i.id === p.id);
      if (found) {
        return prev.map((i) => (i.id === p.id ? { ...i, qty: Math.min(i.qty + qty, 99) } : i));
      }
      return [...prev, { id: p.id, slug: p.slug, name: p.name, image: p.image, price, qty }];
    });
    setOpen(true);
  }, []);

  const setQty = useCallback((id: number, qty: number) => {
    setItems((prev) =>
      qty <= 0 ? prev.filter((i) => i.id !== id) : prev.map((i) => (i.id === id ? { ...i, qty: Math.min(qty, 99) } : i))
    );
  }, []);

  const removeItem = useCallback((id: number) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const { count, subtotal } = useMemo(() => {
    return {
      count: items.reduce((a, i) => a + i.qty, 0),
      subtotal: items.reduce((a, i) => a + i.qty * i.price, 0),
    };
  }, [items]);

  const value = useMemo(
    () => ({ items, count, subtotal, addItem, setQty, removeItem, clearCart, open, setOpen }),
    [items, count, subtotal, addItem, setQty, removeItem, clearCart, open]
  );

  return (
    <CartContext.Provider value={value}>
      {children}
      {/* cart drawer */}
      <div
        className={`fixed inset-0 z-[90] overflow-hidden transition ${open ? "pointer-events-auto" : "pointer-events-none"}`}
        aria-hidden={!open}
      >
        <div
          className={`absolute inset-0 bg-black/50 backdrop-blur-[2px] transition-opacity duration-300 ${
            open ? "opacity-100" : "opacity-0"
          }`}
          onClick={() => setOpen(false)}
        />
        <aside
          className={`absolute right-0 top-0 h-full w-[410px] max-w-[94vw] bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-out ${
            open ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h3 className="font-display font-extrabold text-lg flex items-center gap-2">
              <span className="grad-bg rounded-xl p-2 text-white">
                <ShoppingBag size={17} />
              </span>
              Shopping Cart
              <span className="text-sm font-bold text-gray-400">({count})</span>
            </h3>
            <button
              onClick={() => setOpen(false)}
              className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 grid place-items-center transition"
              aria-label="Close cart"
            >
              <X size={17} />
            </button>
          </div>

          {items.length === 0 ? (
            <div className="flex-1 grid place-items-center px-6">
              <div className="text-center">
                <div className="mx-auto w-20 h-20 rounded-full grad-soft grid place-items-center mb-4">
                  <ShoppingBag size={30} className="text-gray-400" />
                </div>
                <p className="font-bold text-gray-700">Your cart is empty</p>
                <p className="text-sm text-gray-400 mt-1">Add some products to get started</p>
                <button
                  onClick={() => setOpen(false)}
                  className="mt-5 grad-bg text-white text-sm font-bold px-6 py-2.5 rounded-full hover:opacity-90 transition"
                >
                  Continue Shopping
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="flex gap-3 items-center bg-gray-50/70 hover:bg-gray-50 border border-gray-100 rounded-2xl p-2.5"
                  >
                    <Link
                      href={`/product/${item.slug}`}
                      onClick={() => setOpen(false)}
                      className="relative w-16 h-16 rounded-xl overflow-hidden bg-gray-100 shrink-0"
                    >
                      <Image src={item.image} alt={item.name} fill className="object-cover" sizes="64px" />
                    </Link>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-bold text-gray-800 truncate">{item.name}</p>
                      <p className="grad-text font-extrabold text-sm mt-0.5">{taka(item.price)}</p>
                      <div className="flex items-center justify-between mt-1.5">
                        <div className="inline-flex items-center border border-gray-200 rounded-full bg-white">
                          <button
                            className="w-7 h-7 grid place-items-center text-gray-500 hover:text-gray-900"
                            onClick={() => setQty(item.id, item.qty - 1)}
                            aria-label="Decrease"
                          >
                            <Minus size={13} />
                          </button>
                          <span className="w-6 text-center text-xs font-extrabold">{item.qty}</span>
                          <button
                            className="w-7 h-7 grid place-items-center text-gray-500 hover:text-gray-900"
                            onClick={() => setQty(item.id, item.qty + 1)}
                            aria-label="Increase"
                          >
                            <Plus size={13} />
                          </button>
                        </div>
                        <button
                          onClick={() => removeItem(item.id)}
                          className="w-7 h-7 grid place-items-center text-gray-300 hover:text-red-500 transition"
                          aria-label="Remove item"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-gray-100 px-5 py-4 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500 font-semibold">Subtotal</span>
                  <span className="font-display font-extrabold text-lg">{taka(subtotal)}</span>
                </div>
                <Link
                  href="/checkout"
                  onClick={() => setOpen(false)}
                  className="grad-bg w-full rounded-2xl py-3.5 text-white font-extrabold text-sm flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.99] transition"
                >
                  Proceed to Checkout <ArrowRight size={16} />
                </Link>
              </div>
            </>
          )}
        </aside>
      </div>
    </CartContext.Provider>
  );
}
