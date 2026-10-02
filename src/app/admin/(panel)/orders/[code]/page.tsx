import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAdminOrderByCode } from "@/lib/admin-orders";
import OrderDetailClient from "./OrderDetailClient";
import { requirePermission } from "@/lib/admin-guard";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  return { title: `Order #${code} · Admin` };
}

export default async function AdminOrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ edit?: string }>;
}) {
  await requirePermission("orders");
  const [{ code }, { edit }] = await Promise.all([params, searchParams]);
  const order = await getAdminOrderByCode(code);
  if (!order) notFound();

  return <OrderDetailClient order={order} startInEdit={edit === "1"} />;
}
