/**
 * Pure order vocabulary + shared types.
 * Client-safe: this file must never import `@/db` (pg cannot be bundled for the browser).
 */
import type { OrderItem } from "@/db/schema";

export const ORDER_STATUSES = ["pending", "confirmed", "delivered", "cancelled"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export function isOrderStatus(v: unknown): v is OrderStatus {
  return typeof v === "string" && (ORDER_STATUSES as readonly string[]).includes(v);
}

export const ORDER_STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  confirmed: "On The Way",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export const ORDER_STATUS_CHIP: Record<string, string> = {
  pending: "bg-amber-50 text-amber-600 border border-amber-100",
  confirmed: "bg-sky-50 text-sky-600 border border-sky-100",
  delivered: "bg-emerald-50 text-emerald-600 border border-emerald-100",
  cancelled: "bg-rose-50 text-rose-500 border border-rose-100",
};

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

export type OrderCounts = {
  all: number;
  pending: number;
  confirmed: number;
  delivered: number;
  cancelled: number;
};

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
