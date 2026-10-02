import type { Metadata } from "next";
import { listDeliveryAreas } from "@/lib/admin-site-content";
import AreasClient from "./AreasClient";

export const metadata: Metadata = { title: "Delivery Areas · Admin" };
export const dynamic = "force-dynamic";

export default async function AdminDeliveryAreasPage() {
  return <AreasClient initial={await listDeliveryAreas()} />;
}
