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

export const ORDERS_PAGE_SIZE = 12;

export type AdminOrderRow = {
  id: number;
  code: string;
  customerName: string;
  phone: string;
  itemsCount: number;
  total: number;
  deliveryAreaName: string;
  status: string;
  date: string;
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
  deliveryAreaName: string;
  deliveryCharge: number;
  subtotal: number;
  total: number;
  status: string;
  items: OrderItem[];
  placedAt: string;
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
