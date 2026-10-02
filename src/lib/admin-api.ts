import { revalidatePath, revalidateTag } from "next/cache";
import { getSessionAdmin } from "@/lib/admin-auth";
import { can, type PermissionKey } from "@/lib/permissions";

/**
 * 401 when nobody is signed in, 403 when the signed-in admin lacks the
 * permission, otherwise null and the route carries on.
 */
export async function guardAdmin(permission?: PermissionKey): Promise<Response | null> {
  const admin = await getSessionAdmin();
  if (!admin) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!admin.isActive) return Response.json({ error: "This admin account is disabled" }, { status: 403 });
  if (permission && !can(admin, permission)) {
    return Response.json({ error: "You do not have access to this section" }, { status: 403 });
  }
  return null;
}

export function fail(message: string, status = 400): Response {
  return Response.json({ error: message }, { status });
}

/** Route param → positive int, or null when it is not usable. */
export function routeId(raw: string): number | null {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

/**
 * Drop every storefront cache that could still hold the old value.
 * `unstable_cache` entries are keyed by tag, so the tag has to be busted too.
 */
export function refreshStorefront(tag?: string) {
  /* Next 16 wants a cache-life profile — "max" expires the entry immediately. */
  if (tag) revalidateTag(tag, "max");
  revalidatePath("/", "layout");
}

/** Shared sortOrder parsing for banners / menus / areas. */
export function parseSort(value: unknown, fallback = 0): number | null {
  if (value === undefined || value === null || value === "") return fallback;
  const n = Math.round(Number(value));
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}
