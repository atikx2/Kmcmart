import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAdminProductById, getCategoryOptions } from "@/lib/admin-products";
import type { ProductFormValues } from "@/lib/product-admin";
import ProductForm from "../../ProductForm";
import { requirePermission } from "@/lib/admin-guard";

export const metadata: Metadata = { title: "Edit Product · Admin" };
export const dynamic = "force-dynamic";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission("products");
  const { id: raw } = await params;
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) notFound();

  const [product, categories] = await Promise.all([getAdminProductById(id), getCategoryOptions()]);
  if (!product) notFound();

  const initial: ProductFormValues = {
    name: product.name,
    slug: product.slug,
    categoryId: product.categoryId,
    description: product.description,
    images: product.images,
    regularPrice: String(product.regularPrice),
    sellPrice: product.sellPrice === null ? "" : String(product.sellPrice),
    costPrice: product.costPrice === null ? "" : String(product.costPrice),
    stock: String(product.stock),
    freeDelivery: product.freeDelivery,
    isActive: product.isActive,
  };

  return <ProductForm mode="edit" productId={product.id} initial={initial} categories={categories} />;
}
