/**
 * Admin access control. Client-safe — no DB imports.
 *
 * The very first admin (lowest id) is the OWNER: it always has every
 * permission, can never be deactivated, demoted or deleted. Everybody else
 * carries an explicit list of permission keys.
 */

export const ADMIN_PERMISSIONS = [
  { key: "orders", label: "Orders", hint: "View, edit and change order status" },
  { key: "products", label: "Products", hint: "Add, edit and delete products" },
  { key: "categories", label: "Categories", hint: "Manage categories and home sections" },
  { key: "banners", label: "Banners", hint: "Hero slider images" },
  { key: "menus", label: "Menus", hint: "Header and footer links" },
  { key: "delivery", label: "Delivery Area", hint: "Areas and delivery charges" },
  { key: "customers", label: "Customers", hint: "Customer list and order history" },
  { key: "reports", label: "Report", hint: "Profit, loss and sales charts" },
  { key: "api", label: "API", hint: "Courier, fraud and SMS integrations" },
  { key: "roles", label: "Role Management", hint: "Add admins and set their access" },
  { key: "settings", label: "Site Settings", hint: "Store name, logo, contact info" },
] as const;

export type PermissionKey = (typeof ADMIN_PERMISSIONS)[number]["key"];

export const ALL_PERMISSIONS: PermissionKey[] = ADMIN_PERMISSIONS.map((p) => p.key);

export const ADMIN_ROLES = [
  {
    key: "owner",
    label: "Super Admin",
    hint: "Full control — cannot be removed",
    permissions: ALL_PERMISSIONS,
  },
  {
    key: "manager",
    label: "Manager",
    hint: "Runs the store day to day",
    permissions: [
      "orders",
      "products",
      "categories",
      "banners",
      "menus",
      "delivery",
      "customers",
      "reports",
    ] as PermissionKey[],
  },
  {
    key: "staff",
    label: "Staff",
    hint: "Handles orders only",
    permissions: ["orders", "customers"] as PermissionKey[],
  },
  {
    key: "custom",
    label: "Custom",
    hint: "Pick the exact pages below",
    permissions: [] as PermissionKey[],
  },
] as const;

export type AdminRole = (typeof ADMIN_ROLES)[number]["key"];

export const ROLE_CHIP: Record<string, string> = {
  owner: "bg-[color-mix(in_srgb,var(--g1)_14%,white)] text-[var(--g2)] ring-[color-mix(in_srgb,var(--g1)_30%,white)]",
  manager: "bg-indigo-50 text-indigo-600 ring-indigo-100",
  staff: "bg-sky-50 text-sky-600 ring-sky-100",
  custom: "bg-violet-50 text-violet-600 ring-violet-100",
};

export function roleLabel(role: string): string {
  return ADMIN_ROLES.find((r) => r.key === role)?.label ?? "Custom";
}

export function presetPermissions(role: string): PermissionKey[] {
  return [...(ADMIN_ROLES.find((r) => r.key === role)?.permissions ?? [])];
}

export function isOwnerRole(role: string): boolean {
  return role === "owner";
}

/** Owner bypasses the list; everyone else needs the exact key. */
export function can(
  admin: { role: string; permissions: string[] } | null | undefined,
  key: PermissionKey
): boolean {
  if (!admin) return false;
  if (isOwnerRole(admin.role)) return true;
  return admin.permissions.includes(key);
}

export function permissionLabel(key: string): string {
  return ADMIN_PERMISSIONS.find((p) => p.key === key)?.label ?? key;
}

/** Sidebar / route key for a pathname, so one guard covers every admin page. */
export function permissionForPath(pathname: string): PermissionKey | null {
  if (pathname.startsWith("/admin/orders")) return "orders";
  if (pathname.startsWith("/admin/products")) return "products";
  if (pathname.startsWith("/admin/categories")) return "categories";
  if (pathname.startsWith("/admin/banners")) return "banners";
  if (pathname.startsWith("/admin/menus")) return "menus";
  if (pathname.startsWith("/admin/delivery-areas")) return "delivery";
  if (pathname.startsWith("/admin/customers")) return "customers";
  if (pathname.startsWith("/admin/reports")) return "reports";
  if (pathname.startsWith("/admin/api")) return "api";
  if (pathname.startsWith("/admin/roles")) return "roles";
  if (pathname.startsWith("/admin/settings")) return "settings";
  return null;
}

export type AdminAccount = {
  id: number;
  name: string;
  email: string;
  role: string;
  permissions: string[];
  isActive: boolean;
  isOwner: boolean;
  createdAt: string;
  /** true for the admin looking at the page */
  isSelf: boolean;
};
