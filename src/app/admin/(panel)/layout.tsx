import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionAdmin } from "@/lib/admin-auth";
import { getPendingOrdersCount } from "@/lib/admin-data";
import { getSettings } from "@/lib/data";
import AdminShell from "@/components/admin/AdminShell";

export const metadata: Metadata = { title: "Admin Panel" };
export const dynamic = "force-dynamic";

export default async function AdminPanelLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const admin = await getSessionAdmin();
  if (!admin) redirect("/admin/login");

  const [pendingOrders, settings] = await Promise.all([getPendingOrdersCount(), getSettings()]);

  return (
    <AdminShell
      email={admin.email}
      pendingOrders={pendingOrders}
      logo={settings.logoHeader}
      siteName={settings.siteName}
    >
      {children}
    </AdminShell>
  );
}
