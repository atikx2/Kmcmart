import type { Metadata } from "next";
import { requirePermission } from "@/lib/admin-guard";
import ImageMigrationClient from "./ImageMigrationClient";
export const metadata: Metadata = { title: "Image Migration · Admin" };
export const dynamic = "force-dynamic";
export default async function ImageMigrationPage() { await requirePermission("products"); return <ImageMigrationClient />; }
