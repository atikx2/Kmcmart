import type { Metadata } from "next";
import { AlertTriangle } from "lucide-react";
import { getSettingsRow } from "@/lib/admin-settings";
import { requirePermission } from "@/lib/admin-guard";
import SettingsClient from "./SettingsClient";

export const metadata: Metadata = { title: "Site Settings · Admin" };
export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  await requirePermission("settings");
  const { row, error } = await getSettingsRow();

  if (!row) {
    return (
      <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_4px_18px_rgba(17,18,28,0.05)] p-5 md:p-6">
        <div className="flex items-start gap-3">
          <span className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 grid place-items-center shrink-0">
            <AlertTriangle size={18} strokeWidth={2.3} />
          </span>
          <div className="min-w-0">
            <h2 className="font-display font-extrabold text-base md:text-lg">Settings cannot load yet</h2>
            <p className="text-[12.5px] font-semibold text-gray-500 mt-1.5 leading-relaxed">{error}</p>
            <p className="text-[11.5px] font-bold text-gray-400 mt-3 leading-relaxed">
              The rest of the panel and the storefront keep working — this page is the only one that needs those
              columns.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return <SettingsClient initial={row} />;
}
