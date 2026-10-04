import { NextRequest } from "next/server";
import { guardAdmin } from "@/lib/admin-api";
import { db } from "@/db";
import { categories } from "@/db/schema";
import { asc } from "drizzle-orm";

export const dynamic = "force-dynamic";

const SOURCE = "http://kmcbazar.com";
const abs = (value: string) => value.startsWith("http") ? value : `${SOURCE}${value}`;
function decode(value: string) { return value.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">"); }
function text(html: string, key: string) {
  const re = new RegExp(`<meta[^>]+(?:property|name)=["']${key}["'][^>]+content=["']([^"']*)["']`, "i");
  return decode(re.exec(html)?.[1] || "");
}
function productsFrom(html: string) {
  const found = new Map<string, { name: string; slug: string; description: string; images: string[]; regularPrice: number; sellPrice: number | null }>();
  const linkRe = /href=["'](?:https?:\/\/kmcbazar\.com)?\/product\/([^"']+)["'][\s\S]{0,1800}?/gi;
  let match: RegExpExecArray | null;
  while ((match = linkRe.exec(html))) {
    const slug = match[1].split(/[?#"']/)[0];
    const chunk = match[0];
    const name = text(chunk, "og:title") || decode((/<h[1-4][^>]*>([^<]+)</i.exec(chunk)?.[1] || "").trim());
    const image = text(chunk, "og:image");
    const price = Number((/price["']?\s*[:=]\s*["']?([\d.]+)/i.exec(chunk)?.[1] || "").replace(/,/g, ""));
    if (slug && name && !found.has(slug)) found.set(slug, { name, slug, description: "", images: image ? [abs(image)] : [], regularPrice: price || 0, sellPrice: price || null });
  }
  return [...found.values()];
}

export async function GET(req: NextRequest) {
  const denied = await guardAdmin("products");
  if (denied) return denied;
  const mode = req.nextUrl.searchParams.get("mode") || "url";
  const value = req.nextUrl.searchParams.get("value")?.trim();
  try {
    const categoryRows = await db.select({ id: categories.id, name: categories.name }).from(categories).orderBy(asc(categories.name));
    if (mode === "categories") return Response.json({ categories: categoryRows });
    if (!value) return Response.json({ error: "Enter a product or category URL" }, { status: 400 });
    const url = new URL(value.startsWith("http") ? value : `${SOURCE}${value}`);
    if (url.hostname !== "kmcbazar.com" && url.hostname !== "www.kmcbazar.com") return Response.json({ error: "Only kmcbazar.com URLs are supported" }, { status: 400 });
    const response = await fetch(url.toString(), { headers: { "User-Agent": "Kmcmart product importer" }, cache: "no-store" });
    if (!response.ok) throw new Error(`Source returned ${response.status}`);
    const html = await response.text();
    const items = productsFrom(html);
    return Response.json({ source: url.toString(), items, categories: categoryRows, message: items.length ? "Products ready for review" : "No products found on this page" });
  } catch (e) { return Response.json({ error: e instanceof Error ? e.message : "Could not read source website" }, { status: 500 }); }
}

export async function POST(req: NextRequest) {
  const denied = await guardAdmin("products");
  if (denied) return denied;
  const body = await req.json();
  const items = Array.isArray(body.items) ? body.items : [];
  const results = [];
  for (const item of items) {
    const res = await fetch(new URL("/api/admin/products", req.url), { method: "POST", headers: { cookie: req.headers.get("cookie") || "", "content-type": "application/json" }, body: JSON.stringify(item) });
    results.push({ name: item.name, ok: res.ok, error: res.ok ? null : (await res.json()).error });
  }
  return Response.json({ results });
}
