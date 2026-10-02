/**
 * Courier vocabulary shared by the server and the browser.
 * Client-safe: never import `@/db` or `node:crypto` here.
 *
 * Provider today: Steadfast / Packzy — https://portal.packzy.com/api/v1
 */

export const COURIER_PROVIDER = "steadfast" as const;

/** Display name per provider key — used on shipping labels. */
export const COURIER_PROVIDER_LABEL: Record<string, string> = {
  steadfast: "Steadfast",
};
export const COURIER_DEFAULT_BASE = "https://portal.packzy.com/api/v1";

/** Steadfast books at most 500 per bulk call; we stay well under it per click. */
export const COURIER_BULK_MAX = 200;

/* ------------------------------------------------------------------ */
/* delivery statuses                                                    */
/* ------------------------------------------------------------------ */

export type CourierTone = "slate" | "sky" | "amber" | "emerald" | "rose";

type StatusMeta = { label: string; tone: CourierTone; final: boolean };

/** Everything `delivery_status` can be, including the return sub-states. */
export const COURIER_STATUS: Record<string, StatusMeta> = {
  /* in flight */
  in_review: { label: "In review", tone: "slate", final: false },
  pending: { label: "With courier", tone: "sky", final: false },
  hold: { label: "On hold", tone: "amber", final: false },
  delivered_approval_pending: { label: "Delivered (unconfirmed)", tone: "amber", final: false },
  partial_delivered_approval_pending: { label: "Partly delivered (unconfirmed)", tone: "amber", final: false },
  cancelled_approval_pending: { label: "Cancelled (unconfirmed)", tone: "amber", final: false },
  unknown_approval_pending: { label: "Awaiting confirmation", tone: "amber", final: false },
  /* settled */
  delivered: { label: "Delivered", tone: "emerald", final: true },
  partial_delivered: { label: "Partly delivered", tone: "emerald", final: true },
  cancelled: { label: "Cancelled", tone: "rose", final: true },
  exceptional: { label: "Exceptional — contact support", tone: "rose", final: true },
  unknown: { label: "Unknown", tone: "slate", final: false },
  /* coming back */
  partial_delivered_return_proccessing: { label: "Return being prepared", tone: "amber", final: false },
  partial_delivered_return_rider_assigned: { label: "Return on the way to you", tone: "amber", final: false },
  partial_delivered_return_received: { label: "Return received", tone: "rose", final: true },
  cancelled_return_proccessing: { label: "Return being prepared", tone: "amber", final: false },
  cancelled_return_rider_assigned: { label: "Return on the way to you", tone: "amber", final: false },
  cancelled_return_received: { label: "Return received", tone: "rose", final: true },
};

/**
 * Statuses the courier reports that are only the rider's word. The docs are
 * explicit: do not settle books on them.
 */
export const COURIER_UNCONFIRMED = new Set([
  "delivered_approval_pending",
  "partial_delivered_approval_pending",
  "cancelled_approval_pending",
  "unknown_approval_pending",
]);

export function courierStatusLabel(key: string | null | undefined): string {
  if (!key) return "Not sent";
  return COURIER_STATUS[key]?.label ?? key.replace(/_/g, " ");
}

export function courierStatusTone(key: string | null | undefined): CourierTone {
  if (!key) return "slate";
  return COURIER_STATUS[key]?.tone ?? "slate";
}

export const COURIER_TONE_CHIP: Record<CourierTone, string> = {
  slate: "bg-gray-100 text-gray-500 ring-gray-200",
  sky: "bg-sky-50 text-sky-600 ring-sky-100",
  amber: "bg-amber-50 text-amber-600 ring-amber-100",
  emerald: "bg-emerald-50 text-emerald-600 ring-emerald-100",
  rose: "bg-rose-50 text-rose-500 ring-rose-100",
};

/**
 * Which of our own order statuses a settled courier status maps to.
 * Only confirmed outcomes map — "approval pending" ones deliberately do not.
 */
export const COURIER_TO_ORDER_STATUS: Record<string, string> = {
  delivered: "delivered",
  partial_delivered: "delivered",
  cancelled: "cancelled",
  cancelled_return_proccessing: "cancelled",
  cancelled_return_rider_assigned: "cancelled",
  cancelled_return_received: "cancelled",
  partial_delivered_return_proccessing: "delivered",
  partial_delivered_return_rider_assigned: "delivered",
  partial_delivered_return_received: "delivered",
};

/* ------------------------------------------------------------------ */
/* config shapes                                                        */
/* ------------------------------------------------------------------ */

/** What the browser is allowed to see — never the raw keys. */
export type CourierConfigPublic = {
  provider: string;
  baseUrl: string;
  /** e.g. "abcd••••••wxyz", or "" when nothing is saved. */
  apiKeyMask: string;
  secretKeyMask: string;
  hasKeys: boolean;
  isActive: boolean;
  sentStatusKey: string;
  lastBalance: number | null;
  lastCheckedAt: string | null;
  lastError: string;
  /** Scheduled delivery-status sync. */
  autoSync: boolean;
  lastSyncAt: string | null;
  lastSyncCount: number | null;
  lastSyncError: string;
};

/** What one sync pass did, for the panel and the cron log. */
export type CourierSyncSummary = {
  checked: number;
  statusChanged: number;
  ordersMoved: number;
  failed: number;
  remaining: number;
  skipped?: string;
};

export function maskKey(value: string): string {
  const v = value.trim();
  if (!v) return "";
  if (v.length <= 8) return `${v.slice(0, 2)}••••`;
  return `${v.slice(0, 4)}••••••${v.slice(-4)}`;
}

/**
 * Base URL rules. https everywhere; plain http only against loopback so the
 * integration can be exercised against a local stub during development.
 */
export function courierBaseError(raw: string): string | null {
  const v = raw.trim();
  if (!v) return "Base URL is required";
  if (v.length > 200) return "Base URL is too long";
  let u: URL;
  try {
    u = new URL(v);
  } catch {
    return "Base URL must be a full address, e.g. https://portal.packzy.com/api/v1";
  }
  if (u.protocol === "https:") return null;
  const loopback = u.hostname === "127.0.0.1" || u.hostname === "localhost" || u.hostname === "[::1]";
  if (u.protocol === "http:" && loopback && process.env.NODE_ENV !== "production") return null;
  return "Base URL must start with https://";
}

/** Trailing slashes make `${base}/ping` turn into a double slash. */
export function normalizeBase(raw: string): string {
  return raw.trim().replace(/\/+$/, "");
}

/* ------------------------------------------------------------------ */
/* order payload                                                        */
/* ------------------------------------------------------------------ */

/** Steadfast truncates silently; we do it up front so what we store matches. */
export const COURIER_LIMITS = {
  invoice: 100,
  recipientName: 100,
  recipientPhone: 40,
  recipientAddress: 490,
  note: 480,
  itemDescription: 255,
} as const;

/** They replace each of { } ; < > $ with a space before storing. */
export function courierSafeText(value: string, max: number): string {
  return value
    .replace(/[{};<>$]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

/** Their invoice rule: letters, digits, hyphen and underscore only. */
export function courierInvoice(code: string): string {
  return code.replace(/[^A-Za-z0-9_-]/g, "-").slice(0, COURIER_LIMITS.invoice);
}

export function isBdPhone(phone: string): boolean {
  return /^01[3-9]\d{8}$/.test(phone.trim());
}

/* ------------------------------------------------------------------ */
/* results                                                              */
/* ------------------------------------------------------------------ */

export type CourierSendResult = {
  orderId: number;
  code: string;
  ok: boolean;
  consignmentId?: string;
  trackingCode?: string;
  trackingLink?: string;
  error?: string;
};

/** Steadfast's phone history check — read the ratios, not a single score. */
export type CourierFraudReport = {
  phone: string;
  deliveryRatio: number | null;
  cancellationRatio: number | null;
  volumeBand: "none" | "low" | "medium" | "high" | "very_high" | null;
  totalReports: number;
  fraudCategories: { code: string; count: number }[];
  doubtfulReports: boolean;
};

export const VOLUME_BAND_LABEL: Record<string, string> = {
  none: "No finished parcels",
  low: "1–5 parcels",
  medium: "6–20 parcels",
  high: "21–200 parcels",
  very_high: "200+ parcels",
};

export const FRAUD_CATEGORY_LABEL: Record<string, string> = {
  no_response: "Did not answer",
  refused: "Refused the parcel",
  wrong_address: "Wrong address",
  fake_order: "Fake order",
  abusive: "Abusive",
};

export function fraudCategoryLabel(code: string): string {
  return FRAUD_CATEGORY_LABEL[code] ?? code.replace(/_/g, " ");
}
