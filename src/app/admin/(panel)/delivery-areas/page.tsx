import type { Metadata } from "next";
import { listDeliveryAreas } from "@/lib/admin-site-content";
import { loadOrderStatuses } from "@/lib/admin-order-statuses";
import DeliveryTabs from "./DeliveryTabs";
import { requirePermission } from "@/lib/admin-guard";

export const metadata: Metadata = { title: "Delivery Areas · Admin" };
export const dynamic = "force-dynamic";

export default async function AdminDeliveryAreasPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  await requirePermission("delivery");
  const [{ tab }, areas, statuses] = await Promise.all([
    searchParams,
    listDeliveryAreas(),
    loadOrderStatuses(),
  ]);

  return (
    <DeliveryTabs
      areas={areas}
      statuses={statuses.items}
      statusesReady={statuses.ready}
      initialTab={tab === "status" ? "statuses" : "areas"}
    />
  );
}
