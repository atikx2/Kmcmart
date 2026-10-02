import { eq } from "drizzle-orm";
import { db } from "@/db";
import { settings } from "@/db/schema";
import type { Settings } from "@/db/schema";
import { cleanOverrides, isLang, LEGACY_TEXT_COLUMNS, overrideKey, UI_TEXT } from "@/lib/i18n";
import { isMissingSchema } from "@/lib/pg-error";

export const ADMIN_MENU_MODES = ["expanded", "collapsed", "remember"] as const;
export type AdminMenuMode = (typeof ADMIN_MENU_MODES)[number];

export function isMenuMode(v: unknown): v is AdminMenuMode {
  return typeof v === "string" && (ADMIN_MENU_MODES as readonly string[]).includes(v);
}

/** Settings always live in a single row. */
/**
 * The editable row. Unlike the storefront copy this one does not paper over
 * a failure — the admin needs to be told that a migration is outstanding,
 * otherwise they would edit fields that silently cannot be saved.
 */
export async function getSettingsRow(): Promise<{ row: Settings | null; error: string }> {
  try {
    const rows = await db.select().from(settings).limit(1);
    if (!rows[0]) {
      return { row: null, error: "The settings table is empty — insert a row before editing." };
    }
    return { row: rows[0], error: "" };
  } catch (e) {
    if (isMissingSchema(e)) {
      return {
        row: null,
        error:
          "Your database is missing columns this page needs. Run the settings migration SQL (docs/sql/012-settings-step7.sql), then reload.",
      };
    }
    throw e;
  }
}

const HEX = /^#[0-9a-fA-F]{6}$/;

function str(v: unknown, max = 300): string {
  return String(v ?? "").trim().slice(0, max);
}

/** Only accepts a site-relative path, an https URL or an inline data URL. */
export function safeAsset(v: unknown, fallback = ""): string {
  const s = String(v ?? "").trim();
  if (s === "") return "";
  if (s.startsWith("data:image/")) return s;
  if (s.startsWith("/")) return s.slice(0, 2_000_000);
  if (/^https:\/\//i.test(s)) return s.slice(0, 2000);
  return fallback;
}

export type SettingsPatch = Partial<typeof settings.$inferInsert>;

/** Turns an untrusted PUT body into the columns we are willing to write. */
export function buildSettingsPatch(body: Record<string, unknown>, current: Settings): SettingsPatch {
  const u: SettingsPatch = {};

  if (body.siteName !== undefined) u.siteName = str(body.siteName, 80) || current.siteName;
  if (body.slogan !== undefined) u.slogan = str(body.slogan, 300);
  if (body.metaTitle !== undefined) u.metaTitle = str(body.metaTitle, 160);
  if (body.metaDescription !== undefined) u.metaDescription = str(body.metaDescription, 300);

  if (body.phone !== undefined) u.phone = str(body.phone, 40);
  if (body.email !== undefined) u.email = str(body.email, 120);
  if (body.address !== undefined) u.address = str(body.address, 300);
  for (const k of ["facebook", "instagram", "youtube", "whatsapp"] as const) {
    if (body[k] !== undefined) {
      const v = str(body[k], 300);
      u[k] = v === "" ? "#" : v;
    }
  }

  if (body.colorFrom !== undefined && HEX.test(String(body.colorFrom))) u.colorFrom = String(body.colorFrom);
  if (body.colorTo !== undefined && HEX.test(String(body.colorTo))) u.colorTo = String(body.colorTo);

  if (body.logoMode !== undefined) u.logoMode = body.logoMode === "text" ? "text" : "image";
  if (body.logoText !== undefined) u.logoText = str(body.logoText, 40);
  if (body.logoHeader !== undefined) u.logoHeader = safeAsset(body.logoHeader, current.logoHeader);
  if (body.logoFooter !== undefined) u.logoFooter = safeAsset(body.logoFooter, current.logoFooter);
  if (body.favicon !== undefined) u.favicon = safeAsset(body.favicon, current.favicon);

  if (body.language !== undefined && isLang(body.language)) u.language = body.language;
  if (body.adminMenuMode !== undefined && isMenuMode(body.adminMenuMode)) u.adminMenuMode = body.adminMenuMode;

  if (body.textOverrides !== undefined) {
    const overrides = cleanOverrides(body.textOverrides);
    u.textOverrides = overrides;

    /* Mirror the four strings that still have their own columns, so anything
       reading them directly keeps matching what the storefront shows. */
    for (const [column, key] of Object.entries(LEGACY_TEXT_COLUMNS)) {
      const v = overrides[overrideKey("en", key)];
      (u as Record<string, unknown>)[column] = v ?? UI_TEXT[key].en;
    }
  }

  return u;
}

export async function saveSettings(patch: SettingsPatch, id: number): Promise<Settings> {
  const [row] = await db.update(settings).set(patch).where(eq(settings.id, id)).returning();
  return row;
}
