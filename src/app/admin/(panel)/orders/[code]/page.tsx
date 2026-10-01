import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAdminOrderByCode } from "@/lib/admin-orders";
import OrderDetailClient from "./OrderDetailClient";

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
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const order = await getAdminOrderByCode(code);
  if (!order) notFound();

  return <OrderDetailClient order={order} />;
}
