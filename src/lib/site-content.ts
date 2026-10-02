/**
 * Shared vocabulary for the three small storefront-content managers
 * (banners, header menus, delivery areas).
 * Client-safe: never import `@/db` here.
 */

export type AdminBanner = {
  id: number;
  imageUrl: string;
  alt: string;
  sortOrder: number;
  isActive: boolean;
};

export type AdminMenu = {
  id: number;
  label: string;
  href: string;
  sortOrder: number;
  isActive: boolean;
};

export type AdminArea = {
  id: number;
  name: string;
  charge: number;
  sortOrder: number;
  isActive: boolean;
};

export const BANNER_HINT =
  "মোবাইল/ডেস্কটপ দুইটাতেই ফুল ইমেজ দেখায় — 3:1 (1920×640) রাখলে কাটবে না";

export const HREF_HINT = "href must start with / — e.g. /, /category/electronics, /checkout";

const ABSOLUTE = /^[a-z][a-z0-9+.-]*:/i;

/** Internal links only: must start with a single "/" (or be exactly "/"). */
export function isValidHref(href: string): boolean {
  const v = href.trim();
  if (!v.startsWith("/")) return false;
  if (v.startsWith("//")) return false;
  /* catches a pasted "https://evil.com" that was prefixed with a slash */
  if (ABSOLUTE.test(v.slice(1))) return false;
  return !/\s/.test(v);
}

/** Adds the leading slash for bare paths, but never disguises an external URL. */
export function normalizeHref(href: string): string {
  const v = href.trim();
  if (!v) return "/";
  if (v.startsWith("//") || ABSOLUTE.test(v)) return v;
  return v.startsWith("/") ? v : `/${v}`;
}

/** 0 → "Free", otherwise the plain amount (the ৳ sign is added by the caller). */
export function chargeLabel(charge: number): string {
  return charge <= 0 ? "Free" : String(charge);
}
