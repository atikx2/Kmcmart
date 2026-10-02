import { and, asc, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { categories, products } from "@/db/schema";
import { dbImageUrl } from "@/lib/format";
import {
  formatProductDate,
  PRODUCTS_PAGE_SIZE,
  type AdminCategoryOption,
  type AdminProductDetail,
  type AdminProductList,
  type AdminProductRow,
} from "@/lib/product-admin";

/* Re-exported so server files only need one import. Client components must
   import from "@/lib/product-admin" instead (this file pulls in `pg`). */
export * from "@/lib/product-admin";

function searchFilter(q?: string): SQL | undefined {
  const s = (q ?? "").trim();
  if (!s) return undefined;
  const like = `%${s}%`;
  return or(ilike(products.name, like), ilike(products.slug, like));
}

export async function getCategoryOptions(): Promise<AdminCategoryOption[]> {
  return db
    .select({ id: categories.id, name: categories.name })
    .from(categories)
    .orderBy(asc(categories.sortOrder), asc(categories.name));
}

export async function listAdminProducts(opts: {
  q?: string | null;
  categoryId?: number | null;
  stock?: string | null;
  offset?: number;
  limit?: number;
}): Promise<AdminProductList> {
  const search = searchFilter(opts.q ?? undefined);
  const offset = Math.max(0, opts.offset ?? 0);
  const limit = Math.min(100, Math.max(1, opts.limit ?? PRODUCTS_PAGE_SIZE));

  const stockFilter =
    opts.stock === "out"
      ? sql`${products.stock} <= 0`
      : opts.stock === "low"
        ? sql`${products.stock} > 0 and ${products.stock} <= 15`
        : opts.stock === "in"
          ? sql`${products.stock} > 15`
          : undefined;

  const where = and(
    opts.categoryId ? eq(products.categoryId, opts.categoryId) : undefined,
    stockFilter,
    search
  );

  const [rows, totalRows, cats] = await Promise.all([
    db
      .select({
        id: products.id,
        name: products.name,
        slug: products.slug,
        /* The list only shows a thumbnail. Pulling the `images` array itself
           meant every page of 25 carried the base64 originals — about 13 MB
           — so it asks for a content hash and a count instead and points the
           markup at /api/img. */
        imageVersion: sql<string | null>`substr(md5(${products.images}->>0), 1, 8)`,
        imagesCount: sql<number>`coalesce(jsonb_array_length(${products.images}), 0)::int`,
        categoryId: products.categoryId,
        categoryName: categories.name,
        regularPrice: products.regularPrice,
        sellPrice: products.sellPrice,
        costPrice: products.costPrice,
        stock: products.stock,
        freeDelivery: products.freeDelivery,
        isActive: products.isActive,
        createdAt: products.createdAt,
      })
      .from(products)
      .innerJoin(categories, eq(products.categoryId, categories.id))
      .where(where)
      .orderBy(desc(products.createdAt), desc(products.id))
      .offset(offset)
      .limit(limit),
    db.select({ n: sql<number>`count(*)::int` }).from(products).where(where),
    getCategoryOptions(),
  ]);

  const total = totalRows[0]?.n ?? 0;

  const items: AdminProductRow[] = rows.map((r) => ({
    id: r.id,
    name: r.name,
    slug: r.slug,
    image: r.imageVersion ? dbImageUrl("p", r.id, 0, r.imageVersion) : "",
    imagesCount: r.imagesCount,
    categoryId: r.categoryId,
    categoryName: r.categoryName,
    regularPrice: r.regularPrice,
    sellPrice: r.sellPrice,
    costPrice: r.costPrice,
    stock: r.stock,
    freeDelivery: r.freeDelivery,
    isActive: r.isActive,
    createdAt: formatProductDate(r.createdAt),
  }));

  return { items, total, categories: cats, offset, limit, hasMore: offset + rows.length < total };
}

export async function getAdminProductById(id: number): Promise<AdminProductDetail | null> {
  const rows = await db.select().from(products).where(eq(products.id, id)).limit(1);
  const p = rows[0];
  if (!p) return null;
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    categoryId: p.categoryId,
    description: p.description,
    images: p.images ?? [],
    regularPrice: p.regularPrice,
    sellPrice: p.sellPrice,
    costPrice: p.costPrice,
    stock: p.stock,
    freeDelivery: p.freeDelivery,
    isActive: p.isActive,
  };
}

/** True when another product already owns this slug. */
export async function slugTaken(slug: string, exceptId?: number): Promise<boolean> {
  const rows = await db
    .select({ id: products.id })
    .from(products)
    .where(eq(products.slug, slug))
    .limit(2);
  return rows.some((r) => r.id !== exceptId);
}
