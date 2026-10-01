import { unstable_cache } from "next/cache";
import { and, asc, desc, eq, ilike, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  banners,
  categories,
  deliveryAreas,
  menus,
  orders,
  products,
  settings,
  type Banner,
  type Category,
  type DeliveryArea,
  type Menu,
  type Order,
  type Product,
  type ProductLite,
  type Settings,
} from "@/db/schema";

/* ---------------- settings / layout data (cached) ---------------- */

export const getSettings = unstable_cache(
  async (): Promise<Settings> => {
    const rows = await db.select().from(settings).limit(1);
    return rows[0];
  },
  ["settings"],
  { revalidate: 60 }
);

export const getMenus = unstable_cache(
  async (): Promise<Menu[]> => {
    return db
      .select()
      .from(menus)
      .where(eq(menus.isActive, true))
      .orderBy(asc(menus.sortOrder), asc(menus.id));
  },
  ["menus"],
  { revalidate: 60 }
);

export const getBanners = unstable_cache(
  async (): Promise<Banner[]> => {
    return db
      .select()
      .from(banners)
      .where(eq(banners.isActive, true))
      .orderBy(asc(banners.sortOrder), asc(banners.id));
  },
  ["banners"],
  { revalidate: 60 }
);

export const getCategories = unstable_cache(
  async (): Promise<Category[]> => {
    return db
      .select()
      .from(categories)
      .where(eq(categories.isActive, true))
      .orderBy(asc(categories.sortOrder), asc(categories.id));
  },
  ["categories"],
  { revalidate: 60 }
);

export const getHomeCategories = unstable_cache(
  async (): Promise<Category[]> => {
    return db
      .select()
      .from(categories)
      .where(and(eq(categories.isActive, true), eq(categories.showOnHome, true)))
      .orderBy(asc(categories.sortOrder), asc(categories.id));
  },
  ["home-categories"],
  { revalidate: 60 }
);

export const getDeliveryAreas = unstable_cache(
  async (): Promise<DeliveryArea[]> => {
    return db
      .select()
      .from(deliveryAreas)
      .where(eq(deliveryAreas.isActive, true))
      .orderBy(asc(deliveryAreas.sortOrder), asc(deliveryAreas.id));
  },
  ["delivery-areas"],
  { revalidate: 60 }
);

/* ---------------- products ---------------- */

function toLite(p: Product): ProductLite {
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    image: (p.images && p.images[0]) || "/assets/logo-header.svg",
    regularPrice: p.regularPrice,
    sellPrice: p.sellPrice,
  };
}

export type ProductQuery = {
  categorySlug?: string; // "all" or undefined = all categories
  q?: string;
  offset?: number;
  limit?: number;
};

export async function getProducts({
  categorySlug,
  q,
  offset = 0,
  limit = 12,
}: ProductQuery): Promise<{ items: ProductLite[]; hasMore: boolean; total: number }> {
  const conds = [eq(products.isActive, true)];

  if (q && q.trim()) {
    conds.push(ilike(products.name, `%${q.trim()}%`));
  }

  if (categorySlug && categorySlug !== "all") {
    const cat = await db
      .select({ id: categories.id })
      .from(categories)
      .where(eq(categories.slug, categorySlug))
      .limit(1);
    if (!cat[0]) return { items: [], hasMore: false, total: 0 };
    conds.push(eq(products.categoryId, cat[0].id));
  }

  const where = and(...conds);

  const [rows, countRows] = await Promise.all([
    db
      .select()
      .from(products)
      .where(where)
      .orderBy(asc(products.id))
      .offset(offset)
      .limit(limit + 1),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(products)
      .where(where),
  ]);

  const hasMore = rows.length > limit;
  return {
    items: rows.slice(0, limit).map(toLite),
    hasMore,
    total: countRows[0]?.count ?? 0,
  };
}

export async function getProductBySlug(slug: string): Promise<(Product & { category?: Category }) | null> {
  const rows = await db
    .select()
    .from(products)
    .where(and(eq(products.slug, slug), eq(products.isActive, true)))
    .limit(1);
  const p = rows[0];
  if (!p) return null;
  const cat = await db.select().from(categories).where(eq(categories.id, p.categoryId)).limit(1);
  return { ...p, category: cat[0] };
}

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  const rows = await db.select().from(categories).where(eq(categories.slug, slug)).limit(1);
  return rows[0] ?? null;
}

export async function getRelatedProducts(categoryId: number, excludeId: number, limit = 6): Promise<ProductLite[]> {
  const rows = await db
    .select()
    .from(products)
    .where(and(eq(products.isActive, true), eq(products.categoryId, categoryId)))
    .orderBy(desc(products.id))
    .limit(limit + 1);
  return rows
    .filter((p) => p.id !== excludeId)
    .slice(0, limit)
    .map(toLite);
}

export async function searchProducts(q: string, limit = 8): Promise<ProductLite[]> {
  if (!q.trim()) return [];
  const rows = await db
    .select()
    .from(products)
    .where(and(eq(products.isActive, true), ilike(products.name, `%${q.trim()}%`)))
    .orderBy(asc(products.name))
    .limit(limit);
  return rows.map(toLite);
}

export async function getOrderByCode(code: string): Promise<Order | null> {
  const rows = await db.select().from(orders).where(eq(orders.code, code)).limit(1);
  return rows[0] ?? null;
}

export async function getOrdersForCustomer(customerId: number, phone: string): Promise<Order[]> {
  const rows = await db
    .select()
    .from(orders)
    .where(eq(orders.phone, phone))
    .orderBy(desc(orders.createdAt))
    .limit(20);
  const mine = rows.filter((o) => o.customerId === customerId || o.phone === phone);
  return mine;
}

export function toProductLite(p: Product): ProductLite {
  return toLite(p);
}
