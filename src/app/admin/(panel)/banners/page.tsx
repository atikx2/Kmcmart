import type { Metadata } from "next";
import { listBanners } from "@/lib/admin-site-content";
import BannersClient from "./BannersClient";
import { requirePermission } from "@/lib/admin-guard";

export const metadata: Metadata = { title: "Banners · Admin" };
export const dynamic = "force-dynamic";

export default async function AdminBannersPage() {
  await requirePermission("banners");
  return <BannersClient initial={await listBanners()} />;
}
