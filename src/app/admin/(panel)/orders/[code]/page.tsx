import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAdminOrderByCode } from "@/lib/admin-orders";
import { listOrderStatuses } from "@/lib/admin-order-statuses";
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
  const [order, statuses] = await Promise.all([getAdminOrderByCode(code), listOrderStatuses()]);
  if (!order) notFound();

  return <OrderDetailClient order={order} statuses={statuses} startInEdit={edit === "1"} />;
}
