import { NextRequest } from "next/server";
import { db } from "@/db";
import { menus } from "@/db/schema";
import { fail, guardAdmin, parseSort, refreshStorefront } from "@/lib/admin-api";
import { isValidHref, listMenus, normalizeHref, HREF_HINT } from "@/lib/admin-site-content";

export const dynamic = "force-dynamic";

export async function GET() {
  const denied = await guardAdmin();
  if (denied) return denied;
  try {
    return Response.json({ items: await listMenus() });
  } catch (e) {
    console.error(e);
    return fail("Failed to load menus", 500);
  }
}

export async function POST(req: NextRequest) {
  const denied = await guardAdmin();
  if (denied) return denied;
  try {
    const body = await req.json();
    const label = String(body.label ?? "").trim();
    if (label.length < 1) return fail("Menu label is required");

    const href = normalizeHref(String(body.href ?? ""));
    if (!isValidHref(href)) return fail(HREF_HINT);

    const sortOrder = parseSort(body.sortOrder);
    if (sortOrder === null) return fail("Sort order must be 0 or more");

    const [created] = await db
      .insert(menus)
      .values({
        label,
        href,
        sortOrder,
        isActive: body.isActive === undefined ? true : Boolean(body.isActive),
      })
      .returning();

    refreshStorefront("menus");
    return Response.json({ ok: true, menu: created }, { status: 201 });
  } catch (e) {
    console.error(e);
    return fail("Could not create the menu item", 500);
  }
}
