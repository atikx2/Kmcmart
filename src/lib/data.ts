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
import { isLang, mergeLegacyText, resolveText, type SiteText } from "@/lib/i18n";
import { dbImageUrl } from "@/lib/format";

/* ---------------- settings / layout data (cached) ---------------- */

/**
 * Every page on the site reads this, so it must never be the thing that
 * takes the site down. A settings table that is empty, or one missing a
 * column because a migration has not been run yet, now falls back to the
 * shipped defaults and logs instead of throwing a 500 on the storefront.
 */
const DEFAULT_SETTINGS: Settings = {
  id: 1,
  siteName: "KmcBazar",
  logoHeader: "/assets/logo-header.svg",
  logoFooter: "/assets/logo-footer.svg",
  slogan: "Smart shopping, happy living — everything you need at your door.",
  phone: "+880 1700-112233",
  email: "support@kmcbazar.com",
  address: "Dhaka, Bangladesh",
  facebook: "#",
  instagram: "#",
  youtube: "#",
  whatsapp: "#",
  colorFrom: "#FF7A00",
  colorTo: "#FF3D77",
  allProductsTitle: "All Products",
  categoryTitle: "Shop by Category",
  categorySubtitle: "Find your favourites from our wide range of collections",
  buyNowText: "Buy Now",
  metaTitle: "",
  metaDescription: "",
  favicon: "/favicon.ico",
  logoMode: "image",
  logoText: "",
  language: "en",
  textOverrides: {},
  adminMenuMode: "remember",
};

export const getSettings = unstable_cache(
  async (): Promise<Settings> => {
    try {
      const rows = await db.select().from(settings).limit(1);
      /* A column added by a migration that has not been run yet comes back
         as undefined; spreading over the defaults keeps every field present. */
      return rows[0] ? { ...DEFAULT_SETTINGS, ...stripUndefined(rows[0]) } : DEFAULT_SETTINGS;
    } catch (e) {
      console.error("settings unavailable, using defaults:", e);
      return DEFAULT_SETTINGS;
    }
  },
  ["settings"],
  { revalidate: 60, tags: ["settings"] }
);

function stripUndefined<T extends object>(row: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [k, v] of Object.entries(row)) {
    if (v !== undefined && v !== null) (out as Record<string, unknown>)[k] = v;
  }
  return out;
}

/** Storefront strings for the language chosen in Site Settings. */
export async function getSiteText(): Promise<SiteText> {
  const s = await getSettings();
  return resolveText(isLang(s.language) ? s.language : "en", mergeLegacyText(s));
}

export const getMenus = unstable_cache(
  async (): Promise<Menu[]> => {
    return db
      .select()
      .from(menus)
      .where(eq(menus.isActive, true))
      .orderBy(asc(menus.sortOrder), asc(menus.id));
  },
  ["menus"],
  { revalidate: 60, tags: ["menus"] }
);

/* Banner and category pictures are stored inline too, so they get the same
   treatment: the row carries a content hash and the markup points at
   /api/img. Keeps the cached payload — and the HTML — small. */
const bannerColumns = {
  id: banners.id,
  alt: banners.alt,
  imageVersion: sql<string | null>`substr(md5(${banners.imageUrl}), 1, 8)`,
  sortOrder: banners.sortOrder,
  isActive: banners.isActive,
};

export const getBanners = unstable_cache(
  async (): Promise<Banner[]> => {
    const rows = await db
      .select(bannerColumns)
      .from(banners)
      .where(eq(banners.isActive, true))
      .orderBy(asc(banners.sortOrder), asc(banners.id));
    return rows.map(({ imageVersion, ...b }) => ({
      ...b,
      imageUrl: dbImageUrl("b", b.id, 0, imageVersion),
    }));
  },
  ["banners"],
  { revalidate: 60, tags: ["banners"] }
);

const categoryColumns = {
  id: categories.id,
  name: categories.name,
  slug: categories.slug,
  imageVersion: sql<string | null>`nullif(substr(md5(${categories.imageUrl}), 1, 8), '')`,
  hasImage: sql<boolean>`${categories.imageUrl} <> ''`,
  sortOrder: categories.sortOrder,
  isActive: categories.isActive,
  showOnHome: categories.showOnHome,
};

type CategoryRow = {
  id: number;
  name: string;
  slug: string;
  imageVersion: string | null;
  hasImage: boolean;
  sortOrder: number;
  isActive: boolean;
  showOnHome: boolean;
};

function rowToCategory({ imageVersion, hasImage, ...c }: CategoryRow): Category {
  return { ...c, imageUrl: hasImage ? dbImageUrl("c", c.id, 0, imageVersion) : "" };
}

export const getCategories = unstable_cache(
  async (): Promise<Category[]> => {
    const rows = await db
      .select(categoryColumns)
      .from(categories)
      .where(eq(categories.isActive, true))
      .orderBy(asc(categories.sortOrder), asc(categories.id));
    return rows.map(rowToCategory);
  },
  ["categories"],
  { revalidate: 60, tags: ["categories"] }
);

export const getHomeCategories = unstable_cache(
  async (): Promise<Category[]> => {
    const rows = await db
      .select(categoryColumns)
      .from(categories)
      .where(and(eq(categories.isActive, true), eq(categories.showOnHome, true)))
      .orderBy(asc(categories.sortOrder), asc(categories.id));
    return rows.map(rowToCategory);
  },
  ["home-categories"],
  { revalidate: 60, tags: ["home-categories"] }
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
  { revalidate: 60, tags: ["delivery-areas"] }
);

/* ---------------- products ---------------- */

/**
 * Everything a product card needs and nothing else.
 *
 * `images` is a jsonb array of base64 data URLs, so `select *` dragged the
 * full-size pictures out of the database only for `toLite` to throw all but
 * the first one away — about 13 MB for a twelve-product grid. Here the
 * database returns a short content hash instead and the markup points at
 * /api/img, which serves the bytes once and lets the browser cache them.
 */
const liteColumns = {
  id: products.id,
  name: products.name,
  slug: products.slug,
  imageVersion: sql<string | null>`substr(md5(${products.images}->>0), 1, 8)`,
  regularPrice: products.regularPrice,
  sellPrice: products.sellPrice,
  freeDelivery: products.freeDelivery,
};

type LiteRow = {
  id: number;
  name: string;
  slug: string;
  imageVersion: string | null;
  regularPrice: number;
  sellPrice: number | null;
  freeDelivery: boolean;
};

function rowToLite(p: LiteRow): ProductLite {
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    image: dbImageUrl("p", p.id, 0, p.imageVersion),
    regularPrice: p.regularPrice,
    sellPrice: p.sellPrice,
    freeDelivery: p.freeDelivery,
  };
}

/** Kept for callers that already hold a full row (admin previews). */
function toLite(p: Product): ProductLite {
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    image: (p.images && p.images[0]) || "/assets/logo-header.svg",
    regularPrice: p.regularPrice,
    sellPrice: p.sellPrice,
    freeDelivery: p.freeDelivery,
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
    /* A sub-select keeps this to one round trip instead of looking the
       category up first and then querying products. */
    conds.push(
      sql`${products.categoryId} = (select id from ${categories} where ${categories.slug} = ${categorySlug} limit 1)`
    );
  }

  const where = and(...conds);

  const [rows, countRows] = await Promise.all([
    db
      .select(liteColumns)
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
    items: rows.slice(0, limit).map(rowToLite),
    hasMore,
    total: countRows[0]?.count ?? 0,
  };
}

export async function getProductBySlug(slug: string): Promise<(Product & { category?: Category }) | null> {
  /* One query, and the gallery comes back as /api/img URLs rather than a
     few megabytes of base64 inlined into the page. */
  const rows = await db
    .select({
      id: products.id,
      name: products.name,
      slug: products.slug,
      categoryId: products.categoryId,
      description: products.description,
      imageVersions: sql<string[] | null>`(
        select array_agg(substr(md5(value), 1, 8) order by ord)
        from jsonb_array_elements_text(${products.images}) with ordinality as t(value, ord)
      )`,
      regularPrice: products.regularPrice,
      sellPrice: products.sellPrice,
      costPrice: products.costPrice,
      stock: products.stock,
      freeDelivery: products.freeDelivery,
      isActive: products.isActive,
      createdAt: products.createdAt,
      category: categories,
    })
    .from(products)
    .leftJoin(categories, eq(categories.id, products.categoryId))
    .where(and(eq(products.slug, slug), eq(products.isActive, true)))
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  const { imageVersions, category, ...rest } = row;
  return {
    ...rest,
    images: (imageVersions ?? []).map((v, i) => dbImageUrl("p", row.id, i, v)),
    category: category ?? undefined,
  };
}

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  const rows = await db.select(categoryColumns).from(categories).where(eq(categories.slug, slug)).limit(1);
  return rows[0] ? rowToCategory(rows[0]) : null;
}

export async function getRelatedProducts(categoryId: number, excludeId: number, limit = 6): Promise<ProductLite[]> {
  const rows = await db
    .select(liteColumns)
    .from(products)
    .where(and(eq(products.isActive, true), eq(products.categoryId, categoryId)))
    .orderBy(desc(products.id))
    .limit(limit + 1);
  return rows
    .filter((p) => p.id !== excludeId)
    .slice(0, limit)
    .map(rowToLite);
}

export async function searchProducts(q: string, limit = 8): Promise<ProductLite[]> {
  if (!q.trim()) return [];
  const rows = await db
    .select(liteColumns)
    .from(products)
    .where(and(eq(products.isActive, true), ilike(products.name, `%${q.trim()}%`)))
    .orderBy(asc(products.name))
    .limit(limit);
  return rows.map(rowToLite);
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
