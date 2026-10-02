import { NextRequest } from "next/server";
import { fail, guardAdmin, refreshStorefront } from "@/lib/admin-api";
import { buildSettingsPatch, getSettingsRow, saveSettings } from "@/lib/admin-settings";

export const dynamic = "force-dynamic";

export async function GET() {
  const denied = await guardAdmin("settings");
  if (denied) return denied;
  try {
    const { row, error } = await getSettingsRow();
    if (!row) return fail(error || "Settings row is missing", 503);
    return Response.json({ settings: row });
  } catch (e) {
    console.error(e);
    return fail("Failed to load settings", 500);
  }
}

export async function PUT(req: NextRequest) {
  const denied = await guardAdmin("settings");
  if (denied) return denied;

  try {
    const { row: current, error } = await getSettingsRow();
    if (!current) return fail(error || "Settings row is missing", 503);

    const body = (await req.json()) as Record<string, unknown>;
    const patch = buildSettingsPatch(body, current);
    if (Object.keys(patch).length === 0) return fail("Nothing to update");

    const saved = await saveSettings(patch, current.id);
    await refreshStorefront("settings");

    return Response.json({ ok: true, settings: saved });
  } catch (e) {
    console.error(e);
    return fail("Could not save the settings", 500);
  }
}
