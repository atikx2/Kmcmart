import { NextRequest } from "next/server";
import { getSessionAdmin } from "@/lib/admin-auth";
import { listAdminOrders, ORDERS_PAGE_SIZE } from "@/lib/admin-orders";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const admin = await getSessionAdmin();
  if (!admin) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const sp = req.nextUrl.searchParams;
    const data = await listAdminOrders({
      status: sp.get("status"),
      q: sp.get("q"),
      offset: parseInt(sp.get("offset") || "0", 10) || 0,
      limit: parseInt(sp.get("limit") || String(ORDERS_PAGE_SIZE), 10) || ORDERS_PAGE_SIZE,
    });
    return Response.json(data);
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Failed to load orders" }, { status: 500 });
  }
}
