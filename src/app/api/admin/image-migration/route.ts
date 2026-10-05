import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { products } from "@/db/schema";
import { guardAdmin } from "@/lib/admin-api";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function download(url: string) {
  const response = await fetch(url, { headers: { "User-Agent": "Kmcmart image migration" }, cache: "no-store" });
  if (!response.ok) throw new Error(`Image returned ${response.status}`);
  const type = response.headers.get("content-type")?.split(";")[0] || "image/jpeg";
  const bytes = Buffer.from(await response.arrayBuffer());
  if (!type.startsWith("image/") || bytes.length > 4_500_000) throw new Error("Image is invalid or too large");
  return `data:${type};base64,${bytes.toString("base64")}`;
}

export async function GET() {
  const denied = await guardAdmin("products");
  if (denied) return denied;
  const rows = await db.select({ id: products.id, name: products.name, images: products.images }).from(products);
  const pending = rows.filter((p) => p.images.some((src) => /^https?:\/\//i.test(src)));
  return Response.json({ total: rows.length, pending: pending.length, items: pending.map(({ id, name }) => ({ id, name })) });
}

export async function POST(req: NextRequest) {
  const denied = await guardAdmin("products");
  if (denied) return denied;
  const { id } = await req.json();
  const productId = Number(id);
  if (!Number.isInteger(productId) || productId < 1) return Response.json({ error: "Invalid product" }, { status: 400 });
  const [row] = await db.select({ images: products.images }).from(products).where(eq(products.id, productId)).limit(1);
  if (!row) return Response.json({ error: "Product not found" }, { status: 404 });
  const images: string[] = [];
  const failed: string[] = [];
  for (const src of row.images) {
    if (!/^https?:\/\//i.test(src)) { images.push(src); continue; }
    try { images.push(await download(src)); } catch { failed.push(src); }
  }
  if (failed.length === row.images.filter((x) => /^https?:\/\//i.test(x)).length) return Response.json({ error: "Could not download any image", failed: failed.length }, { status: 502 });
  await db.update(products).set({ images }).where(eq(products.id, productId));
  return Response.json({ ok: true, id: productId, downloaded: images.length - failed.length, failed: failed.length });
}
