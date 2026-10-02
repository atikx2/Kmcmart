import { NextRequest } from "next/server";
import { fail, guardAdmin } from "@/lib/admin-api";
import { refreshCourierStatuses } from "@/lib/admin-courier";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const denied = await guardAdmin("orders");
  if (denied) return denied;
  try {
    const body = (await req.json()) as { ids?: unknown };
    const ids = Array.isArray(body.ids) ? body.ids.map(Number) : [];
    const result = await refreshCourierStatuses(ids);
    if ("error" in result) return fail(result.error, result.status);
    return Response.json({ ok: true, ...result });
  } catch (e) {
    console.error(e);
    return fail("Could not refresh the courier status", 500);
  }
}
