import { NextRequest } from "next/server";
import { fail, guardAdmin, refreshStorefront } from "@/lib/admin-api";
import { createOrderStatus, loadOrderStatuses } from "@/lib/admin-order-statuses";

export const dynamic = "force-dynamic";

export async function GET() {
  const denied = await guardAdmin("delivery");
  if (denied) return denied;
  try {
    const { items, ready } = await loadOrderStatuses();
    return Response.json({ items, ready });
  } catch (e) {
    console.error(e);
    return fail("Failed to load order statuses", 500);
  }
}

export async function POST(req: NextRequest) {
  const denied = await guardAdmin("delivery");
  if (denied) return denied;
  try {
    const result = await createOrderStatus(await req.json());
    if ("error" in result) return fail(result.error, result.status);

    refreshStorefront("order-statuses");
    return Response.json({ ok: true, status: result }, { status: 201 });
  } catch (e) {
    console.error(e);
    return fail("Could not add the status", 500);
  }
}
