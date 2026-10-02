import { NextRequest } from "next/server";
import { fail, guardAdmin, refreshStorefront, routeId } from "@/lib/admin-api";
import { deleteOrderStatus, updateOrderStatus } from "@/lib/admin-order-statuses";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const denied = await guardAdmin("delivery");
  if (denied) return denied;

  const id = routeId((await params).id);
  if (!id) return fail("Invalid status id");

  try {
    const result = await updateOrderStatus(id, await req.json());
    if ("error" in result) return fail(result.error, result.status);

    refreshStorefront("order-statuses");
    return Response.json({ ok: true, status: result });
  } catch (e) {
    console.error(e);
    return fail("Could not update the status", 500);
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const denied = await guardAdmin("delivery");
  if (denied) return denied;

  const id = routeId((await params).id);
  if (!id) return fail("Invalid status id");

  try {
    const result = await deleteOrderStatus(id);
    if ("error" in result) return fail(result.error, result.status);

    refreshStorefront("order-statuses");
    return Response.json({ ok: true });
  } catch (e) {
    console.error(e);
    return fail("Could not delete the status", 500);
  }
}
