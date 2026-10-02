import type { Metadata } from "next";
import {
  CheckCircle2,
  FileText,
  Info,
  KeyRound,
  Link2,
  MessageSquare,
  ShieldAlert,
  Truck,
  Webhook,
} from "lucide-react";
import type { IconCmp } from "@/components/admin/table-ui";
import { requirePermission } from "@/lib/admin-guard";

export const metadata: Metadata = { title: "API · Admin" };
export const dynamic = "force-dynamic";

type Integration = {
  key: string;
  icon: IconCmp;
  title: string;
  tagline: string;
  providers: string[];
  willDo: string[];
  fields: { label: string; placeholder: string; icon: IconCmp }[];
};

const INTEGRATIONS: Integration[] = [
  {
    key: "courier",
    icon: Truck,
    title: "Courier API",
    tagline: "Push confirmed orders straight to the courier and pull delivery status back.",
    providers: ["Steadfast", "Pathao", "RedX", "eCourier"],
    willDo: [
      "Send selected orders as consignments in one click",
      "Store the consignment / tracking id on the order",
      "Auto-update status when the courier marks it delivered or returned",
    ],
    fields: [
      { label: "Base URL", placeholder: "https://portal.courier.com/api/v1", icon: Link2 },
      { label: "API key", placeholder: "••••••••••••••••", icon: KeyRound },
      { label: "Secret key", placeholder: "••••••••••••••••", icon: KeyRound },
    ],
  },
  {
    key: "fraud",
    icon: ShieldAlert,
    title: "Fraud Check API",
    tagline: "Look up a phone number's delivery / return history before confirming an order.",
    providers: ["BD Courier", "Fraud Checker BD"],
    willDo: [
      "Real courier-wide success ratio instead of the in-house score",
      "Risk badge on the order list and the order detail page",
      "Auto-flag repeat returners before you confirm",
    ],
    fields: [
      { label: "Base URL", placeholder: "https://api.fraudcheck.bd/v1", icon: Link2 },
      { label: "API token", placeholder: "••••••••••••••••", icon: KeyRound },
    ],
  },
  {
    key: "sms",
    icon: MessageSquare,
    title: "SMS API",
    tagline: "Order confirmation and delivery SMS to the customer, automatically.",
    providers: ["BulkSMSBD", "Alpha SMS", "MIMSMS"],
    willDo: [
      "SMS on order placed, confirmed, on the way and delivered",
      "Editable Bangla / English templates per status",
      "Balance + delivery report inside the panel",
    ],
    fields: [
      { label: "Base URL", placeholder: "https://api.smsprovider.com/sendsms", icon: Link2 },
      { label: "API key", placeholder: "••••••••••••••••", icon: KeyRound },
      { label: "Sender ID", placeholder: "KMCMART", icon: FileText },
    ],
  },
];

export default async function AdminApiPage() {
  await requirePermission("api");
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_4px_18px_rgba(17,18,28,0.05)] p-4 md:p-5">
        <div className="flex items-start gap-3">
          <span className="grad-bg text-white rounded-2xl p-2.5 shrink-0">
            <Webhook size={18} strokeWidth={2.3} />
          </span>
          <div className="min-w-0">
            <h2 className="font-display font-extrabold text-base md:text-lg flex flex-wrap items-center gap-2">
              Third-party integrations
              <span className="text-[9px] font-extrabold tracking-wider bg-gray-100 text-gray-500 px-2 py-1 rounded-md uppercase">
                Soon
              </span>
            </h2>
            <p className="text-[12.5px] font-semibold text-gray-500 mt-1 leading-relaxed">
              The layout below is the real thing — only the save buttons are switched off. Send the provider docs
              (endpoint, auth header, payload sample) and each card gets wired up one by one, without touching anything
              else in the panel.
            </p>
          </div>
        </div>

        <p className="mt-3.5 flex items-start gap-2 text-[11.5px] font-bold text-sky-700 bg-sky-50 border border-sky-100 rounded-2xl px-3.5 py-2.5">
          <Info size={14} className="shrink-0 mt-[1px]" />
          <span>
            Keys are never stored in the code — they go into environment variables, so a leaked repo cannot leak your
            courier account.
          </span>
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
        {INTEGRATIONS.map((it) => {
          const Icon = it.icon;
          return (
            <section
              key={it.key}
              className="bg-white rounded-3xl border border-gray-100 shadow-[0_4px_18px_rgba(17,18,28,0.05)] overflow-hidden flex flex-col"
            >
              <div className="flex items-center gap-3 px-4 md:px-5 py-4 border-b border-gray-100">
                <span className="w-10 h-10 rounded-2xl grad-soft grid place-items-center text-[var(--g2)] shrink-0">
                  <Icon size={17} strokeWidth={2.3} />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="font-display font-extrabold text-[15px] truncate">{it.title}</h3>
                  <p className="text-[10.5px] font-extrabold uppercase tracking-wider text-gray-400 mt-0.5">
                    Not connected
                  </p>
                </div>
                <span className="shrink-0 text-[9px] font-extrabold tracking-wider bg-gray-100 text-gray-500 px-2 py-1 rounded-md uppercase">
                  Soon
                </span>
              </div>

              <div className="p-4 md:p-5 space-y-4 flex-1">
                <p className="text-[12.5px] font-semibold text-gray-500 leading-relaxed">{it.tagline}</p>

                <div className="flex flex-wrap gap-1.5">
                  {it.providers.map((p) => (
                    <span
                      key={p}
                      className="text-[10.5px] font-extrabold text-gray-500 bg-[#fafafc] border border-gray-100 rounded-lg px-2 py-1"
                    >
                      {p}
                    </span>
                  ))}
                </div>

                <ul className="space-y-1.5">
                  {it.willDo.map((w) => (
                    <li key={w} className="flex items-start gap-2 text-[12px] font-semibold text-gray-600">
                      <CheckCircle2 size={13} className="text-emerald-500 shrink-0 mt-[2px]" />
                      <span className="min-w-0">{w}</span>
                    </li>
                  ))}
                </ul>

                <div className="space-y-2.5 pt-1">
                  {it.fields.map((f) => {
                    const FIcon = f.icon;
                    return (
                      <label key={f.label} className="block opacity-60">
                        <span className="block text-[10.5px] font-extrabold uppercase tracking-wider text-gray-400 mb-1.5">
                          {f.label}
                        </span>
                        <span className="relative block">
                          <FIcon
                            size={15}
                            strokeWidth={2.3}
                            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                          />
                          <input
                            disabled
                            placeholder={f.placeholder}
                            className="w-full rounded-xl border-[1.5px] border-gray-200 bg-[#f7f7fa] pl-10 pr-3.5 py-2.5 text-[12.5px] font-bold text-gray-500 cursor-not-allowed"
                          />
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="px-4 md:px-5 py-4 border-t border-gray-100">
                <button
                  disabled
                  className="w-full rounded-2xl py-3 text-[12.5px] font-extrabold text-gray-400 bg-gray-100 cursor-not-allowed"
                >
                  Save &amp; connect — waiting for docs
                </button>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
