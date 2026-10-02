import { NextRequest } from "next/server";
import { fail, guardAdmin } from "@/lib/admin-api";
import { testFraud } from "@/lib/admin-fraud";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const denied = await guardAdmin("api");
  if (denied) return denied;
  try {
    const body = await req.json().catch(() => ({}));
    const result = await testFraud(String((body as { phone?: unknown }).phone ?? ""));
    if ("error" in result) return fail(result.error, result.status);
    return Response.json(result);
  } catch (e) {
    console.error(e);
    return fail("Connection test failed", 500);
  }
}
