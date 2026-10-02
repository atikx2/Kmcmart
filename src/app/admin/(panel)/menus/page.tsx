import type { Metadata } from "next";
import { listMenus } from "@/lib/admin-site-content";
import MenusClient from "./MenusClient";
import { requirePermission } from "@/lib/admin-guard";

export const metadata: Metadata = { title: "Menus · Admin" };
export const dynamic = "force-dynamic";

export default async function AdminMenusPage() {
  await requirePermission("menus");
  return <MenusClient initial={await listMenus()} />;
}
