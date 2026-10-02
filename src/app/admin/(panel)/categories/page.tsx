import type { Metadata } from "next";
import { listAdminCategories } from "@/lib/admin-categories";
import CategoriesClient from "./CategoriesClient";
import { requirePermission } from "@/lib/admin-guard";

export const metadata: Metadata = { title: "Categories · Admin" };
export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage() {
  await requirePermission("categories");
  const initial = await listAdminCategories();
  return <CategoriesClient initial={initial} />;
}
