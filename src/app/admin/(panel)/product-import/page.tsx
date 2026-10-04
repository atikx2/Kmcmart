import type { Metadata } from "next";
import { requirePermission } from "@/lib/admin-guard";
import ProductImportClient from "./ProductImportClient";
export const metadata: Metadata = { title: "Product Importer · Admin" };
export const dynamic = "force-dynamic";
export default async function ProductImportPage() { await requirePermission("products"); return <ProductImportClient />; }
