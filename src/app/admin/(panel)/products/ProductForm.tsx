"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  BadgePercent,
  Boxes,
  Check,
  CircleDollarSign,
  Eye,
  EyeOff,
  Images,
  Link2,
  Loader2,
  Package,
  PiggyBank,
  Save,
  Shapes,
  Tag,
  TextQuote,
  Truck,
  Wallet,
} from "lucide-react";
import { taka } from "@/lib/format";
import {
  slugify,
  type AdminCategoryOption,
  type ProductFormValues,
} from "@/lib/product-admin";
import ImageUploader from "@/components/admin/ImageUploader";
import Toast, { useToast } from "@/components/admin/Toast";

type IconCmp = React.ComponentType<{ size?: number | string; className?: string; strokeWidth?: number }>;

function Section({
  icon: Icon,
  title,
  hint,
  children,
}: {
  icon: IconCmp;
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-white rounded-3xl border border-gray-100 shadow-[0_4px_18px_rgba(17,18,28,0.05)] overflow-hidden">
      <div className="flex items-center gap-3 px-4 md:px-6 py-4 border-b border-gray-100">
        <span className="grad-bg text-white rounded-xl p-2 shrink-0">
          <Icon size={15} strokeWidth={2.4} />
        </span>
        <div className="min-w-0">
          <h2 className="font-display font-extrabold text-[15px] md:text-base leading-tight">{title}</h2>
          {hint && <p className="text-[11.5px] font-semibold text-gray-400 mt-0.5">{hint}</p>}
        </div>
      </div>
      <div className="p-4 md:p-6">{children}</div>
    </section>
  );
}

function Field({
  icon: Icon,
  label,
  hint,
  error,
  children,
  className = "",
}: {
  icon: IconCmp;
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block min-w-0 ${className}`}>
      <span className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-gray-500 mb-1.5">
        {label}
      </span>
      <span className="relative block">
        <Icon
          size={16}
          strokeWidth={2.3}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--g2)] pointer-events-none z-[1]"
        />
        {children}
      </span>
      {error ? (
        <span className="mt-1.5 flex items-center gap-1.5 text-[11.5px] font-bold text-rose-600">
          <AlertTriangle size={12} />
          {error}
        </span>
      ) : (
        hint && <span className="mt-1.5 block text-[11px] font-semibold text-gray-400">{hint}</span>
      )}
    </label>
  );
}

function Switch({
  icon: Icon,
  title,
  description,
  checked,
  onChange,
  tone = "brand",
}: {
  icon: IconCmp;
  title: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  tone?: "brand" | "emerald";
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`w-full flex items-center gap-3 rounded-2xl border-[1.5px] px-4 py-3.5 text-left transition ${
        checked
          ? "border-[color-mix(in_srgb,var(--g1)_45%,transparent)] bg-[color-mix(in_srgb,var(--g1)_7%,white)]"
          : "border-gray-200 bg-[#fbfbfe] hover:border-gray-300"
      }`}
    >
      <span
        className={`w-10 h-10 rounded-xl grid place-items-center shrink-0 transition ${
          checked ? "grad-bg text-white" : "bg-white text-gray-400 ring-1 ring-gray-200"
        }`}
      >
        <Icon size={16} strokeWidth={2.3} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] font-extrabold text-gray-800">{title}</span>
        <span className="block text-[11px] font-semibold text-gray-400 mt-0.5">{description}</span>
      </span>
      <span
        className={`relative w-[46px] h-[26px] rounded-full shrink-0 transition ${
          checked ? (tone === "emerald" ? "bg-emerald-500" : "grad-bg") : "bg-gray-200"
        }`}
      >
        <span
          className={`absolute top-[3px] w-5 h-5 rounded-full bg-white shadow transition-all ${
            checked ? "left-[23px]" : "left-[3px]"
          }`}
        />
      </span>
    </button>
  );
}

export default function ProductForm({
  mode,
  productId,
  initial,
  categories,
}: {
  mode: "create" | "edit";
  productId?: number;
  initial: ProductFormValues;
  categories: AdminCategoryOption[];
}) {
  const router = useRouter();
  const [toast, showToast] = useToast();

  const [v, setV] = useState<ProductFormValues>(initial);
  const [slugTouched, setSlugTouched] = useState(mode === "edit");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = <K extends keyof ProductFormValues>(key: K, val: ProductFormValues[K]) =>
    setV((p) => ({ ...p, [key]: val }));

  const setName = (name: string) =>
    setV((p) => ({ ...p, name, slug: slugTouched ? p.slug : slugify(name) }));

  const regular = Math.max(0, Math.round(Number(v.regularPrice) || 0));
  const sell = v.sellPrice.trim() === "" ? null : Math.max(0, Math.round(Number(v.sellPrice) || 0));
  const cost = v.costPrice.trim() === "" ? null : Math.max(0, Math.round(Number(v.costPrice) || 0));
  const effective = sell && sell > 0 ? sell : regular;
  const discount = sell && sell > 0 && sell < regular ? Math.round(((regular - sell) / regular) * 100) : null;
  const profit = cost !== null && cost > 0 ? effective - cost : null;
  const margin = profit !== null && effective > 0 ? Math.round((profit / effective) * 100) : null;

  const validate = () => {
    const e: Record<string, string> = {};
    if (v.name.trim().length < 3) e.name = "At least 3 characters";
    if (!v.slug.trim()) e.slug = "URL slug is required";
    if (!v.categoryId) e.categoryId = "Choose a category";
    if (!regular) e.regularPrice = "Regular price is required";
    if (sell !== null && sell > regular) e.sellPrice = "Cannot be higher than the regular price";
    if (!v.stock.trim() || Number(v.stock) < 0) e.stock = "Stock cannot be negative";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    if (!validate()) {
      showToast("err", "Please fix the highlighted fields");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: v.name.trim(),
        slug: v.slug.trim(),
        categoryId: v.categoryId,
        description: v.description.trim(),
        images: v.images,
        regularPrice: regular,
        sellPrice: sell,
        costPrice: cost,
        stock: Math.max(0, Math.round(Number(v.stock) || 0)),
        freeDelivery: v.freeDelivery,
        isActive: v.isActive,
      };
      const res = await fetch(
        mode === "create" ? "/api/admin/products" : `/api/admin/products/${productId}`,
        {
          method: mode === "create" ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not save the product");
      showToast("ok", mode === "create" ? "Product created" : "Product updated");
      router.push("/admin/products");
      router.refresh();
    } catch (err) {
      showToast("err", err instanceof Error ? err.message : "Could not save the product");
      setSaving(false);
    }
  };

  const numField = "field !pl-11 font-bold";

  return (
    <form onSubmit={submit} className="space-y-4 pb-24">
      {/* header */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_4px_18px_rgba(17,18,28,0.05)] p-4 md:p-5 flex flex-wrap items-center gap-3">
        <Link
          href="/admin/products"
          className="w-10 h-10 rounded-2xl grid place-items-center border border-gray-200 text-gray-500 hover:border-[var(--g1)] hover:text-[var(--g2)] transition shrink-0"
          aria-label="Back to products"
        >
          <ArrowLeft size={17} />
        </Link>
        <div className="min-w-0">
          <h1 className="font-display font-extrabold text-xl md:text-2xl grad-text leading-none">
            {mode === "create" ? "Add Product" : "Edit Product"}
          </h1>
          <p className="mt-1.5 text-[11.5px] font-bold text-gray-400 truncate">
            {mode === "create" ? "Fill in the details and hit save" : v.name || "Update this product"}
          </p>
        </div>
        <span
          className={`ml-auto inline-flex items-center gap-1.5 text-[10.5px] font-extrabold uppercase tracking-wide px-3 py-1.5 rounded-full ${
            v.isActive ? "bg-emerald-50 text-emerald-600" : "bg-gray-100 text-gray-500"
          }`}
        >
          {v.isActive ? <Eye size={12} /> : <EyeOff size={12} />}
          {v.isActive ? "Visible on store" : "Hidden"}
        </span>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="min-w-0 xl:col-span-2 space-y-4">
          <Section icon={Images} title="Product Images" hint="Main photo first, gallery photos after it">
            <ImageUploader images={v.images} onChange={(next) => set("images", next)} />
          </Section>

          <Section icon={Package} title="Product Details" hint="Name, link and the category it belongs to">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field icon={Tag} label="Product name" error={errors.name} className="md:col-span-2">
                <input
                  value={v.name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Premium Cotton T-Shirt"
                  className="field font-bold"
                />
              </Field>

              <Field
                icon={Link2}
                label="URL slug"
                hint="Used in the product link"
                error={errors.slug}
                className="md:col-span-2"
              >
                <input
                  value={v.slug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    set("slug", e.target.value);
                  }}
                  onBlur={() => set("slug", slugify(v.slug))}
                  placeholder="premium-cotton-t-shirt"
                  className="field font-semibold text-gray-600"
                />
              </Field>

              <Field icon={Shapes} label="Category" error={errors.categoryId}>
                <select
                  value={v.categoryId ?? ""}
                  onChange={(e) => set("categoryId", e.target.value ? Number(e.target.value) : null)}
                  className="field font-bold appearance-none cursor-pointer"
                >
                  <option value="">Select a category…</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </Field>

              <Field icon={Boxes} label="Stock quantity" error={errors.stock}>
                <input
                  type="number"
                  min={0}
                  value={v.stock}
                  onChange={(e) => set("stock", e.target.value)}
                  placeholder="50"
                  className={numField}
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
              <Switch
                icon={Truck}
                title="Free delivery"
                description="No delivery charge for this product"
                checked={v.freeDelivery}
                onChange={(b) => set("freeDelivery", b)}
              />
              <Switch
                icon={v.isActive ? Eye : EyeOff}
                title="Visible on the store"
                description="Turn off to hide it from customers"
                checked={v.isActive}
                onChange={(b) => set("isActive", b)}
                tone="emerald"
              />
            </div>
          </Section>

          <Section icon={TextQuote} title="Description" hint="Shown on the product page">
            <textarea
              value={v.description}
              onChange={(e) => set("description", e.target.value)}
              rows={6}
              placeholder="Write what makes this product worth buying — material, size, warranty…"
              className="w-full rounded-2xl border-[1.5px] border-gray-200 bg-[#fbfbfe] px-4 py-3.5 text-[13.5px] font-semibold leading-relaxed outline-none focus:border-[var(--g1)] focus:bg-white transition resize-y"
            />
          </Section>
        </div>

        {/* pricing rail */}
        <div className="min-w-0 space-y-4">
          <Section icon={CircleDollarSign} title="Pricing" hint="Purchase price stays private">
            <div className="space-y-4">
              <Field icon={Wallet} label="Regular price" error={errors.regularPrice}>
                <input
                  type="number"
                  min={0}
                  value={v.regularPrice}
                  onChange={(e) => set("regularPrice", e.target.value)}
                  placeholder="1200"
                  className={numField}
                />
              </Field>

              <Field
                icon={BadgePercent}
                label="Sell price"
                hint="Leave empty to sell at the regular price"
                error={errors.sellPrice}
              >
                <input
                  type="number"
                  min={0}
                  value={v.sellPrice}
                  onChange={(e) => set("sellPrice", e.target.value)}
                  placeholder="999"
                  className={numField}
                />
              </Field>

              <Field icon={PiggyBank} label="Purchase price" hint="What it cost you — admin only">
                <input
                  type="number"
                  min={0}
                  value={v.costPrice}
                  onChange={(e) => set("costPrice", e.target.value)}
                  placeholder="700"
                  className={numField}
                />
              </Field>
            </div>

            <div className="mt-5 rounded-2xl grad-soft border border-[color-mix(in_srgb,var(--g1)_18%,transparent)] p-4 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11.5px] font-extrabold uppercase tracking-wider text-gray-500">
                  Customer pays
                </span>
                <span className="font-display font-extrabold text-[19px] grad-text leading-none">
                  {taka(effective)}
                </span>
              </div>
              {discount !== null && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11.5px] font-bold text-gray-500">Discount</span>
                  <span className="text-[12px] font-extrabold text-rose-500">−{discount}%</span>
                </div>
              )}
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11.5px] font-bold text-gray-500">Profit per sale</span>
                <span
                  className={`text-[12.5px] font-extrabold ${
                    profit === null ? "text-gray-400" : profit >= 0 ? "text-emerald-600" : "text-rose-600"
                  }`}
                >
                  {profit === null ? "Add purchase price" : `${taka(profit)}${margin !== null ? ` · ${margin}%` : ""}`}
                </span>
              </div>
            </div>
          </Section>

          <div className="hidden xl:block bg-white rounded-3xl border border-gray-100 shadow-[0_4px_18px_rgba(17,18,28,0.05)] p-5">
            <button
              type="submit"
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 grad-bg text-white rounded-2xl py-3.5 text-[13.5px] font-extrabold hover:opacity-90 transition disabled:opacity-70"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {saving ? "Saving…" : mode === "create" ? "Save Product" : "Save Changes"}
            </button>
            <Link
              href="/admin/products"
              className="mt-2.5 w-full flex items-center justify-center gap-2 rounded-2xl py-3 text-[12.5px] font-extrabold text-gray-500 hover:bg-gray-50 transition"
            >
              Cancel
            </Link>
          </div>
        </div>
      </div>

      {/* sticky save bar (mobile / tablet) */}
      <div className="xl:hidden fixed bottom-0 left-[64px] right-0 lg:left-0 z-[60] bg-white/95 backdrop-blur-md border-t border-gray-100 px-4 py-3 flex items-center gap-3">
        <Link
          href="/admin/products"
          className="shrink-0 rounded-2xl px-4 py-3 text-[12.5px] font-extrabold text-gray-500 bg-gray-100 hover:bg-gray-200 transition"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={saving}
          className="flex-1 min-w-0 flex items-center justify-center gap-2 grad-bg text-white rounded-2xl py-3 text-[13px] font-extrabold hover:opacity-90 transition disabled:opacity-70"
        >
          {saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
          {saving ? "Saving…" : mode === "create" ? "Save Product" : "Save Changes"}
        </button>
      </div>

      <Toast state={toast} />
    </form>
  );
}
