import { NextRequest } from "next/server";
import { fail, guardAdmin } from "@/lib/admin-api";
import { loadFraudConfig, saveFraudConfig, toPublicFraudConfig } from "@/lib/admin-fraud";

export const dynamic = "force-dynamic";

export async function GET() {
  const denied = await guardAdmin("api");
  if (denied) return denied;
  try {
    const { row, ready } = await loadFraudConfig();
    return Response.json({ config: toPublicFraudConfig(row), ready });
  } catch (e) {
    console.error(e);
    return fail("Failed to load the fraud settings", 500);
  }
}

export async function PUT(req: NextRequest) {
  const denied = await guardAdmin("api");
  if (denied) return denied;
  try {
    const result = await saveFraudConfig(await req.json());
    if ("error" in result) return fail(result.error, result.status);
    return Response.json({ ok: true, config: result });
  } catch (e) {
    console.error(e);
    return fail("Could not save the fraud settings", 500);
  }
}
