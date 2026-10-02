import { NextRequest } from "next/server";
import { fail, guardAdmin } from "@/lib/admin-api";
import { sendOrdersToCourier } from "@/lib/admin-courier";

export const dynamic = "force-dynamic";

/**
 * Booking parcels is an order action, so it needs the `orders` permission —
 * a manager can dispatch without being able to see the API credentials.
 */
export async function POST(req: NextRequest) {
  const denied = await guardAdmin("orders");
  if (denied) return denied;
  try {
    const body = (await req.json()) as { ids?: unknown };
    const ids = Array.isArray(body.ids) ? body.ids.map(Number) : [];
    const result = await sendOrdersToCourier(ids);
    if ("error" in result) return fail(result.error, result.status);

    const sent = result.results.filter((r) => r.ok).length;
    return Response.json({ ok: sent > 0, sent, failed: result.results.length - sent, results: result.results });
  } catch (e) {
    console.error(e);
    return fail("Could not send to the courier", 500);
  }
}
