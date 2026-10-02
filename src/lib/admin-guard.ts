import { redirect } from "next/navigation";
import { getSessionAdmin } from "@/lib/admin-auth";
import { can, type PermissionKey } from "@/lib/permissions";
import type { Admin } from "@/db/schema";

/**
 * Page-level access guard. Sends a signed-out admin to the login screen and
 * an admin without the permission back to the dashboard, so a hand-typed URL
 * cannot reach a section that is hidden from the sidebar.
 */
export async function requirePermission(permission: PermissionKey): Promise<Admin> {
  const admin = await getSessionAdmin();
  if (!admin) redirect("/admin/login");
  if (!admin.isActive) redirect("/admin/login?disabled=1");
  if (!can(admin, permission)) redirect("/admin?denied=" + permission);
  return admin;
}
