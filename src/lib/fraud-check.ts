/**
 * Phone reputation via fraudchecker.link — shared vocabulary.
 *
 * Client-safe: no database, no secrets. Client components import this;
 * server code imports "@/lib/admin-fraud", which re-exports all of it.
 */

export const FRAUD_PROVIDER = "fraudchecker" as const;
export const FRAUD_DEFAULT_BASE = "https://fraudchecker.link/api/v1/qc/";

/** Per-courier slice of a report. */
export type FraudCourier = { name: string; total: number; delivered: number; cancelled: number };

/** A report as the panel consumes it. */
export type FraudCheckReport = {
  phone: string;
  totalParcels: number;
  totalDelivered: number;
  totalCancelled: number;
  deliveryRate: number;
  riskStatus: string;
  couriers: FraudCourier[];
  checkedAt: string | null;
  error: string;
};

export type FraudTone = "emerald" | "amber" | "rose" | "slate";

/**
 * The provider sends a free-text risk label. Match on substance rather than
 * an exact string so a wording change on their side does not grey everything
 * out, and fall back to the delivery rate when the label is unfamiliar.
 */
export function fraudTone(report: { riskStatus: string; deliveryRate: number; totalParcels: number }): FraudTone {
  const s = report.riskStatus.toLowerCase();
  if (s.includes("high")) return "rose";
  if (s.includes("medium") || s.includes("moderate")) return "amber";
  if (s.includes("low")) return "emerald";
  if (report.totalParcels === 0) return "slate";
  if (report.deliveryRate >= 80) return "emerald";
  if (report.deliveryRate >= 50) return "amber";
  return "rose";
}

/** A number with no history is not a safe number — say so rather than showing 0%. */
export function fraudHeadline(report: { totalParcels: number; deliveryRate: number }): string {
  if (report.totalParcels === 0) return "No record";
  return `${formatRate(report.deliveryRate)}%`;
}

export function fraudRiskLabel(report: { riskStatus: string; totalParcels: number }): string {
  if (report.riskStatus) return report.riskStatus;
  return report.totalParcels === 0 ? "Unknown" : "Checked";
}

/** 88.89 -> "88.89", 90 -> "90". Trailing zeros are noise on a dashboard. */
export function formatRate(rate: number): string {
  if (!Number.isFinite(rate)) return "0";
  return String(Math.round(rate * 100) / 100);
}

export const FRAUD_TONE_CHIP: Record<FraudTone, string> = {
  emerald: "bg-emerald-50 text-emerald-600 ring-emerald-100",
  amber: "bg-amber-50 text-amber-600 ring-amber-100",
  rose: "bg-rose-50 text-rose-500 ring-rose-100",
  slate: "bg-gray-100 text-gray-500 ring-gray-200",
};

export const FRAUD_TONE_BAR: Record<FraudTone, string> = {
  emerald: "bg-emerald-500",
  amber: "bg-amber-500",
  rose: "bg-rose-500",
  slate: "bg-gray-300",
};

export const FRAUD_TONE_TEXT: Record<FraudTone, string> = {
  emerald: "text-emerald-600",
  amber: "text-amber-600",
  rose: "text-rose-500",
  slate: "text-gray-400",
};

/** What the browser may see of the configuration — never the raw key. */
export type FraudConfigPublic = {
  provider: string;
  baseUrl: string;
  apiKeyMask: string;
  hasKey: boolean;
  isActive: boolean;
  autoCheck: boolean;
  cacheHours: number;
  lastCheckedAt: string | null;
  lastError: string;
};

export function fraudBaseError(raw: string): string | null {
  const v = raw.trim();
  if (!v) return "Base URL is required";
  if (v.length > 200) return "Base URL is too long";
  let u: URL;
  try {
    u = new URL(v);
  } catch {
    return "Base URL must be a full address, e.g. https://fraudchecker.link/api/v1/qc/";
  }
  if (u.protocol === "https:") return null;
  const loopback = u.hostname === "127.0.0.1" || u.hostname === "localhost" || u.hostname === "[::1]";
  if (u.protocol === "http:" && loopback && process.env.NODE_ENV !== "production") return null;
  return "Base URL must start with https://";
}

export function isBdPhone(phone: string): boolean {
  return /^01[3-9]\d{8}$/.test(phone.trim());
}
