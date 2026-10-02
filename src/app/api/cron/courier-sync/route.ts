import { NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { fail } from "@/lib/admin-api";
import { getSessionAdmin } from "@/lib/admin-auth";
import { autoSyncEnabled, syncCourierStatuses } from "@/lib/admin-courier";
import { fillMissingFraudReports } from "@/lib/admin-fraud";

export const dynamic = "force-dynamic";

/**
 * Pulls delivery status for parcels that are still moving.
 *
 * Called by the Netlify scheduled function (see netlify/functions/courier-sync.mjs)
 * and by the "Sync now" button on the API page.
 */

function sameSecret(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  if (x.length !== y.length) return false;
  return timingSafeEqual(x, y);
}

/** The shared secret the cron presents, falling back the same way session signing does. */
function cronSecret(): string {
  return process.env.CRON_SECRET || process.env.AUTH_SECRET || "";
}

type Caller = "admin" | "cron" | "open" | null;

async function authorise(req: NextRequest): Promise<Caller> {
  if (await getSessionAdmin()) return "admin";

  const presented = req.headers.get("x-cron-key") ?? "";
  const expected = cronSecret();
  if (expected && presented && sameSecret(presented, expected)) return "cron";
  if (expected) return null;

  /* No secret is configured anywhere on this deployment. Rather than leave the
     sync silently dead, allow it — the throttle inside syncCourierStatuses
     caps the damage at one courier round-trip per minute, and the response
     carries counts only, never customer data. The panel nags for a
     CRON_SECRET so this is a visible state, not a hidden one. */
  return "open";
}

/**
 * Backstop for the fraud check. A new order starts its own lookup in the
 * background, but work scheduled after the response is not guaranteed on
 * every runtime, so we sweep up anything that slipped through while this
 * job is already awake.
 *
 * Deliberately independent of the courier: a shop with no courier connected
 * still gets its numbers checked. It can never fail the request either —
 * worst case it reports null.
 */
async function backfillFraud(): Promise<{ checked: number; failed: number } | null> {
  try {
    return await fillMissingFraudReports(8);
  } catch (e) {
    console.error("fraud backfill failed:", e);
    return null;
  }
}

async function run(req: NextRequest) {
  const caller = await authorise(req);
  if (!caller) return fail("Unauthorized", 401);

  if (caller !== "admin" && !(await autoSyncEnabled())) {
    /* Auto-sync off only silences the courier half of this job. */
    const fraud = await backfillFraud();
    return Response.json({ ok: true, skipped: "Auto-sync is switched off", caller, fraud });
  }

  const url = new URL(req.url);
  const limitParam = Number(url.searchParams.get("limit"));
  /* Only a signed-in admin pressing the button may bypass the 60s gap. */
  const force = caller === "admin" && url.searchParams.get("force") === "1";

  try {
    const [result, fraud] = await Promise.all([
      syncCourierStatuses({
        limit: Number.isFinite(limitParam) && limitParam > 0 ? limitParam : undefined,
        force,
      }),
      backfillFraud(),
    ]);

    /* An unconfigured courier must not swallow the fraud result — the two
       integrations are switched on independently. */
    if ("error" in result) {
      return Response.json({ ok: false, caller, courierError: result.error, fraud }, { status: 200 });
    }

    return Response.json({ ok: true, caller, ...result, fraud });
  } catch (e) {
    /* A cron caller must always get JSON back — an empty 500 tells the
       Netlify log nothing and tells the panel even less. */
    console.error("courier-sync failed:", e);
    return fail("Courier sync failed — see the server logs", 500);
  }
}

export async function GET(req: NextRequest) {
  return run(req);
}

export async function POST(req: NextRequest) {
  return run(req);
}
