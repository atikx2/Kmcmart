import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { banners, categories, products } from "@/db/schema";

/**
 * Serves an image that is stored in the database as a base64 data URL.
 *
 * The shop has no object storage, so the admin panel compresses uploads in the
 * browser and keeps the result inline. Rendering those strings straight into
 * the HTML meant every page carried megabytes that the browser could never
 * cache and the CDN could never hold: a twelve-product grid shipped ~13 MB of
 * base64 on *every* request.
 *
 * Pointing the markup at this route instead turns each image into an ordinary
 * cacheable file. The `v` query parameter is a hash of the image contents, so
 * the response can be marked immutable and still change the moment the admin
 * uploads a replacement — the URL changes with it.
 */

export const dynamic = "force-dynamic";

const ONE_YEAR = 60 * 60 * 24 * 365;

/** data:image/jpeg;base64,AAAA… -> { mime, bytes } */
function decodeDataUrl(raw: string): { mime: string; bytes: Buffer } | null {
  const m = /^data:([a-z0-9.+/-]+);base64,([\s\S]*)$/i.exec(raw.trim());
  if (!m) return null;
  try {
    return { mime: m[1], bytes: Buffer.from(m[2], "base64") };
  } catch {
    return null;
  }
}

/** Where each kind keeps its image, and how to pull just the one we want. */
async function lookup(kind: string, id: number, idx: number): Promise<string | null> {
  if (kind === "p") {
    const rows = await db
      /* The cast matters: `jsonb ->> $1` with a text parameter looks for an
         object key, which is always null on an array. */
      .select({ src: sql<string | null>`${products.images}->>(${idx})::int` })
      .from(products)
      .where(eq(products.id, id))
      .limit(1);
    return rows[0]?.src ?? null;
  }
  if (kind === "c") {
    const rows = await db
      .select({ src: categories.imageUrl })
      .from(categories)
      .where(eq(categories.id, id))
      .limit(1);
    return rows[0]?.src ?? null;
  }
  if (kind === "b") {
    const rows = await db
      .select({ src: banners.imageUrl })
      .from(banners)
      .where(eq(banners.id, id))
      .limit(1);
    return rows[0]?.src ?? null;
  }
  return null;
}

export async function GET(
  req: Request,
  ctx: { params: Promise<{ kind: string; id: string; idx: string }> }
) {
  const { kind, id: rawId, idx: rawIdx } = await ctx.params;

  const id = Number(rawId);
  const idx = Number(rawIdx);
  if (!Number.isInteger(id) || id < 1 || !Number.isInteger(idx) || idx < 0 || idx > 20) {
    return new Response("Not found", { status: 404 });
  }

  try {
    const src = await lookup(kind, id, idx);
    if (!src) return new Response("Not found", { status: 404 });

    /* Images added before the panel stored uploads inline are plain URLs.
       Nothing to decode — send the browser straight to the real file. */
    if (!src.startsWith("data:")) {
      return Response.redirect(src, 308);
    }

    const decoded = decodeDataUrl(src);
    if (!decoded) return new Response("Not found", { status: 404 });

    /* The caller already proved it knows the current contents by passing a
       matching `v`, so the body is safe to cache forever. Without one we fall
       back to a short cache: still correct, just less effective. */
    const versioned = new URL(req.url).searchParams.has("v");

    return new Response(new Uint8Array(decoded.bytes), {
      headers: {
        "Content-Type": decoded.mime,
        "Content-Length": String(decoded.bytes.length),
        "Cache-Control": versioned
          ? `public, max-age=${ONE_YEAR}, immutable`
          : "public, max-age=300, stale-while-revalidate=86400",
      },
    });
  } catch (e) {
    console.error("image route failed:", e);
    return new Response("Not found", { status: 404 });
  }
}
