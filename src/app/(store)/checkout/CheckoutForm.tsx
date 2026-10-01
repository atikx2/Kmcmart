"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ChevronDown,
  ClipboardList,
  Loader2,
  Lock,
  MapPin,
  Phone,
  ShoppingBag,
  Truck,
  User,
} from "lucide-react";
import { taka } from "@/lib/format";
import { useCart, type CartItem } from "@/components/site/Providers";

type Area = { id: number; name: string; charge: number };

type FieldProps = {
  label: string;
  icon: React.ComponentType<{ size?: number | string; className?: string }>;
  error?: string;
  children: React.ReactNode;
};

function Field({ label, icon: Icon, error, children }: FieldProps) {
  return (
    <label className="block">
      <span className="block text-[12.5px] font-extrabold text-gray-700 mb-1.5">{label}</span>
      <span className="relative block">
        <Icon size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none z-10" />
        {children}
      </span>
      {error && <span className="block mt-1.5 text-xs font-bold text-red-500">{error}</span>}
    </label>
  );
}

export default function CheckoutForm({
  areas,
  supportPhone,
}: {
  areas: Area[];
  supportPhone: string;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const buySlug = params.get("buy");
  const buyQty = Math.max(1, parseInt(params.get("qty") || "1", 10) || 1);

  const cart = useCart();
  const [mounted, setMounted] = useState(false);
  const [buyItem, setBuyItem] = useState<CartItem | null | "loading">(buySlug ? "loading" : null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [areaId, setAreaId] = useState<number | null>(areas[0]?.id ?? null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState("");

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!buySlug) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/products?slug=${encodeURIComponent(buySlug)}`);
        const data = await res.json();
        if (cancelled) return;
        if (data.item) {
          setBuyItem({
            id: data.item.id,
            slug: data.item.slug,
            name: data.item.name,
            image: data.item.image,
            price: data.item.sellPrice && data.item.sellPrice > 0 ? data.item.sellPrice : data.item.regularPrice,
            qty: buyQty,
          });
        } else {
          setBuyItem(null);
        }
      } catch {
        if (!cancelled) setBuyItem(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [buySlug, buyQty]);

  const items = useMemo<CartItem[]>(() => {
    if (buySlug) return buyItem && buyItem !== "loading" ? [buyItem] : [];
    return cart.items;
  }, [buySlug, buyItem, cart.items]);

  const subtotal = useMemo(() => items.reduce((a, i) => a + i.price * i.qty, 0), [items]);
  const area = areas.find((a) => a.id === areaId) ?? null;
  const total = subtotal + (area?.charge ?? 0);

  const ready = mounted && (!buySlug || buyItem !== "loading");
  const empty = ready && items.length === 0;

  const validate = () => {
    const e: Record<string, string> = {};
    if (name.trim().length < 3) e.name = "Please enter your full name";
    if (!/^01[3-9]\d{8}$/.test(phone.trim())) e.phone = "Enter a valid 11-digit mobile number (01XXXXXXXXX)";
    if (address.trim().length < 10) e.address = "Please write your full address with area & city";
    if (!areaId) e.area = "Please select a delivery area";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (ev?: React.FormEvent) => {
    ev?.preventDefault();
    if (submitting || items.length === 0) return;
    if (!validate()) return;
    setSubmitting(true);
    setServerError("");
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: name.trim(),
          phone: phone.trim(),
          address: address.trim(),
          deliveryAreaId: areaId,
          items: items.map((i) => ({ id: i.id, qty: i.qty })),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.code) throw new Error(data.error || "Order failed");
      if (!buySlug) cart.clearCart();
      router.replace(`/complete-order/${data.code}`);
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setSubmitting(false);
    }
  };

  if (!ready) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-10 grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 shimmer rounded-3xl h-[420px]" />
        <div className="lg:col-span-2 shimmer rounded-3xl h-[320px]" />
      </div>
    );
  }

  if (empty) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm px-6 py-12">
          <div className="mx-auto w-20 h-20 rounded-full grad-soft grid place-items-center mb-4">
            <ShoppingBag size={30} className="text-gray-400" />
          </div>
          <p className="font-extrabold text-gray-800">Nothing to checkout</p>
          <p className="text-sm text-gray-400 mt-1">Add some products to your cart first</p>
          <Link
            href="/"
            className="inline-block mt-6 grad-bg text-white text-sm font-extrabold px-7 py-3 rounded-full hover:opacity-90 transition"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-3 lg:px-6 py-6 md:py-10 pb-28 lg:pb-10">
      <h1 className="font-display text-[22px] md:text-3xl font-extrabold tracking-tight text-center">
        <span className="grad-text">Checkout</span>
      </h1>
      <p className="text-center text-[12px] md:text-sm text-gray-400 font-semibold mt-1.5 mb-7 md:mb-9">
        Fill up the form below — we will call to confirm your order
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 md:gap-6 items-start">
        {/* form */}
        <form id="checkout-form" onSubmit={submit} className="min-w-0 lg:col-span-3 bg-white rounded-3xl border border-gray-100 shadow-[0_8px_30px_rgba(17,18,28,0.05)] p-5 md:p-7">
          <h2 className="font-display font-extrabold text-base md:text-lg flex items-center gap-2.5 mb-5">
            <span className="grad-bg text-white rounded-xl p-2">
              <ClipboardList size={15} />
            </span>
            Shipping Information
          </h2>

          <div className="space-y-4">
            <Field label="Full Name" icon={User} error={errors.name}>
              <input
                className="field"
                placeholder="e.g. Rahim Uddin"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </Field>

            <Field label="Mobile Number" icon={Phone} error={errors.phone}>
              <input
                className="field"
                placeholder="01XXXXXXXXX"
                inputMode="numeric"
                maxLength={11}
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
              />
            </Field>

            <Field label="Delivery Area" icon={Truck} error={errors.area}>
              <select
                className="field appearance-none cursor-pointer pr-10"
                value={areaId ?? ""}
                onChange={(e) => setAreaId(Number(e.target.value))}
              >
                {areas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} — {taka(a.charge)}
                  </option>
                ))}
              </select>
              <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </Field>

            <Field label="Full Address" icon={MapPin} error={errors.address}>
              <textarea
                className="field min-h-[96px] resize-none"
                placeholder="House, Road, Area, City — e.g. House 12, Road 5, Dhanmondi, Dhaka"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </Field>
          </div>

          {serverError && (
            <p className="mt-4 text-sm font-bold text-red-500 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
              {serverError}
            </p>
          )}

          <div className="mt-5 flex items-center gap-2.5 text-[12px] text-gray-400 font-semibold bg-gray-50 rounded-xl px-4 py-3">
            <Lock size={13} className="shrink-0" />
            Payment: Cash on Delivery. Hotline {supportPhone}
          </div>
        </form>

        {/* summary */}
        <aside className="min-w-0 lg:col-span-2 bg-white rounded-3xl border border-gray-100 shadow-[0_8px_30px_rgba(17,18,28,0.05)] p-5 md:p-6 lg:sticky lg:top-24">
          <h2 className="font-display font-extrabold text-base md:text-lg flex items-center gap-2.5 mb-4">
            <span className="grad-bg text-white rounded-xl p-2">
              <ShoppingBag size={15} />
            </span>
            Order Summary
          </h2>

          <div className="max-h-[240px] overflow-y-auto no-scrollbar space-y-2.5 pr-1">
            {items.map((i) => (
              <div key={i.id} className="flex items-center gap-3 bg-gray-50 rounded-2xl p-2">
                <span className="relative w-12 h-12 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                  <Image src={i.image} alt={i.name} fill className="object-cover" sizes="48px" />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-[12px] font-bold text-gray-800 truncate">{i.name}</span>
                  <span className="block text-[11px] text-gray-400 font-semibold">
                    {taka(i.price)} × {i.qty}
                  </span>
                </span>
                <span className="text-[12.5px] font-extrabold text-gray-800 whitespace-nowrap">
                  {taka(i.price * i.qty)}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-4 space-y-2 text-[13px] font-semibold text-gray-500">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span className="text-gray-800">{taka(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>Delivery ({area?.name ?? "—"})</span>
              <span className="text-gray-800">{area ? taka(area.charge) : "—"}</span>
            </div>
            <div className="border-t border-dashed border-gray-200 pt-2.5 flex justify-between items-center">
              <span className="text-gray-800 font-extrabold">Total</span>
              <span className="grad-text font-display font-extrabold text-xl">{taka(total)}</span>
            </div>
          </div>

          {/* desktop CTA */}
          <button
            type="submit"
            form="checkout-form"
            disabled={submitting}
            className="hidden lg:flex mt-5 w-full grad-bg text-white rounded-2xl py-3.5 text-sm font-extrabold items-center justify-center gap-2 hover:opacity-90 active:scale-[0.99] transition disabled:opacity-70"
          >
            {submitting ? <Loader2 size={16} className="animate-spin" /> : <Lock size={15} />}
            {submitting ? "Placing Order…" : "Place Order"}
          </button>
        </aside>
      </div>

      {/* mobile sticky bar — summary sits above the button */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/97 backdrop-blur border-t border-gray-100 shadow-[0_-8px_30px_rgba(17,18,28,0.1)] px-4 py-3">
        <div className="flex items-center justify-between gap-3 text-[11px] font-bold text-gray-400 mb-1.5">
          <span className="min-w-0 truncate">
            {items.reduce((a, i) => a + i.qty, 0)} items • {area?.name ?? "Select area"}
          </span>
          <span className="shrink-0 whitespace-nowrap">
            Total payable: <span className="grad-text font-display font-extrabold text-base">{taka(total)}</span>
          </span>
        </div>
        <button
          type="submit"
          form="checkout-form"
          disabled={submitting}
          className="w-full grad-bg text-white rounded-2xl py-3 text-sm font-extrabold flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.99] transition disabled:opacity-70"
        >
          {submitting ? <Loader2 size={16} className="animate-spin" /> : <Lock size={15} />}
          {submitting ? "Placing Order…" : "Place Order"}
        </button>
      </div>
    </div>
  );
}
