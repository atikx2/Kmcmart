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
