import { fail, guardAdmin } from "@/lib/admin-api";
import { testCourier } from "@/lib/admin-courier";

export const dynamic = "force-dynamic";

/** POST, not GET: it spends two courier requests and writes the result back. */
export async function POST() {
  const denied = await guardAdmin("api");
  if (denied) return denied;
  try {
    const result = await testCourier();
    if ("error" in result) return fail(result.error, result.status);
    return Response.json({ ok: result.authenticated, ...result });
  } catch (e) {
    console.error(e);
    return fail("Connection test failed", 500);
  }
}
