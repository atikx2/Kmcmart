import { NextRequest } from "next/server";
import sharp from "sharp";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { products } from "@/db/schema";
import { guardAdmin } from "@/lib/admin-api";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function compressData(src: string) {
  const match = /^data:[^;]+;base64,([\s\S]+)$/.exec(src);
  if (!match) throw new Error("Invalid local image");
  const bytes = await sharp(Buffer.from(match[1], "base64")).rotate().resize({ width: 1200, height: 1200, fit: "inside", withoutEnlargement: true }).webp({ quality: 78 }).toBuffer();
  return `data:image/webp;base64,${bytes.toString("base64")}`;
}

async function download(url: string) {
  const response = await fetch(url, { headers: { "User-Agent": "Kmcmart image migration" }, cache: "no-store" });
  if (!response.ok) throw new Error(`Image returned ${response.status}`);
  const type = response.headers.get("content-type")?.split(";")[0] || "image/jpeg";
  const original = Buffer.from(await response.arrayBuffer());
  if (!type.startsWith("image/") || original.length > 12_000_000) throw new Error("Image is invalid or too large");
  // Keep database payloads small: max 1200px edge, WebP quality 78.
  const bytes = await sharp(original).rotate().resize({ width: 1200, height: 1200, fit: "inside", withoutEnlargement: true }).webp({ quality: 78 }).toBuffer();
  return `data:image/webp;base64,${bytes.toString("base64")}`;
}

export async function GET(req: NextRequest) {
  const denied = await guardAdmin("products");
  if (denied) return denied;
  const rows = await db.select({ id: products.id, name: products.name, images: products.images }).from(products);
  const recompress = new URL(req.url).searchParams.get("mode") === "recompress";
  const pending = rows.filter((p) => p.images.some((src) => recompress ? src.startsWith("data:") : /^https?:\/\//i.test(src)));
  return Response.json({ total: rows.length, pending: pending.length, items: pending.map(({ id, name }) => ({ id, name })) });
}

export async function POST(req: NextRequest) {
  const denied = await guardAdmin("products");
  if (denied) return denied;
  const body = await req.json();
  const { id, mode } = body;
  const productId = Number(id);
  if (!Number.isInteger(productId) || productId < 1) return Response.json({ error: "Invalid product" }, { status: 400 });
  const [row] = await db.select({ images: products.images }).from(products).where(eq(products.id, productId)).limit(1);
  if (!row) return Response.json({ error: "Product not found" }, { status: 404 });
  const images: string[] = [];
  const failed: string[] = [];
  for (const src of row.images) {
    if (mode === "recompress" && src.startsWith("data:")) {
      try { images.push(await compressData(src)); } catch { failed.push(src); images.push(src); }
    } else if (!/^https?:\/\//i.test(src)) { images.push(src); }
    else {
      try { images.push(await download(src)); } catch { failed.push(src); images.push(src); }
    }
  }
  if (failed.length === row.images.filter((x) => /^https?:\/\//i.test(x)).length) return Response.json({ error: "Could not download any image", failed: failed.length }, { status: 502 });
  await db.update(products).set({ images }).where(eq(products.id, productId));
  return Response.json({ ok: true, id: productId, downloaded: images.length - failed.length, failed: failed.length });
}
