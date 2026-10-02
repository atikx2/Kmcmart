import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionAdmin } from "@/lib/admin-auth";
import { getAdminOrdersByIds } from "@/lib/admin-orders";
import { listOrderStatuses } from "@/lib/admin-order-statuses";
import { getSettings } from "@/lib/data";
import { loadCourierConfig } from "@/lib/admin-courier";
import { COURIER_PROVIDER_LABEL } from "@/lib/courier";
import PrintClient from "./PrintClient";

export const metadata: Metadata = {
  title: "Print labels",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function AdminPrintPage({
  searchParams,
}: {
  searchParams: Promise<{ ids?: string }>;
}) {
  /* Lives outside the (panel) group so the sidebar/header never reach the
     paper — that means this page guards itself. */
  const admin = await getSessionAdmin();
  if (!admin) redirect("/admin/login");

  const { ids: raw } = await searchParams;
  const ids = (raw ?? "")
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isInteger(n) && n > 0)
    .slice(0, 200);

  const [orders, settings, statuses, courier] = await Promise.all([
    getAdminOrdersByIds(ids),
    getSettings(),
    listOrderStatuses(),
    loadCourierConfig(),
  ]);

  return (
    <PrintClient
      orders={orders}
      statuses={statuses}
      settings={{ siteName: settings.siteName, phone: settings.phone, address: settings.address, email: settings.email }}
      courierName={COURIER_PROVIDER_LABEL[courier.row?.provider ?? ""] ?? "Courier"}
    />
  );
}
