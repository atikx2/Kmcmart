import type { Metadata } from "next";
import { getCategoryOptions, emptyProductForm } from "@/lib/admin-products";
import ProductForm from "../ProductForm";

export const metadata: Metadata = { title: "Add Product · Admin" };
export const dynamic = "force-dynamic";

export default async function NewProductPage() {
  const categories = await getCategoryOptions();
  return <ProductForm mode="create" initial={emptyProductForm()} categories={categories} />;
}
