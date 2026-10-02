import { asc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { orderStatuses, orders } from "@/db/schema";
import {
  DEFAULT_ORDER_STATUSES,
  ORDER_STATUSES,
  STATUS_LABEL_MAX,
  STATUS_LABEL_MIN,
  isHexColor,
  normalizeHex,
  slugifyStatusKey,
  type OrderStatusOption,
} from "@/lib/order-status";

/* Server-only helpers. Client components import "@/lib/order-status". */
export * from "@/lib/order-status";

/** Keys the admin may never take — they would collide with the "All" tab. */
const RESERVED_KEYS = new Set(["all", "none", "null", "undefined"]);

/** Names that would read as a second "All" tab on the Orders page. */
const RESERVED_LABELS = new Set(["all", "সব", "সকল"]);

export type OrderStatusState = {
  items: OrderStatusOption[];
  /** false = the `order_statuses` table does not exist yet (SQL not run). */
  ready: boolean;
};

function isMissingTable(e: unknown): boolean {
  /* 42P01 = undefined_table. Until the migration SQL runs on the live DB the
     storefront and the admin must keep working on the built-in defaults.
     Drizzle wraps the pg error, so walk the cause chain. */
  let cur: unknown = e;
  for (let i = 0; i < 5 && cur; i++) {
    if (typeof cur === "object" && (cur as { code?: string }).code === "42P01") return true;
    cur = (cur as { cause?: unknown }).cause;
  }
  return false;
}

/** Reads the table, falling back to the shipped defaults when it is missing. */
export async function loadOrderStatuses(): Promise<OrderStatusState> {
  try {
    const rows = await db
      .select()
      .from(orderStatuses)
      .orderBy(asc(orderStatuses.sortOrder), asc(orderStatuses.id));
    if (rows.length === 0) return { items: DEFAULT_ORDER_STATUSES, ready: true };
    return { items: rows, ready: true };
  } catch (e) {
    if (isMissingTable(e)) return { items: DEFAULT_ORDER_STATUSES, ready: false };
    throw e;
  }
}

/** Convenience wrapper for pages that only need the list. */
export async function listOrderStatuses(): Promise<OrderStatusOption[]> {
  return (await loadOrderStatuses()).items;
}

/** True when `key` is a status the store actually knows about. */
export async function isKnownOrderStatus(key: unknown): Promise<boolean> {
  if (typeof key !== "string" || !key) return false;
  const { items } = await loadOrderStatuses();
  return items.some((s) => s.key === key);
}

/* ------------------------------------------------------------------ */
/* mutations                                                           */
/* ------------------------------------------------------------------ */

export type StatusMutationError = { error: string; status: number };

function labelError(label: string): string | null {
  if (label.length < STATUS_LABEL_MIN) return `Status name must be at least ${STATUS_LABEL_MIN} characters`;
  if (label.length > STATUS_LABEL_MAX) return `Status name must be ${STATUS_LABEL_MAX} characters or less`;
  if (RESERVED_LABELS.has(label.toLowerCase())) return `“${label}” is reserved for the All tab — pick another name`;
  return null;
}

/**
 * Storage key for a new label. Bangla / emoji-only names slug to nothing, so
 * they fall back to `status_2`, `status_3`, … — the key is internal plumbing,
 * the label is what everyone actually sees.
 */
function uniqueKeyFor(label: string, taken: Set<string>): string {
  const slug = slugifyStatusKey(label);
  const base = slug.length >= 2 && !RESERVED_KEYS.has(slug) ? slug : "";
  if (base && !taken.has(base)) return base;
  const stem = base || "status";
  for (let i = 2; i < 999; i++) {
    const candidate = `${stem}_${i}`;
    if (!taken.has(candidate)) return candidate;
  }
  return `${stem}_${Date.now().toString(36)}`;
}

export async function createOrderStatus(body: {
  label?: unknown;
  color?: unknown;
  sortOrder?: unknown;
}): Promise<OrderStatusOption | StatusMutationError> {
  const label = String(body.label ?? "").trim();
  const bad = labelError(label);
  if (bad) return { error: bad, status: 400 };

  if (!isHexColor(body.color)) return { error: "Pick a colour first", status: 400 };
  const color = normalizeHex(String(body.color));

  /* The table is tiny — read it once and do both uniqueness checks in memory. */
  const rows = await db.select({ key: orderStatuses.key, label: orderStatuses.label }).from(orderStatuses);
  if (rows.some((r) => r.label.trim().toLowerCase() === label.toLowerCase())) {
    return { error: `A status named “${label}” already exists`, status: 409 };
  }
  const key = uniqueKeyFor(label, new Set(rows.map((r) => r.key)));

  const n = Math.round(Number(body.sortOrder ?? 0));
  const sortOrder = Number.isFinite(n) && n >= 0 ? n : 0;

  const [created] = await db
    .insert(orderStatuses)
    .values({ key, label, color, sortOrder, isSystem: false, isActive: true })
    .returning();
  return created;
}

export async function updateOrderStatus(
  id: number,
  body: { label?: unknown; color?: unknown; sortOrder?: unknown; isActive?: unknown }
): Promise<OrderStatusOption | StatusMutationError> {
  const rows = await db.select().from(orderStatuses).where(eq(orderStatuses.id, id)).limit(1);
  const row = rows[0];
  if (!row) return { error: "Status not found", status: 404 };

  const patch: Partial<typeof orderStatuses.$inferInsert> = {};

  if (body.label !== undefined) {
    const label = String(body.label).trim();
    const bad = labelError(label);
    if (bad) return { error: bad, status: 400 };
    const siblings = await db.select({ id: orderStatuses.id, label: orderStatuses.label }).from(orderStatuses);
    if (siblings.some((r) => r.id !== id && r.label.trim().toLowerCase() === label.toLowerCase())) {
      return { error: `A status named “${label}” already exists`, status: 409 };
    }
    patch.label = label;
  }

  if (body.color !== undefined) {
    if (!isHexColor(body.color)) return { error: "Colour must be a hex value like #FF7A00", status: 400 };
    patch.color = normalizeHex(String(body.color));
  }

  if (body.sortOrder !== undefined) {
    const n = Math.round(Number(body.sortOrder));
    if (!Number.isFinite(n) || n < 0) return { error: "Sort order must be 0 or more", status: 400 };
    patch.sortOrder = n;
  }

  if (body.isActive !== undefined) {
    const next = Boolean(body.isActive);
    if (!next && row.isSystem) {
      return { error: `“${row.label}” is a built-in status and is always live`, status: 403 };
    }
    patch.isActive = next;
  }

  if (Object.keys(patch).length === 0) return { error: "Nothing to update", status: 400 };

  const [updated] = await db.update(orderStatuses).set(patch).where(eq(orderStatuses.id, id)).returning();
  return updated;
}

export async function deleteOrderStatus(id: number): Promise<{ ok: true } | StatusMutationError> {
  const rows = await db.select().from(orderStatuses).where(eq(orderStatuses.id, id)).limit(1);
  const row = rows[0];
  if (!row) return { error: "Status not found", status: 404 };
  if (row.isSystem) {
    return { error: `“${row.label}” is a built-in status and cannot be deleted`, status: 403 };
  }

  const [used] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(orders)
    .where(eq(orders.status, row.key));
  if ((used?.n ?? 0) > 0) {
    return {
      error: `${used.n} order(s) still use “${row.label}” — move them to another status first`,
      status: 409,
    };
  }

  await db.delete(orderStatuses).where(eq(orderStatuses.id, id));
  return { ok: true };
}

/**
 * Inserts the four built-in rows when they are missing. Safe to call twice —
 * it never touches a row that already exists.
 */
export async function ensureSystemStatuses(): Promise<void> {
  const present = new Set((await db.select({ key: orderStatuses.key }).from(orderStatuses)).map((r) => r.key));
  const missing = DEFAULT_ORDER_STATUSES.filter((s) => !present.has(s.key)).map((s) => ({
    key: s.key,
    label: s.label,
    color: s.color,
    sortOrder: s.sortOrder,
    isSystem: true,
    isActive: true,
  }));
  if (missing.length > 0) await db.insert(orderStatuses).values(missing);
}

/** Exported so the seed script and tests share one source of truth. */
export const SYSTEM_STATUS_KEYS: readonly string[] = ORDER_STATUSES;
