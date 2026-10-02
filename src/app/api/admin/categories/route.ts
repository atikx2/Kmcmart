import { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { categories } from "@/db/schema";
import { getSessionAdmin } from "@/lib/admin-auth";
import { categorySlugTaken, listAdminCategories } from "@/lib/admin-categories";
import { slugify } from "@/lib/product-admin";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await getSessionAdmin();
  if (!admin) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    return Response.json(await listAdminCategories());
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Failed to load categories" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const admin = await getSessionAdmin();
  if (!admin) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const name = String(body.name ?? "").trim();
    if (name.length < 2) {
      return Response.json({ error: "Category name must be at least 2 characters" }, { status: 400 });
    }

    const slug = slugify(String(body.slug ?? "") || name) || `category-${Date.now()}`;
    if (await categorySlugTaken(slug)) {
      return Response.json({ error: `The URL slug “${slug}” is already used` }, { status: 409 });
    }

    const sortOrder = Math.round(Number(body.sortOrder ?? 0));

    const [created] = await db
      .insert(categories)
      .values({
        name,
        slug,
        imageUrl: String(body.imageUrl ?? "").trim(),
        sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
        isActive: body.isActive === undefined ? true : Boolean(body.isActive),
        showOnHome: Boolean(body.showOnHome),
      })
      .returning({ id: categories.id, slug: categories.slug });

    revalidatePath("/", "layout");
    return Response.json({ ok: true, category: created }, { status: 201 });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Could not create the category" }, { status: 500 });
  }
}
