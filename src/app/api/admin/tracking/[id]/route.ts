import { NextRequest } from "next/server";
import { fail, guardAdmin, refreshStorefront } from "@/lib/admin-api";
import { deleteTrackingTag, updateTrackingTag } from "@/lib/admin-tracking";

export const dynamic = "force-dynamic";

async function readId(ctx: { params: Promise<{ id: string }> }): Promise<number | null> {
  const { id } = await ctx.params;
  const n = Number(id);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = await guardAdmin("api");
  if (denied) return denied;
  const id = await readId(ctx);
  if (!id) return fail("Invalid id", 400);
  try {
    const result = await updateTrackingTag(id, await req.json());
    if ("error" in result) return fail(result.error, result.status);
    refreshStorefront("tracking");
    return Response.json({ ok: true, item: result });
  } catch (e) {
    console.error(e);
    return fail("Could not update the tag", 500);
  }
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = await guardAdmin("api");
  if (denied) return denied;
  const id = await readId(ctx);
  if (!id) return fail("Invalid id", 400);
  try {
    const result = await deleteTrackingTag(id);
    if ("error" in result) return fail(result.error, result.status);
    refreshStorefront("tracking");
    return Response.json({ ok: true });
  } catch (e) {
    console.error(e);
    return fail("Could not remove the tag", 500);
  }
}
