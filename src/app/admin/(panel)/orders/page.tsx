import type { Metadata } from "next";
import { listAdminOrders, ORDERS_PAGE_SIZE } from "@/lib/admin-orders";
import { listOrderStatuses } from "@/lib/admin-order-statuses";
import { loadCourierConfig } from "@/lib/admin-courier";
import OrdersClient from "./OrdersClient";
import { requirePermission } from "@/lib/admin-guard";

export const metadata: Metadata = { title: "Orders · Admin" };
export const dynamic = "force-dynamic";

export default async function AdminOrdersPage() {
  await requirePermission("orders");
  const [initial, statuses, courier] = await Promise.all([
    listAdminOrders({ status: "all", q: "", offset: 0, limit: ORDERS_PAGE_SIZE }),
    listOrderStatuses(),
    loadCourierConfig(),
  ]);
  const courierOn = Boolean(courier.row?.isActive && courier.row.apiKey && courier.row.secretKey);

  return <OrdersClient initial={initial} statuses={statuses} courierOn={courierOn} />;
}
