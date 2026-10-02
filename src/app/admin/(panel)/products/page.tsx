import type { Metadata } from "next";
import { listAdminProducts, PRODUCTS_PAGE_SIZE } from "@/lib/admin-products";
import ProductsClient from "./ProductsClient";

export const metadata: Metadata = { title: "Products · Admin" };
export const dynamic = "force-dynamic";

export default async function AdminProductsPage() {
  const initial = await listAdminProducts({
    q: "",
    categoryId: null,
    stock: "all",
    offset: 0,
    limit: PRODUCTS_PAGE_SIZE,
  });

  return <ProductsClient initial={initial} />;
}
