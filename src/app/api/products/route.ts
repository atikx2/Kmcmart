import { NextRequest } from "next/server";
import { getProductBySlug, getProducts } from "@/lib/data";
import { toProductLite } from "@/lib/data";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;

  const slug = sp.get("slug");
  if (slug) {
    const p = await getProductBySlug(slug);
    if (!p) return Response.json({ item: null }, { status: 404 });
    return Response.json({ item: toProductLite(p) });
  }

  const category = sp.get("category") ?? "all";
  const offset = Math.max(0, parseInt(sp.get("offset") || "0", 10) || 0);
  const limit = Math.min(24, Math.max(1, parseInt(sp.get("limit") || "12", 10) || 12));
  const q = sp.get("q") ?? undefined;

  const result = await getProducts({ categorySlug: category, offset, limit, q });
  return Response.json(result);
}
