import { NextRequest } from "next/server";
import { fail, guardAdmin } from "@/lib/admin-api";
import { checkPhone, getFraudReport, isFraudError } from "@/lib/admin-fraud";

export const dynamic = "force-dynamic";

/** Cached report for a phone. Used by the score popup on the orders page. */
export async function GET(req: NextRequest) {
  const denied = await guardAdmin("orders");
  if (denied) return denied;
  const phone = new URL(req.url).searchParams.get("phone") ?? "";
  try {
    const report = await getFraudReport(phone);
    return Response.json({ ok: true, report });
  } catch (e) {
    console.error(e);
    return fail("Could not read the report", 500);
  }
}

/** Force a fresh lookup — the Re-check button. */
export async function POST(req: NextRequest) {
  const denied = await guardAdmin("orders");
  if (denied) return denied;
  try {
    const body = await req.json().catch(() => ({}));
    const result = await checkPhone(String((body as { phone?: unknown }).phone ?? ""), { force: true });
    if (isFraudError(result)) return fail(result.error, result.status);
    return Response.json({ ok: true, report: result });
  } catch (e) {
    console.error(e);
    return fail("Fraud check failed", 500);
  }
}
