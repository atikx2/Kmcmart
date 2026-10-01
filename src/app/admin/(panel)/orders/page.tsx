import type { Metadata } from "next";
import { listAdminOrders, ORDERS_PAGE_SIZE } from "@/lib/admin-orders";
import OrdersClient from "./OrdersClient";

export const metadata: Metadata = { title: "Orders · Admin" };
export const dynamic = "force-dynamic";

export default async function AdminOrdersPage() {
  const initial = await listAdminOrders({
    status: "all",
    q: "",
    offset: 0,
    limit: ORDERS_PAGE_SIZE,
  });

  return <OrdersClient initial={initial} />;
}
