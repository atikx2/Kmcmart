import { asc } from "drizzle-orm";
import { db } from "@/db";
import { banners, deliveryAreas, menus } from "@/db/schema";
import type { AdminArea, AdminBanner, AdminMenu } from "@/lib/site-content";

/* Server-only helpers. Client components import "@/lib/site-content". */
export * from "@/lib/site-content";

export async function listBanners(): Promise<AdminBanner[]> {
  return db.select().from(banners).orderBy(asc(banners.sortOrder), asc(banners.id));
}

export async function listMenus(): Promise<AdminMenu[]> {
  return db.select().from(menus).orderBy(asc(menus.sortOrder), asc(menus.id));
}

export async function listDeliveryAreas(): Promise<AdminArea[]> {
  return db.select().from(deliveryAreas).orderBy(asc(deliveryAreas.sortOrder), asc(deliveryAreas.id));
}
