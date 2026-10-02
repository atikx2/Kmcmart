import { fail, guardAdmin } from "@/lib/admin-api";
import { getCourierBalance } from "@/lib/admin-courier";

export const dynamic = "force-dynamic";

export async function GET() {
  const denied = await guardAdmin("api");
  if (denied) return denied;
  try {
    const result = await getCourierBalance();
    if ("error" in result) return fail(result.error, result.status);
    return Response.json({ ok: true, ...result });
  } catch (e) {
    console.error(e);
    return fail("Could not read the courier balance", 500);
  }
}
