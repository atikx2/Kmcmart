import type { Metadata } from "next";
import { listDeliveryAreas } from "@/lib/admin-site-content";
import AreasClient from "./AreasClient";
import { requirePermission } from "@/lib/admin-guard";

export const metadata: Metadata = { title: "Delivery Areas · Admin" };
export const dynamic = "force-dynamic";

export default async function AdminDeliveryAreasPage() {
  await requirePermission("delivery");
  return <AreasClient initial={await listDeliveryAreas()} />;
}
