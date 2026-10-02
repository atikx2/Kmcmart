import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionAdmin } from "@/lib/admin-auth";
import { getPendingOrdersCount } from "@/lib/admin-data";
import { getSettings } from "@/lib/data";
import AdminShell from "@/components/admin/AdminShell";
import SecurityBanner from "@/components/admin/SecurityBanner";
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

  /* "Sidebar menu behaviour" from Site Settings. The cookie only counts when
     the admin chose "remember". */
  const mode = settings.adminMenuMode;
  const defaultCollapsed =
    mode === "collapsed" ? true : mode === "expanded" ? false : jar.get(NAV_COOKIE)?.value === "1";

  return (
    <AdminShell
      email={admin.email}
      adminName={admin.name}
      role={admin.role}
      permissions={admin.permissions}
      pendingOrders={pendingOrders}
      logo={settings.logoHeader}
      siteName={settings.siteName}
      defaultCollapsed={defaultCollapsed}
      menuMode={mode}
    >
      <SecurityBanner authSecretSet={Boolean(process.env.AUTH_SECRET)} />
      {children}
    </AdminShell>
  );
}
