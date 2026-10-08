import type { Metadata } from "next";
import { CheckCircle2, FileText, Info, KeyRound, Link2, MessageSquare, Wallet, Webhook } from "lucide-react";
import type { IconCmp } from "@/components/admin/table-ui";
import { requirePermission } from "@/lib/admin-guard";
import {
  authSecretIsSet,
  courierPendingCount,
  courierSummary,
  loadCourierConfig,
  toPublicConfig,
} from "@/lib/admin-courier";
import { fraudSummary, loadFraudConfig, toPublicFraudConfig } from "@/lib/admin-fraud";
import { listTrackingTags } from "@/lib/admin-tracking";
import { listOrderStatuses } from "@/lib/admin-order-statuses";
import CourierClient from "./CourierClient";
import FraudClient from "./FraudClient";
import TrackingClient from "./TrackingClient";
import MetaCapiClient from "./MetaCapiClient";
import ApiTabs from "./ApiTabs";
import { listMetaPixels } from "@/lib/meta-capi";

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

/** Still waiting on provider docs — the courier card above is the live one. */
const SOON: Integration[] = [
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
  {
    key: "payment",
    icon: Wallet,
    title: "Payment Gateway",
    tagline: "Take payment online instead of cash on delivery.",
    providers: ["bKash", "Nagad", "SSLCommerz", "ShurjoPay"],
    willDo: [
      "Pay-now option beside cash on delivery at checkout",
      "Payment status stored on the order",
      "Automatic refund request on a cancelled order",
    ],
    fields: [
      { label: "Base URL", placeholder: "https://tokenized.pay.bka.sh/v1.2.0-beta", icon: Link2 },
      { label: "App key", placeholder: "••••••••••••••••", icon: KeyRound },
      { label: "App secret", placeholder: "••••••••••••••••", icon: KeyRound },
    ],
  },
];

export default async function AdminApiPage() {
  await requirePermission("api");

  const [{ row, ready }, statuses, summary, pendingParcels, fraud, fraudStats, tracking, metaPixels] = await Promise.all([
    loadCourierConfig(),
    listOrderStatuses(),
    courierSummary(),
    courierPendingCount(),
    loadFraudConfig(),
    fraudSummary(),
    listTrackingTags(),
    listMetaPixels(),
  ]);

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_4px_18px_rgba(17,18,28,0.05)] p-4 md:p-5">
        <div className="flex items-start gap-3">
          <span className="grad-bg text-white rounded-2xl p-2.5 shrink-0">
            <Webhook size={18} strokeWidth={2.3} />
          </span>
          <div className="min-w-0">
            <h2 className="font-display font-extrabold text-base md:text-lg">Third-party integrations</h2>
            <p className="text-[12.5px] font-semibold text-gray-500 mt-1 leading-relaxed">
              The courier, the fraud check and your marketing tags are live here. Send the docs for any other
              provider and its card gets wired up the same way, without touching anything else in the panel.
            </p>
          </div>
        </div>

        <p className="mt-3.5 flex items-start gap-2 text-[11.5px] font-bold text-sky-700 bg-sky-50 border border-sky-100 rounded-2xl px-3.5 py-2.5">
          <Info size={14} className="shrink-0 mt-[1px]" />
          <span>
            Keys are never written into the code. They are typed here, encrypted, and stored in your own database — a
            leaked repository cannot leak your courier account.
          </span>
        </p>
      </div>

      <ApiTabs panels={{
        courier: <CourierClient initial={toPublicConfig(row)} ready={ready} statuses={statuses} summary={summary} authSecretSet={authSecretIsSet()} cronSecretSet={Boolean(process.env.CRON_SECRET || process.env.AUTH_SECRET)} pendingParcels={pendingParcels} />,
        fraud: <FraudClient initial={toPublicFraudConfig(fraud.row)} ready={fraud.ready} summary={fraudStats} />,
        meta: <MetaCapiClient initial={metaPixels} />,
        tags: <TrackingClient initial={tracking.items} ready={tracking.ready} />,
        other: <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">{SOON.map((it) => { const Icon = it.icon; return <section key={it.key} className="bg-white rounded-3xl border border-gray-100 p-5"><h3 className="font-display font-extrabold">{it.title}</h3><p className="text-xs text-gray-400 mt-1">{it.tagline}</p><span className="inline-block mt-3 text-[10px] font-extrabold bg-gray-100 text-gray-500 px-2 py-1 rounded-md">SOON</span></section>; })}</div>,
      }} />

    </div>
  );
}
