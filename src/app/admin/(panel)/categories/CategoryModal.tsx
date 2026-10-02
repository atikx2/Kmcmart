"use client";

import { useState } from "react";
import {
  AlertTriangle,
  ArrowDownUp,
  Check,
  Eye,
  EyeOff,
  Home,
  Images,
  Link2,
  Loader2,
  Shapes,
  Tag,
  X,
} from "lucide-react";
import { slugify } from "@/lib/product-admin";
import type { AdminCategoryRow, CategoryFormValues } from "@/lib/category-admin";
import ImageUploader from "@/components/admin/ImageUploader";

type IconCmp = React.ComponentType<{ size?: number | string; className?: string; strokeWidth?: number }>;

function Field({
  icon: Icon,
  label,
  hint,
  error,
  children,
}: {
  icon: IconCmp;
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block min-w-0">
      <span className="block text-[11px] font-extrabold uppercase tracking-wider text-gray-500 mb-1.5">{label}</span>
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

function Toggle({
  icon: Icon,
  title,
  description,
  checked,
  onChange,
}: {
  icon: IconCmp;
  title: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`w-full flex items-center gap-3 rounded-2xl border-[1.5px] px-3.5 py-3 text-left transition ${
        checked
          ? "border-[color-mix(in_srgb,var(--g1)_45%,transparent)] bg-[color-mix(in_srgb,var(--g1)_7%,white)]"
          : "border-gray-200 bg-[#fbfbfe] hover:border-gray-300"
      }`}
    >
      <span
        className={`w-9 h-9 rounded-xl grid place-items-center shrink-0 transition ${
          checked ? "grad-bg text-white" : "bg-white text-gray-400 ring-1 ring-gray-200"
        }`}
      >
        <Icon size={15} strokeWidth={2.3} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[12.5px] font-extrabold text-gray-800">{title}</span>
        <span className="block text-[10.5px] font-semibold text-gray-400 mt-0.5">{description}</span>
      </span>
      <span className={`relative w-[42px] h-[24px] rounded-full shrink-0 transition ${checked ? "grad-bg" : "bg-gray-200"}`}>
        <span
          className={`absolute top-[3px] w-[18px] h-[18px] rounded-full bg-white shadow transition-all ${
            checked ? "left-[21px]" : "left-[3px]"
          }`}
        />
      </span>
    </button>
  );
}

export default function CategoryModal({
  mode,
  category,
  initial,
  onClose,
  onSaved,
}: {
  mode: "create" | "edit";
  category?: AdminCategoryRow;
  initial: CategoryFormValues;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const [v, setV] = useState<CategoryFormValues>(initial);
  const [slugTouched, setSlugTouched] = useState(mode === "edit");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState("");

  const set = <K extends keyof CategoryFormValues>(k: K, val: CategoryFormValues[K]) =>
    setV((p) => ({ ...p, [k]: val }));

  const setName = (name: string) =>
    setV((p) => ({ ...p, name, slug: slugTouched ? p.slug : slugify(name) }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    const err: Record<string, string> = {};
    if (v.name.trim().length < 2) err.name = "At least 2 characters";
    if (!v.slug.trim()) err.slug = "URL slug is required";
    setErrors(err);
    if (Object.keys(err).length) return;

    setSaving(true);
    setServerError("");
    try {
      const res = await fetch(
        mode === "create" ? "/api/admin/categories" : `/api/admin/categories/${category!.id}`,
        {
          method: mode === "create" ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: v.name.trim(),
            slug: v.slug.trim(),
            imageUrl: v.imageUrl.trim(),
            sortOrder: Math.max(0, Math.round(Number(v.sortOrder) || 0)),
            isActive: v.isActive,
            showOnHome: v.showOnHome,
          }),
        }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not save the category");
      onSaved(mode === "create" ? "Category created" : "Category updated");
    } catch (e) {
      setServerError(e instanceof Error ? e.message : "Could not save the category");
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[130] grid place-items-center px-4 py-6 overflow-y-auto">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[3px]" onClick={saving ? undefined : onClose} />

      <form
        onSubmit={submit}
        className="relative w-full max-w-[520px] bg-white rounded-3xl shadow-2xl animate-slide-down my-auto"
      >
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
          <span className="grad-bg text-white rounded-xl p-2 shrink-0">
            <Shapes size={15} strokeWidth={2.4} />
          </span>
          <h2 className="font-display font-extrabold text-base md:text-lg min-w-0 truncate">
            {mode === "create" ? "Add Category" : "Edit Category"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="ml-auto w-9 h-9 rounded-full bg-gray-100 grid place-items-center hover:bg-gray-200 transition disabled:opacity-50 shrink-0"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[66vh] overflow-y-auto">
          <div>
            <span className="block text-[11px] font-extrabold uppercase tracking-wider text-gray-500 mb-2">
              <span className="inline-flex items-center gap-1.5">
                <Images size={13} className="text-[var(--g2)]" />
                Category image
              </span>
            </span>
            <ImageUploader
              images={v.imageUrl ? [v.imageUrl] : []}
              onChange={(next) => set("imageUrl", next[0] ?? "")}
              max={1}
              columns="grid-cols-2 sm:grid-cols-3"
            />
          </div>

          <Field icon={Tag} label="Category name" error={errors.name}>
            <input
              value={v.name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Electronics"
              className="field font-bold"
            />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field icon={Link2} label="URL slug" hint="Used in /category/…" error={errors.slug}>
              <input
                value={v.slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  set("slug", e.target.value);
                }}
                onBlur={() => set("slug", slugify(v.slug))}
                placeholder="electronics"
                className="field font-semibold text-gray-600"
              />
            </Field>

            <Field icon={ArrowDownUp} label="Sort order" hint="Smaller shows first">
              <input
                type="number"
                min={0}
                value={v.sortOrder}
                onChange={(e) => set("sortOrder", e.target.value)}
                className="field font-bold"
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-2.5">
            <Toggle
              icon={v.isActive ? Eye : EyeOff}
              title="Visible in the store"
              description="Shows in the category slider and menus"
              checked={v.isActive}
              onChange={(b) => set("isActive", b)}
            />
            <Toggle
              icon={Home}
              title="Home page section visible"
              description="Adds a category-wise product section on the home page"
              checked={v.showOnHome}
              onChange={(b) => set("showOnHome", b)}
            />
          </div>

          {serverError && (
            <p className="flex items-center gap-2 text-[12px] font-bold text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-3.5 py-2.5">
              <AlertTriangle size={14} />
              {serverError}
            </p>
          )}
        </div>

        <div className="flex gap-2.5 px-5 py-4 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-2xl px-4 py-3 text-[12.5px] font-extrabold text-gray-500 bg-gray-100 hover:bg-gray-200 transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 grad-bg text-white rounded-2xl py-3 text-[13px] font-extrabold hover:opacity-90 transition disabled:opacity-70"
          >
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
            {saving ? "Saving…" : mode === "create" ? "Create Category" : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
