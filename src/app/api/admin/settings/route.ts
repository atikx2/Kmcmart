import { NextRequest } from "next/server";
import { fail, guardAdmin, refreshStorefront } from "@/lib/admin-api";
import { buildSettingsPatch, getSettingsRow, saveSettings } from "@/lib/admin-settings";

export const dynamic = "force-dynamic";

export async function GET() {
  const denied = await guardAdmin("settings");
  if (denied) return denied;
  try {
    return Response.json({ settings: await getSettingsRow() });
  } catch (e) {
    console.error(e);
    return fail("Failed to load settings", 500);
  }
}

export async function PUT(req: NextRequest) {
  const denied = await guardAdmin("settings");
  if (denied) return denied;

  try {
    const current = await getSettingsRow();
    if (!current) return fail("Settings row is missing", 404);

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
