import type { Metadata } from "next";
import { listAdminCategories } from "@/lib/admin-categories";
import CategoriesClient from "./CategoriesClient";

export const metadata: Metadata = { title: "Categories · Admin" };
export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage() {
  const initial = await listAdminCategories();
  return <CategoriesClient initial={initial} />;
}
