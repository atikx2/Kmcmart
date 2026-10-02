import { NextRequest } from "next/server";
import { fail, guardAdmin, refreshStorefront } from "@/lib/admin-api";
import { createTrackingTag, listTrackingTags } from "@/lib/admin-tracking";

export const dynamic = "force-dynamic";

export async function GET() {
  const denied = await guardAdmin("api");
  if (denied) return denied;
  try {
    const { items, ready } = await listTrackingTags();
    return Response.json({ items, ready });
  } catch (e) {
    console.error(e);
    return fail("Failed to load the tags", 500);
  }
}

export async function POST(req: NextRequest) {
  const denied = await guardAdmin("api");
  if (denied) return denied;
  try {
    const result = await createTrackingTag(await req.json());
    if ("error" in result) return fail(result.error, result.status);
    refreshStorefront("tracking");
    return Response.json({ ok: true, item: result }, { status: 201 });
  } catch (e) {
    console.error(e);
    return fail("Could not save the tag", 500);
  }
}
