import type { Metadata } from "next";
import { listMenus } from "@/lib/admin-site-content";
import MenusClient from "./MenusClient";

export const metadata: Metadata = { title: "Menus · Admin" };
export const dynamic = "force-dynamic";

export default async function AdminMenusPage() {
  return <MenusClient initial={await listMenus()} />;
}
