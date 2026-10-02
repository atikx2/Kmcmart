"use client";

import { useState } from "react";
import { CircleDot, MapPin } from "lucide-react";
import type { AdminArea } from "@/lib/site-content";
import type { OrderStatusOption } from "@/lib/order-status";
import type { IconCmp } from "@/components/admin/table-ui";
import AreasClient from "./AreasClient";
import StatusesClient from "./StatusesClient";

export type TabKey = "areas" | "statuses";

const TABS: { key: TabKey; label: string; icon: IconCmp }[] = [
  { key: "areas", label: "Delivery Areas", icon: MapPin },
  { key: "statuses", label: "Order Status", icon: CircleDot },
];

export default function DeliveryTabs({
  areas,
  statuses,
  statusesReady,
  initialTab = "areas",
}: {
  areas: AdminArea[];
  statuses: OrderStatusOption[];
  statusesReady: boolean;
  initialTab?: TabKey;
}) {
  const [tab, setTab] = useState<TabKey>(initialTab);
  const counts: Record<TabKey, number> = { areas: areas.length, statuses: statuses.length };

  /* Keep the tab in the URL so a reload / shared link lands in the same place,
     without a server round-trip (the page is force-dynamic). */
  const select = (key: TabKey) => {
    setTab(key);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (key === "areas") url.searchParams.delete("tab");
      else url.searchParams.set("tab", "status");
      window.history.replaceState(null, "", url.toString());
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_4px_18px_rgba(17,18,28,0.05)] p-3 md:p-4">
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-0.5">
          {TABS.map(({ key, label, icon: Icon }) => {
            const active = tab === key;
            return (
              <button
                key={key}
                onClick={() => select(key)}
                className={`shrink-0 flex items-center gap-2 rounded-2xl px-3.5 md:px-4 py-2.5 text-[12.5px] font-extrabold transition-all ${
                  active
                    ? "grad-bg text-white shadow-[0_8px_22px_rgba(255,61,119,0.3)]"
                    : "bg-gray-50 text-gray-500 hover:bg-gray-100"
                }`}
              >
                <Icon size={15} className={active ? "text-white" : "text-gray-400"} />
                {label}
                <span
                  className={`min-w-[22px] h-5 px-1.5 rounded-full grid place-items-center text-[10.5px] font-extrabold ${
                    active ? "bg-white/25 text-white" : "bg-white text-gray-400 border border-gray-200"
                  }`}
                >
                  {counts[key]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {tab === "areas" ? (
        <AreasClient initial={areas} />
      ) : (
        <StatusesClient initial={statuses} ready={statusesReady} />
      )}
    </div>
  );
}
