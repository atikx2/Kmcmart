import { NextRequest } from "next/server";
import { fail, guardAdmin } from "@/lib/admin-api";
import { CUSTOMERS_PAGE_SIZE, listAdminCustomers } from "@/lib/admin-customers";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const denied = await guardAdmin("customers");
  if (denied) return denied;

  try {
    const sp = req.nextUrl.searchParams;
    const data = await listAdminCustomers({
      q: sp.get("q") ?? "",
      offset: Number(sp.get("offset") ?? 0) || 0,
      limit: Number(sp.get("limit") ?? CUSTOMERS_PAGE_SIZE) || CUSTOMERS_PAGE_SIZE,
    });
    return Response.json(data);
  } catch (e) {
    console.error(e);
    return fail("Failed to load customers", 500);
  }
}
