import type { Metadata } from "next";
import { listAdminProducts, PRODUCTS_PAGE_SIZE } from "@/lib/admin-products";
import ProductsClient from "./ProductsClient";
import { requirePermission } from "@/lib/admin-guard";

export const metadata: Metadata = { title: "Products · Admin" };
export const dynamic = "force-dynamic";

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  await requirePermission("products");
  /* /admin/categories links here with ?category=<id> */
  const { category } = await searchParams;
  const categoryId = Number(category) > 0 ? Number(category) : null;

  const initial = await listAdminProducts({
    q: "",
    categoryId,
    stock: "all",
    offset: 0,
    limit: PRODUCTS_PAGE_SIZE,
  });

  return <ProductsClient initial={initial} initialCategoryId={categoryId ?? 0} />;
}
