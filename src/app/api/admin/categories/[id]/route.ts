import { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { categories, products } from "@/db/schema";
import { getSessionAdmin } from "@/lib/admin-auth";
import { categorySlugTaken, countProductsInCategory } from "@/lib/admin-categories";
import { slugify } from "@/lib/product-admin";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

type Updates = Partial<{
  name: string;
  slug: string;
  imageUrl: string;
  sortOrder: number;
  isActive: boolean;
  showOnHome: boolean;
}>;

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const admin = await getSessionAdmin();
  if (!admin) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id: raw } = await params;
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) {
    return Response.json({ error: "Invalid category id" }, { status: 400 });
  }

  try {
    const body = await req.json();
    const u: Updates = {};

    if (body.name !== undefined) {
      const name = String(body.name).trim();
      if (name.length < 2) {
        return Response.json({ error: "Category name must be at least 2 characters" }, { status: 400 });
      }
      u.name = name;
    }

    if (body.slug !== undefined) {
      const slug = slugify(String(body.slug));
      if (!slug) return Response.json({ error: "URL slug cannot be empty" }, { status: 400 });
      if (await categorySlugTaken(slug, id)) {
        return Response.json({ error: `The URL slug “${slug}” is already used` }, { status: 409 });
      }
      u.slug = slug;
    }

    if (body.imageUrl !== undefined) u.imageUrl = String(body.imageUrl).trim();

    if (body.sortOrder !== undefined) {
      const n = Math.round(Number(body.sortOrder));
      if (!Number.isFinite(n) || n < 0) {
        return Response.json({ error: "Sort order must be 0 or more" }, { status: 400 });
      }
      u.sortOrder = n;
    }

    if (body.isActive !== undefined) u.isActive = Boolean(body.isActive);
    if (body.showOnHome !== undefined) u.showOnHome = Boolean(body.showOnHome);

    if (Object.keys(u).length === 0) {
      return Response.json({ error: "Nothing to update" }, { status: 400 });
    }

    const [updated] = await db
      .update(categories)
      .set(u)
      .where(eq(categories.id, id))
      .returning({
        id: categories.id,
        name: categories.name,
        slug: categories.slug,
        imageUrl: categories.imageUrl,
        sortOrder: categories.sortOrder,
        isActive: categories.isActive,
        showOnHome: categories.showOnHome,
      });

    if (!updated) return Response.json({ error: "Category not found" }, { status: 404 });

    revalidatePath("/", "layout");
    return Response.json({ ok: true, category: updated });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Could not update the category" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  const admin = await getSessionAdmin();
  if (!admin) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id: raw } = await params;
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) {
    return Response.json({ error: "Invalid category id" }, { status: 400 });
  }

  try {
    const used = await countProductsInCategory(id);
    const moveToRaw = req.nextUrl.searchParams.get("moveTo");
    const moveTo = moveToRaw ? Number(moveToRaw) : 0;

    if (used > 0) {
      /* Blocked unless the admin picked somewhere to move the products. */
      if (!Number.isInteger(moveTo) || moveTo <= 0) {
        return Response.json(
          { error: "This category still has products", productCount: used, needsMove: true },
          { status: 409 }
        );
      }
      if (moveTo === id) {
        return Response.json({ error: "Pick a different category to move the products to" }, { status: 400 });
      }
      const target = await db.select({ id: categories.id }).from(categories).where(eq(categories.id, moveTo)).limit(1);
      if (!target[0]) return Response.json({ error: "Target category not found" }, { status: 404 });

      await db.update(products).set({ categoryId: moveTo }).where(eq(products.categoryId, id));
    }

    const deleted = await db.delete(categories).where(eq(categories.id, id)).returning({ id: categories.id });
    if (deleted.length === 0) return Response.json({ error: "Category not found" }, { status: 404 });

    revalidatePath("/", "layout");
    return Response.json({ ok: true, moved: used > 0 ? used : 0 });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Could not delete the category" }, { status: 500 });
  }
}
