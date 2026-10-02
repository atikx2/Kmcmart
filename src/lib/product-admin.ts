/**
 * Pure product vocabulary + shared types for the admin panel.
 * Client-safe: this file must never import `@/db` (pg cannot be bundled for the browser).
 */

export const PRODUCTS_PAGE_SIZE = 20;
export const PRODUCTS_PAGE_SIZES = [20, 50, 100] as const;

export const MAX_PRODUCT_IMAGES = 8;

export type StockTone = "emerald" | "amber" | "rose" | "slate";

export type StockInfo = {
  label: string;
  tone: StockTone;
  /** 0-100, used for the little bar under the number. */
  percent: number;
};

/** Visual warning levels for the Stock column. */
export function stockInfo(stock: number): StockInfo {
  if (stock <= 0) return { label: "Out of stock", tone: "rose", percent: 0 };
  if (stock <= 5) return { label: "Critical", tone: "rose", percent: 12 };
  if (stock <= 15) return { label: "Low stock", tone: "amber", percent: 38 };
  if (stock <= 40) return { label: "In stock", tone: "emerald", percent: 70 };
  return { label: "Healthy", tone: "emerald", percent: 100 };
}

export const STOCK_CHIP: Record<StockTone, string> = {
  emerald: "bg-emerald-50 text-emerald-600 ring-emerald-100",
  amber: "bg-amber-50 text-amber-600 ring-amber-100",
  rose: "bg-rose-50 text-rose-600 ring-rose-100",
  slate: "bg-slate-100 text-slate-500 ring-slate-200",
};

export const STOCK_BAR: Record<StockTone, string> = {
  emerald: "bg-gradient-to-r from-emerald-400 to-green-500",
  amber: "bg-gradient-to-r from-amber-400 to-orange-500",
  rose: "bg-gradient-to-r from-rose-500 to-red-500",
  slate: "bg-slate-300",
};

export const STOCK_TEXT: Record<StockTone, string> = {
  emerald: "text-emerald-600",
  amber: "text-amber-600",
  rose: "text-rose-600",
  slate: "text-slate-500",
};

export type AdminCategoryOption = {
  id: number;
  name: string;
};

export type AdminProductRow = {
  id: number;
  name: string;
  slug: string;
  image: string;
  imagesCount: number;
  categoryId: number;
  categoryName: string;
  regularPrice: number;
  sellPrice: number | null;
  costPrice: number | null;
  stock: number;
  freeDelivery: boolean;
  isActive: boolean;
  createdAt: string;
};

export type AdminProductList = {
  items: AdminProductRow[];
  total: number;
  categories: AdminCategoryOption[];
  offset: number;
  limit: number;
  hasMore: boolean;
};

export type AdminProductDetail = {
  id: number;
  name: string;
  slug: string;
  categoryId: number;
  description: string;
  images: string[];
  regularPrice: number;
  sellPrice: number | null;
  costPrice: number | null;
  stock: number;
  freeDelivery: boolean;
  isActive: boolean;
};

/** Values the create/edit form posts. */
export type ProductFormValues = {
  name: string;
  slug: string;
  categoryId: number | null;
  description: string;
  images: string[];
  regularPrice: string;
  sellPrice: string;
  costPrice: string;
  stock: string;
  freeDelivery: boolean;
  isActive: boolean;
};

export function emptyProductForm(): ProductFormValues {
  return {
    name: "",
    slug: "",
    categoryId: null,
    description: "",
    images: [],
    regularPrice: "",
    sellPrice: "",
    costPrice: "",
    stock: "50",
    freeDelivery: false,
    isActive: true,
  };
}

/** Keep only non-empty strings, trimmed, capped at MAX_PRODUCT_IMAGES. */
export function cleanImages(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((s): s is string => typeof s === "string")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, MAX_PRODUCT_IMAGES);
}

/** "Premium Cotton Tee!" → "premium-cotton-tee" */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

export function profitOf(sell: number, cost: number | null): number | null {
  if (cost === null || cost <= 0) return null;
  return sell - cost;
}

const DATE_FMT = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Asia/Dhaka",
});

export function formatProductDate(d: Date | string): string {
  return DATE_FMT.format(typeof d === "string" ? new Date(d) : d);
}
