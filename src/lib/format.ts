export function taka(n: number): string {
  return `৳${n.toLocaleString("en-IN")}`;
}

export function effectivePrice(regular: number, sell: number | null | undefined): number {
  return sell && sell > 0 ? sell : regular;
}

export function discountPercent(regular: number, sell: number | null | undefined): number | null {
  if (!sell || sell <= 0 || sell >= regular) return null;
  return Math.round(((regular - sell) / regular) * 100);
}

export function padOrderCode(id: number): string {
  return String(id).padStart(6, "0");
}

/**
 * URL for an image that lives in the database as a base64 data URL.
 *
 * `version` is a short hash of the contents, which lets /api/img mark the
 * response immutable: the browser and the CDN keep it forever, and a replaced
 * image simply gets a different URL. Falls back to the placeholder when the
 * record has no image at all.
 */
export function dbImageUrl(
  kind: "p" | "c" | "b",
  id: number,
  index: number,
  version: string | null
): string {
  if (!version) return PLACEHOLDER_IMAGE;
  return `/api/img/${kind}/${id}/${index}?v=${version}`;
}

export const PLACEHOLDER_IMAGE = "/assets/logo-header.svg";

/**
 * Admin forms hold raw data URLs while editing. Anything already pointing at
 * /api/img (or any other URL) is left alone.
 */
export function isDataUrl(src: string): boolean {
  return src.startsWith("data:");
}
