import { asc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { admins } from "@/db/schema";
import { ALL_PERMISSIONS, type AdminAccount, type PermissionKey } from "@/lib/permissions";

export * from "@/lib/permissions";

const DATE_FMT = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "Asia/Dhaka",
});

/** The first admin ever created. Never deletable, never demoted. */
export async function getOwnerId(): Promise<number> {
  const rows = await db.select({ id: sql<number>`min(${admins.id})::int` }).from(admins);
  return rows[0]?.id ?? 0;
}

export async function listAdminAccounts(currentId: number): Promise<AdminAccount[]> {
  const [rows, ownerId] = await Promise.all([
    db.select().from(admins).orderBy(asc(admins.id)),
    getOwnerId(),
  ]);

  return rows.map((a) => {
    const isOwner = a.id === ownerId;
    return {
      id: a.id,
      name: a.name || a.email.split("@")[0],
      email: a.email,
      role: isOwner ? "owner" : a.role,
      permissions: isOwner ? [...ALL_PERMISSIONS] : a.permissions,
      isActive: isOwner ? true : a.isActive,
      isOwner,
      createdAt: DATE_FMT.format(a.createdAt),
      isSelf: a.id === currentId,
    };
  });
}

export async function emailTaken(email: string, exceptId?: number): Promise<boolean> {
  const rows = await db.select({ id: admins.id }).from(admins).where(eq(admins.email, email)).limit(2);
  return rows.some((r) => r.id !== exceptId);
}

/** Keeps the stored list to known keys only. */
export function cleanPermissions(input: unknown): PermissionKey[] {
  if (!Array.isArray(input)) return [];
  const set = new Set(input.map(String));
  return ALL_PERMISSIONS.filter((k) => set.has(k));
}
