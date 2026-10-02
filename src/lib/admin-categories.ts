import { asc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { categories, products } from "@/db/schema";
import type { AdminCategoryList, AdminCategoryRow } from "@/lib/category-admin";

/* Re-exported so server files only need one import. Client components must
   import from "@/lib/category-admin" instead (this file pulls in `pg`). */
export * from "@/lib/category-admin";

export async function listAdminCategories(): Promise<AdminCategoryList> {
  /* A left join + group by, not a correlated subquery: inside a drizzle `sql`
     template column refs render unqualified, which would silently self-join. */
  const rows = await db
    .select({
      id: categories.id,
      name: categories.name,
      slug: categories.slug,
      imageUrl: categories.imageUrl,
      sortOrder: categories.sortOrder,
      isActive: categories.isActive,
      showOnHome: categories.showOnHome,
      productCount: sql<number>`count(${products.id})::int`,
    })
    .from(categories)
    .leftJoin(products, eq(products.categoryId, categories.id))
    .groupBy(
      categories.id,
      categories.name,
      categories.slug,
      categories.imageUrl,
      categories.sortOrder,
      categories.isActive,
      categories.showOnHome
    )
    .orderBy(asc(categories.sortOrder), asc(categories.name));

  const items: AdminCategoryRow[] = rows.map((r) => ({ ...r }));
  return { items, total: items.length };
}

export async function categorySlugTaken(slug: string, exceptId?: number): Promise<boolean> {
  const rows = await db
    .select({ id: categories.id })
    .from(categories)
    .where(eq(categories.slug, slug))
    .limit(2);
  return rows.some((r) => r.id !== exceptId);
}

export async function countProductsInCategory(categoryId: number): Promise<number> {
  const rows = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(products)
    .where(eq(products.categoryId, categoryId));
  return rows[0]?.n ?? 0;
}
