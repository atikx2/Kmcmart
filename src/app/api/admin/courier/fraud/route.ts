import { NextRequest } from "next/server";
import { fail, guardAdmin } from "@/lib/admin-api";
import { courierFraudCheck } from "@/lib/admin-courier";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const denied = await guardAdmin("orders");
  if (denied) return denied;
  try {
    const phone = req.nextUrl.searchParams.get("phone") ?? "";
    const result = await courierFraudCheck(phone);
    if ("error" in result) return fail(result.error, result.status);
    return Response.json({ ok: true, report: result });
  } catch (e) {
    console.error(e);
    return fail("Fraud check failed", 500);
  }
}
