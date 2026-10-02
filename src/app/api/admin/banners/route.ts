import { NextRequest } from "next/server";
import { db } from "@/db";
import { banners } from "@/db/schema";
import { fail, guardAdmin, parseSort, refreshStorefront } from "@/lib/admin-api";
import { listBanners } from "@/lib/admin-site-content";

export const dynamic = "force-dynamic";

export async function GET() {
  const denied = await guardAdmin("banners");
  if (denied) return denied;
  try {
    return Response.json({ items: await listBanners() });
  } catch (e) {
    console.error(e);
    return fail("Failed to load banners", 500);
  }
}

export async function POST(req: NextRequest) {
  const denied = await guardAdmin("banners");
  if (denied) return denied;
  try {
    const body = await req.json();
    const imageUrl = String(body.imageUrl ?? "").trim();
    if (!imageUrl) return fail("A banner image is required");

    const sortOrder = parseSort(body.sortOrder);
    if (sortOrder === null) return fail("Sort order must be 0 or more");

    const [created] = await db
      .insert(banners)
      .values({
        imageUrl,
        alt: String(body.alt ?? "").trim() || "Banner",
        sortOrder,
        isActive: body.isActive === undefined ? true : Boolean(body.isActive),
      })
      .returning();

    refreshStorefront("banners");
    return Response.json({ ok: true, banner: created }, { status: 201 });
  } catch (e) {
    console.error(e);
    return fail("Could not create the banner", 500);
  }
}
