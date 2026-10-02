import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionAdmin } from "@/lib/admin-auth";
import { getPendingOrdersCount } from "@/lib/admin-data";
import { getSettings } from "@/lib/data";
import AdminShell from "@/components/admin/AdminShell";
import { NAV_COOKIE } from "@/lib/admin-ui";

export const metadata: Metadata = { title: "Admin Panel" };
export const dynamic = "force-dynamic";

export default async function AdminPanelLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const admin = await getSessionAdmin();
  if (!admin) redirect("/admin/login");

  const [pendingOrders, settings, jar] = await Promise.all([
    getPendingOrdersCount(),
    getSettings(),
    cookies(),
  ]);

  return (
    <AdminShell
      email={admin.email}
      adminName={admin.name}
      role={admin.role}
      permissions={admin.permissions}
      pendingOrders={pendingOrders}
      logo={settings.logoHeader}
      siteName={settings.siteName}
      defaultCollapsed={jar.get(NAV_COOKIE)?.value === "1"}
    >
      {children}
    </AdminShell>
  );
}
