import type { Metadata } from "next";
import { getSettingsRow } from "@/lib/admin-settings";
import { requirePermission } from "@/lib/admin-guard";
import SettingsClient from "./SettingsClient";

export const metadata: Metadata = { title: "Site Settings · Admin" };
export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  await requirePermission("settings");
  return <SettingsClient initial={await getSettingsRow()} />;
}
