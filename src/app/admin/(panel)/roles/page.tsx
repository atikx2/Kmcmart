import type { Metadata } from "next";
import { listAdminAccounts } from "@/lib/admin-accounts";
import { requirePermission } from "@/lib/admin-guard";
import RolesClient from "./RolesClient";

export const metadata: Metadata = { title: "Role Management · Admin" };
export const dynamic = "force-dynamic";

export default async function AdminRolesPage() {
  const me = await requirePermission("roles");
  return <RolesClient initial={await listAdminAccounts(me.id)} />;
}
