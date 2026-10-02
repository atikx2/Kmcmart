import { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { products } from "@/db/schema";
import { getSessionAdmin } from "@/lib/admin-auth";
import {
  cleanImages,
  listAdminProducts,
  slugTaken,
  PRODUCTS_PAGE_SIZE,
  slugify,
} from "@/lib/admin-products";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const admin = await getSessionAdmin();
  if (!admin) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const sp = req.nextUrl.searchParams;
    const cat = parseInt(sp.get("categoryId") || "0", 10);
    const data = await listAdminProducts({
      q: sp.get("q"),
      categoryId: Number.isInteger(cat) && cat > 0 ? cat : null,
      stock: sp.get("stock"),
      offset: parseInt(sp.get("offset") || "0", 10) || 0,
      /* clamped to 1..100 inside listAdminProducts() */
      limit: parseInt(sp.get("limit") || String(PRODUCTS_PAGE_SIZE), 10) || PRODUCTS_PAGE_SIZE,
    });
    return Response.json(data);
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Failed to load products" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const admin = await getSessionAdmin();
  if (!admin) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const name = String(body.name ?? "").trim();
    const categoryId = Number(body.categoryId);
    const regularPrice = Math.round(Number(body.regularPrice));
    const rawSell = body.sellPrice;
    const rawCost = body.costPrice;
    const stock = Math.round(Number(body.stock ?? 0));

    if (name.length < 3) {
      return Response.json({ error: "Product name must be at least 3 characters" }, { status: 400 });
    }
    if (!Number.isInteger(categoryId) || categoryId <= 0) {
      return Response.json({ error: "Please choose a category" }, { status: 400 });
    }
    if (!Number.isFinite(regularPrice) || regularPrice <= 0) {
      return Response.json({ error: "Regular price must be greater than 0" }, { status: 400 });
    }

    const sellPrice =
      rawSell === "" || rawSell === null || rawSell === undefined ? null : Math.round(Number(rawSell));
    if (sellPrice !== null && (!Number.isFinite(sellPrice) || sellPrice < 0)) {
      return Response.json({ error: "Sell price is not a valid amount" }, { status: 400 });
    }
    if (sellPrice !== null && sellPrice > regularPrice) {
      return Response.json({ error: "Sell price cannot be higher than the regular price" }, { status: 400 });
    }

    const costPrice =
      rawCost === "" || rawCost === null || rawCost === undefined ? null : Math.round(Number(rawCost));
    if (costPrice !== null && (!Number.isFinite(costPrice) || costPrice < 0)) {
      return Response.json({ error: "Purchase price is not a valid amount" }, { status: 400 });
    }
    if (!Number.isFinite(stock) || stock < 0) {
      return Response.json({ error: "Stock cannot be negative" }, { status: 400 });
    }

    const images = cleanImages(body.images);
    const slug = slugify(String(body.slug ?? "") || name) || `product-${Date.now()}`;
    if (await slugTaken(slug)) {
      return Response.json({ error: `The URL slug “${slug}” is already used` }, { status: 409 });
    }

    const [created] = await db
      .insert(products)
      .values({
        name,
        slug,
        categoryId,
        description: String(body.description ?? "").trim(),
        images,
        regularPrice,
        sellPrice,
        costPrice,
        stock,
        freeDelivery: Boolean(body.freeDelivery),
        isActive: body.isActive === undefined ? true : Boolean(body.isActive),
      })
      .returning({ id: products.id, slug: products.slug });

    revalidatePath("/", "layout");
    return Response.json({ ok: true, product: created }, { status: 201 });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Could not create the product" }, { status: 500 });
  }
}
