import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionAdmin } from "@/lib/admin-auth";
import { getAdminOrdersByIds } from "@/lib/admin-orders";
import { getSettings } from "@/lib/data";
import PrintSheet from "./PrintSheet";

export const metadata: Metadata = {
  title: "Print invoices",
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

  const [orders, settings] = await Promise.all([getAdminOrdersByIds(ids), getSettings()]);

  return <PrintSheet orders={orders} settings={{ siteName: settings.siteName, phone: settings.phone, address: settings.address, email: settings.email }} />;
}
