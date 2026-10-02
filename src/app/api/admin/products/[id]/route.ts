import { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { products } from "@/db/schema";
import { getSessionAdmin } from "@/lib/admin-auth";
import { cleanImages, slugTaken, slugify } from "@/lib/admin-products";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

type Updates = Partial<{
  name: string;
  slug: string;
  categoryId: number;
  description: string;
  images: string[];
  regularPrice: number;
  sellPrice: number | null;
  costPrice: number | null;
  stock: number;
  freeDelivery: boolean;
  isActive: boolean;
}>;

function money(v: unknown): number | null {
  const n = Math.round(Number(v));
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const admin = await getSessionAdmin();
  if (!admin) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id: raw } = await params;
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) {
    return Response.json({ error: "Invalid product id" }, { status: 400 });
  }

  try {
    const body = await req.json();
    const u: Updates = {};

    if (body.name !== undefined) {
      const name = String(body.name).trim();
      if (name.length < 3) {
        return Response.json({ error: "Product name must be at least 3 characters" }, { status: 400 });
      }
      u.name = name;
    }

    if (body.slug !== undefined) {
      const slug = slugify(String(body.slug));
      if (!slug) return Response.json({ error: "URL slug cannot be empty" }, { status: 400 });
      if (await slugTaken(slug, id)) {
        return Response.json({ error: `The URL slug “${slug}” is already used` }, { status: 409 });
      }
      u.slug = slug;
    }

    if (body.categoryId !== undefined) {
      const categoryId = Number(body.categoryId);
      if (!Number.isInteger(categoryId) || categoryId <= 0) {
        return Response.json({ error: "Please choose a category" }, { status: 400 });
      }
      u.categoryId = categoryId;
    }

    if (body.description !== undefined) u.description = String(body.description).trim();
    if (body.images !== undefined) u.images = cleanImages(body.images);

    if (body.regularPrice !== undefined) {
      const n = money(body.regularPrice);
      if (n === null || n <= 0) {
        return Response.json({ error: "Regular price must be greater than 0" }, { status: 400 });
      }
      u.regularPrice = n;
    }

    if (body.sellPrice !== undefined) {
      if (body.sellPrice === null || body.sellPrice === "") {
        u.sellPrice = null;
      } else {
        const n = money(body.sellPrice);
        if (n === null) return Response.json({ error: "Sell price is not a valid amount" }, { status: 400 });
        u.sellPrice = n;
      }
    }

    if (body.costPrice !== undefined) {
      if (body.costPrice === null || body.costPrice === "") {
        u.costPrice = null;
      } else {
        const n = money(body.costPrice);
        if (n === null) {
          return Response.json({ error: "Purchase price is not a valid amount" }, { status: 400 });
        }
        u.costPrice = n;
      }
    }

    if (body.stock !== undefined) {
      const n = money(body.stock);
      if (n === null) return Response.json({ error: "Stock cannot be negative" }, { status: 400 });
      u.stock = n;
    }

    if (body.freeDelivery !== undefined) u.freeDelivery = Boolean(body.freeDelivery);
    if (body.isActive !== undefined) u.isActive = Boolean(body.isActive);

    if (Object.keys(u).length === 0) {
      return Response.json({ error: "Nothing to update" }, { status: 400 });
    }

    /* sell price can never exceed the regular price, whichever side changed */
    const current = (await db.select().from(products).where(eq(products.id, id)).limit(1))[0];
    if (!current) return Response.json({ error: "Product not found" }, { status: 404 });

    const nextRegular = u.regularPrice ?? current.regularPrice;
    const nextSell = u.sellPrice !== undefined ? u.sellPrice : current.sellPrice;
    if (nextSell !== null && nextSell > nextRegular) {
      return Response.json(
        { error: "Sell price cannot be higher than the regular price" },
        { status: 400 }
      );
    }

    const [updated] = await db
      .update(products)
      .set(u)
      .where(eq(products.id, id))
      .returning({
        id: products.id,
        name: products.name,
        slug: products.slug,
        categoryId: products.categoryId,
        regularPrice: products.regularPrice,
        sellPrice: products.sellPrice,
        costPrice: products.costPrice,
        stock: products.stock,
        freeDelivery: products.freeDelivery,
        isActive: products.isActive,
      });

    revalidatePath("/", "layout");
    return Response.json({ ok: true, product: updated });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Could not update the product" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const admin = await getSessionAdmin();
  if (!admin) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id: raw } = await params;
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) {
    return Response.json({ error: "Invalid product id" }, { status: 400 });
  }

  try {
    const deleted = await db.delete(products).where(eq(products.id, id)).returning({ id: products.id });
    if (deleted.length === 0) return Response.json({ error: "Product not found" }, { status: 404 });
    revalidatePath("/", "layout");
    return Response.json({ ok: true });
  } catch (e) {
    console.error(e);
    return Response.json(
      { error: "Could not delete — this product is probably attached to an order" },
      { status: 409 }
    );
  }
}
