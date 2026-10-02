/**
 * Pure order vocabulary + shared types.
 * Client-safe: this file must never import `@/db` (pg cannot be bundled for the browser).
 */
import type { OrderItem } from "@/db/schema";

/**
 * The four statuses the rest of the app reasons about. They are seeded into
 * `order_statuses` as `isSystem` rows and can never be deleted: reports count
 * revenue on `delivered`, the dashboard and fraud score key off `cancelled`,
 * and every new order starts at `pending`.
 */
export const ORDER_STATUSES = ["pending", "confirmed", "delivered", "cancelled"] as const;
export type SystemOrderStatus = (typeof ORDER_STATUSES)[number];

/** Any status key — system or admin-made. Kept as a string on purpose. */
export type OrderStatus = string;

export function isSystemOrderStatus(v: unknown): v is SystemOrderStatus {
  return typeof v === "string" && (ORDER_STATUSES as readonly string[]).includes(v);
}

/** @deprecated kept for older call sites — prefer `isSystemOrderStatus`. */
export const isOrderStatus = isSystemOrderStatus;

/** One row of the admin-managed status list. */
export type OrderStatusOption = {
  id: number;
  key: string;
  label: string;
  /** #RRGGBB */
  color: string;
  sortOrder: number;
  isSystem: boolean;
  isActive: boolean;
};

/** Shipped defaults — also the fallback when the table has not been created yet. */
export const DEFAULT_ORDER_STATUSES: OrderStatusOption[] = [
  { id: -1, key: "pending", label: "Pending", color: "#F59E0B", sortOrder: 1, isSystem: true, isActive: true },
  { id: -2, key: "confirmed", label: "On The Way", color: "#0EA5E9", sortOrder: 2, isSystem: true, isActive: true },
  { id: -3, key: "delivered", label: "Delivered", color: "#10B981", sortOrder: 3, isSystem: true, isActive: true },
  { id: -4, key: "cancelled", label: "Cancelled", color: "#F43F5E", sortOrder: 4, isSystem: true, isActive: true },
];

/** Hand-picked swatches for the colour picker — readable on white at 8% tint. */
export const STATUS_COLOR_PRESETS = [
  "#F59E0B",
  "#F97316",
  "#EF4444",
  "#F43F5E",
  "#EC4899",
  "#A855F7",
  "#6366F1",
  "#3B82F6",
  "#0EA5E9",
  "#06B6D4",
  "#14B8A6",
  "#10B981",
  "#84CC16",
  "#6B7280",
  "#334155",
] as const;

export const STATUS_LABEL_MIN = 2;
export const STATUS_LABEL_MAX = 24;

export const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

export function isHexColor(v: unknown): v is string {
  return typeof v === "string" && HEX_COLOR.test(v.trim());
}

export function normalizeHex(v: string, fallback = "#6B7280"): string {
  const s = v.trim();
  return HEX_COLOR.test(s) ? s.toUpperCase() : fallback;
}

/** Label → storage key. Lowercase, a-z0-9 and single underscores. */
export function slugifyStatusKey(label: string): string {
  return label
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 24);
}

/** "on_hold" → "On Hold" — only used when a key has no row any more. */
export function prettifyStatusKey(key: string): string {
  return key
    .split(/[_-]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function findStatus(list: OrderStatusOption[], key: string): OrderStatusOption | undefined {
  return list.find((s) => s.key === key);
}

export function statusLabel(list: OrderStatusOption[], key: string): string {
  return findStatus(list, key)?.label ?? prettifyStatusKey(key) ?? key;
}

export function statusColor(list: OrderStatusOption[], key: string): string {
  return findStatus(list, key)?.color ?? "#6B7280";
}

/** Soft tinted pill/select styling for any hex colour. */
export function statusTint(color: string): { color: string; backgroundColor: string; borderColor: string } {
  const c = normalizeHex(color);
  return { color: c, backgroundColor: `${c}14`, borderColor: `${c}33` };
}

/**
 * Options to show in a status <select>: every live status, plus the order's
 * current one so a hidden/removed status never silently disappears.
 */
export function selectableStatuses(list: OrderStatusOption[], current?: string): OrderStatusOption[] {
  const out = list.filter((s) => s.isActive);
  if (current && !out.some((s) => s.key === current)) {
    const found = findStatus(list, current);
    out.push(
      found ?? {
        id: 0,
        key: current,
        label: prettifyStatusKey(current),
        color: "#6B7280",
        sortOrder: 999,
        isSystem: false,
        isActive: false,
      }
    );
  }
  return out;
}

export const ORDERS_PAGE_SIZE = 20;
export const ORDERS_PAGE_SIZES = [20, 50, 100] as const;

/** Delivery-success score for a phone number (stand-in until a courier fraud API is wired). */
export type FraudScore = {
  /** 0-100 success rate, or null when the customer has no finished orders yet. */
  percent: number | null;
  delivered: number;
  cancelled: number;
  totalOrders: number;
  label: "Trusted" | "Average" | "Risky" | "New";
  tone: "emerald" | "amber" | "rose" | "slate";
};

export function fraudScore(delivered: number, cancelled: number, totalOrders: number): FraudScore {
  const finished = delivered + cancelled;
  if (finished === 0) {
    return { percent: null, delivered, cancelled, totalOrders, label: "New", tone: "slate" };
  }
  const percent = Math.round((delivered / finished) * 100);
  if (percent >= 80) return { percent, delivered, cancelled, totalOrders, label: "Trusted", tone: "emerald" };
  if (percent >= 50) return { percent, delivered, cancelled, totalOrders, label: "Average", tone: "amber" };
  return { percent, delivered, cancelled, totalOrders, label: "Risky", tone: "rose" };
}

export const FRAUD_BAR: Record<FraudScore["tone"], string> = {
  emerald: "bg-gradient-to-r from-emerald-500 to-green-400",
  amber: "bg-gradient-to-r from-amber-500 to-yellow-400",
  rose: "bg-gradient-to-r from-rose-500 to-red-400",
  slate: "bg-gray-300",
};

export const FRAUD_TEXT: Record<FraudScore["tone"], string> = {
  emerald: "text-emerald-600",
  amber: "text-amber-600",
  rose: "text-rose-600",
  slate: "text-gray-400",
};

export type AdminOrderItemPreview = { name: string; image: string; qty: number; price: number };

export type AdminOrderRow = {
  id: number;
  code: string;
  customerName: string;
  phone: string;
  address: string;
  customerIp: string | null;
  itemsCount: number;
  items: AdminOrderItemPreview[];
  subtotal: number;
  deliveryCharge: number;
  total: number;
  deliveryAreaName: string;
  status: string;
  date: string;
  fraud: FraudScore;
};

/** `all` plus one entry per status key that actually has orders. */
export type OrderCounts = Record<string, number> & { all: number };

export type AdminOrderList = {
  items: AdminOrderRow[];
  total: number;
  counts: OrderCounts;
  offset: number;
  limit: number;
  hasMore: boolean;
};

export type AdminOrderDetail = {
  id: number;
  code: string;
  customerName: string;
  phone: string;
  address: string;
  customerIp: string | null;
  deliveryAreaName: string;
  deliveryCharge: number;
  subtotal: number;
  total: number;
  status: string;
  items: OrderItem[];
  placedAt: string;
  fraud: FraudScore;
};

/** Fields the admin may edit on an order. */
export type OrderEditableFields = {
  customerName?: string;
  phone?: string;
  address?: string;
  deliveryAreaName?: string;
  deliveryCharge?: number;
  subtotal?: number;
  total?: number;
  status?: OrderStatus;
  items?: OrderItem[];
};

/* ---------------- date helpers (the store runs on Asia/Dhaka time) ---------------- */

const DATE_FMT = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Dhaka",
  day: "numeric",
  month: "short",
  year: "numeric",
});

const DATE_TIME_FMT = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Dhaka",
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export function formatOrderDate(d: Date): string {
  return DATE_FMT.format(d);
}

export function formatOrderDateTime(d: Date): string {
  return DATE_TIME_FMT.format(d);
}
