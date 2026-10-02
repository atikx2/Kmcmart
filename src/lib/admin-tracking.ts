import { isMissingTable } from "@/lib/pg-error";
import { unstable_cache } from "next/cache";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { trackingTags } from "@/db/schema";
import {
  cleanTagId,
  providerInfo,
  tagIdError,
  type TrackingProvider,
  type TrackingTagPublic,
} from "@/lib/tracking";

export * from "@/lib/tracking";

export type TrackingError = { error: string; status: number };


function toPublic(row: typeof trackingTags.$inferSelect): TrackingTagPublic {
  return {
    id: row.id,
    provider: row.provider as TrackingProvider,
    label: row.label,
    tagId: row.tagId,
    isActive: row.isActive,
    sortOrder: row.sortOrder,
  };
}

export async function listTrackingTags(): Promise<{ items: TrackingTagPublic[]; ready: boolean }> {
  try {
    const rows = await db
      .select()
      .from(trackingTags)
      .orderBy(asc(trackingTags.sortOrder), asc(trackingTags.id));
    return { items: rows.map(toPublic), ready: true };
  } catch (e) {
    if (isMissingTable(e)) return { items: [], ready: false };
    throw e;
  }
}

/**
 * Tags for the storefront. Cached because this runs on every page render;
 * `refreshStorefront("tracking")` clears it the moment the owner changes one.
 */
export const getActiveTrackingTags = unstable_cache(
  async (): Promise<TrackingTagPublic[]> => {
    try {
      const rows = await db
        .select()
        .from(trackingTags)
        .where(eq(trackingTags.isActive, true))
        .orderBy(asc(trackingTags.sortOrder), asc(trackingTags.id));
      return rows.map(toPublic);
    } catch (e) {
      /* Analytics must never be the reason a shop page fails to render. */
      if (isMissingTable(e)) return [];
      console.error("tracking tags unavailable:", e);
      return [];
    }
  },
  ["tracking-tags"],
  { revalidate: 300, tags: ["tracking"] }
);

export async function createTrackingTag(body: {
  provider?: unknown;
  label?: unknown;
  tagId?: unknown;
}): Promise<TrackingTagPublic | TrackingError> {
  const provider = String(body.provider ?? "").trim();
  if (!providerInfo(provider)) return { error: "Pick what kind of tag this is", status: 400 };

  const tagId = cleanTagId(provider, String(body.tagId ?? ""));
  const bad = tagIdError(provider, tagId);
  if (bad) return { error: bad, status: 400 };

  const label = String(body.label ?? "").trim().slice(0, 60);

  try {
    /* The same id twice would fire every event twice. */
    const existing = await db
      .select({ id: trackingTags.id })
      .from(trackingTags)
      .where(eq(trackingTags.tagId, tagId))
      .limit(1);
    if (existing[0]) return { error: "That tag is already added", status: 409 };

    const [row] = await db
      .insert(trackingTags)
      .values({ provider, tagId, label, isActive: true, sortOrder: 0 })
      .returning();
    return toPublic(row);
  } catch (e) {
    if (isMissingTable(e)) {
      return { error: "Tracking table is missing — run the migration SQL first", status: 503 };
    }
    throw e;
  }
}

export async function updateTrackingTag(
  id: number,
  body: { label?: unknown; isActive?: unknown; tagId?: unknown }
): Promise<TrackingTagPublic | TrackingError> {
  const patch: Partial<typeof trackingTags.$inferInsert> = {};

  if (body.label !== undefined) patch.label = String(body.label).trim().slice(0, 60);
  if (body.isActive !== undefined) patch.isActive = Boolean(body.isActive);

  if (body.tagId !== undefined) {
    const current = await db
      .select({ provider: trackingTags.provider })
      .from(trackingTags)
      .where(eq(trackingTags.id, id))
      .limit(1);
    if (!current[0]) return { error: "Tag not found", status: 404 };
    const tagId = cleanTagId(current[0].provider, String(body.tagId));
    const bad = tagIdError(current[0].provider, tagId);
    if (bad) return { error: bad, status: 400 };
    patch.tagId = tagId;
  }

  if (Object.keys(patch).length === 0) return { error: "Nothing to update", status: 400 };

  const [row] = await db.update(trackingTags).set(patch).where(eq(trackingTags.id, id)).returning();
  if (!row) return { error: "Tag not found", status: 404 };
  return toPublic(row);
}

export async function deleteTrackingTag(id: number): Promise<{ ok: true } | TrackingError> {
  const [row] = await db.delete(trackingTags).where(eq(trackingTags.id, id)).returning({ id: trackingTags.id });
  if (!row) return { error: "Tag not found", status: 404 };
  return { ok: true };
}
