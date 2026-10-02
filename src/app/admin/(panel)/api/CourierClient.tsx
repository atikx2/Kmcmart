"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  BadgeCheck,
  Check,
  Eye,
  EyeOff,
  Info,
  KeyRound,
  Link2,
  Loader2,
  PackageCheck,
  PlugZap,
  RefreshCw,
  Trash2,
  Truck,
  Wallet,
  X,
} from "lucide-react";
import { taka } from "@/lib/format";
import { COURIER_DEFAULT_BASE, courierBaseError, type CourierConfigPublic } from "@/lib/courier";
import type { OrderStatusOption } from "@/lib/order-status";
import ConfirmModal from "@/components/admin/ConfirmModal";
import Toast, { useToast } from "@/components/admin/Toast";
import { StatChip } from "@/components/admin/table-ui";

function Field({
  label,
  icon: Icon,
  children,
  hint,
}: {
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label className="block min-w-0">
      <span className="block text-[10.5px] font-extrabold uppercase tracking-wider text-gray-500 mb-1.5">{label}</span>
      <span className="relative block">
        <Icon size={15} strokeWidth={2.3} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        {children}
      </span>
      {hint && <span className="block mt-1.5 text-[10.5px] font-bold text-gray-400">{hint}</span>}
    </label>
  );
}

const INPUT =
  "w-full rounded-xl border-[1.5px] border-gray-200 bg-white pl-10 pr-10 py-2.5 text-[12.5px] font-bold outline-none focus:border-[var(--g1)] transition";

export default function CourierClient({
  initial,
  ready,
  statuses,
  summary,
}: {
  initial: CourierConfigPublic;
  ready: boolean;
  statuses: OrderStatusOption[];
  summary: { sent: number; notSent: number };
}) {
  const router = useRouter();
  const [toast, showToast] = useToast();
  const [cfg, setCfg] = useState<CourierConfigPublic>(initial);

  const [baseUrl, setBaseUrl] = useState(initial.baseUrl || COURIER_DEFAULT_BASE);
  const [apiKey, setApiKey] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [showKeys, setShowKeys] = useState(false);
  const [sentStatusKey, setSentStatusKey] = useState(initial.sentStatusKey);

  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [error, setError] = useState("");

  const put = async (body: Record<string, unknown>) => {
    const res = await fetch("/api/admin/courier/config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Could not save");
    return json.config as CourierConfigPublic;
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    const bad = courierBaseError(baseUrl);
    if (bad) {
      setError(bad);
      return;
    }
    setSaving(true);
    setError("");
    try {
      const next = await put({ baseUrl, apiKey, secretKey, sentStatusKey });
      setCfg(next);
      setBaseUrl(next.baseUrl);
      setApiKey("");
      setSecretKey("");
      showToast("ok", "Courier settings saved");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async () => {
    setToggling(true);
    try {
      const next = await put({ isActive: !cfg.isActive });
      setCfg(next);
      showToast("ok", next.isActive ? "Courier is ON — orders can be dispatched" : "Courier switched off");
      router.refresh();
    } catch (err) {
      showToast("err", err instanceof Error ? err.message : "Could not switch");
    } finally {
      setToggling(false);
    }
  };

  const test = async () => {
    setTesting(true);
    setError("");
    try {
      const res = await fetch("/api/admin/courier/test", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Connection test failed");
      setCfg((c) => ({ ...c, lastBalance: json.balance ?? c.lastBalance, lastError: json.ok ? "" : json.message }));
      if (json.ok) showToast("ok", `Connected — balance ${taka(json.balance ?? 0)}`);
      else showToast("err", json.message || "Could not authenticate");
      router.refresh();
    } catch (err) {
      showToast("err", err instanceof Error ? err.message : "Connection test failed");
    } finally {
      setTesting(false);
    }
  };

  const refreshBalance = async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/admin/courier/balance", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not read the balance");
      setCfg((c) => ({ ...c, lastBalance: json.balance, lastCheckedAt: json.checkedAt, lastError: "" }));
      showToast("ok", `Balance ${taka(json.balance ?? 0)}`);
    } catch (err) {
      showToast("err", err instanceof Error ? err.message : "Could not read the balance");
    } finally {
      setRefreshing(false);
    }
  };

  const clearKeys = async () => {
    setClearing(true);
    try {
      const next = await put({ clearKeys: true });
      setCfg(next);
      setApiKey("");
      setSecretKey("");
      setConfirmClear(false);
      showToast("ok", "Courier keys removed");
      router.refresh();
    } catch (err) {
      showToast("err", err instanceof Error ? err.message : "Could not remove the keys");
    } finally {
      setClearing(false);
    }
  };

  const connected = cfg.hasKeys && cfg.isActive;
  const checkedAt = cfg.lastCheckedAt
    ? new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Dhaka",
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(new Date(cfg.lastCheckedAt))
    : null;

  return (
    <div className="space-y-4">
      {/* ---------------- header ---------------- */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_4px_18px_rgba(17,18,28,0.05)] p-4 md:p-5">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <span
              className={`rounded-2xl p-2.5 shrink-0 text-white ${connected ? "bg-emerald-500" : "grad-bg"}`}
            >
              <Truck size={18} strokeWidth={2.3} />
            </span>
            <div className="min-w-0">
              <h2 className="font-display font-extrabold text-base md:text-lg flex flex-wrap items-center gap-2">
                Steadfast Courier
                <span
                  className={`text-[9px] font-extrabold tracking-wider px-2 py-1 rounded-md uppercase ring-1 ${
                    connected
                      ? "bg-emerald-50 text-emerald-600 ring-emerald-100"
                      : cfg.hasKeys
                        ? "bg-amber-50 text-amber-600 ring-amber-100"
                        : "bg-gray-100 text-gray-500 ring-gray-200"
                  }`}
                >
                  {connected ? "Connected" : cfg.hasKeys ? "Switched off" : "Not connected"}
                </span>
              </h2>
              <p className="text-[12.5px] font-semibold text-gray-500 mt-1 leading-relaxed">
                Paste your keys from the Steadfast portal, press Test, then switch it on. After that the Courier
                button on the Orders page books a real parcel and saves the consignment id back onto the order.
              </p>
            </div>
          </div>

          <button
            onClick={toggleActive}
            disabled={toggling || !cfg.hasKeys}
            title={cfg.hasKeys ? "" : "Save both keys first"}
            className={`shrink-0 flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-[12.5px] font-extrabold transition disabled:opacity-50 ${
              cfg.isActive
                ? "bg-gray-100 text-gray-600 hover:bg-gray-200"
                : "grad-bg text-white hover:opacity-90"
            }`}
          >
            {toggling ? <Loader2 size={15} className="animate-spin" /> : <PlugZap size={15} strokeWidth={2.6} />}
            {cfg.isActive ? "Switch off" : "Switch on"}
          </button>
        </div>

        {!ready && (
          <p className="mt-3 flex items-start gap-2 text-[11.5px] font-bold text-amber-800 bg-amber-50 border border-amber-200 rounded-2xl px-3.5 py-2.5">
            <AlertTriangle size={14} className="shrink-0 mt-[1px]" />
            <span>
              The <code className="font-mono">courier_config</code> table does not exist on this database yet. Run the
              migration SQL once in the Neon SQL Editor, then this card becomes editable.
            </span>
          </p>
        )}

        {cfg.lastError && (
          <p className="mt-3 flex items-start gap-2 text-[11.5px] font-bold text-rose-600 bg-rose-50 border border-rose-100 rounded-2xl px-3.5 py-2.5">
            <AlertTriangle size={14} className="shrink-0 mt-[1px]" />
            <span>Last courier call failed: {cfg.lastError}</span>
          </p>
        )}

        <div className="mt-3 flex gap-1.5 overflow-x-auto no-scrollbar -mx-1 px-1">
          <StatChip icon={Wallet} label="balance" value={cfg.lastBalance === null ? "—" : taka(cfg.lastBalance)} />
          <StatChip icon={PackageCheck} label="sent" value={summary.sent} />
          <StatChip icon={Truck} label="waiting" value={summary.notSent} />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.35fr_1fr] gap-3">
        {/* ---------------- credentials ---------------- */}
        <form
          onSubmit={save}
          className="bg-white rounded-3xl border border-gray-100 shadow-[0_4px_18px_rgba(17,18,28,0.05)] overflow-hidden"
        >
          <div className="flex items-center gap-2.5 px-4 md:px-5 py-4 border-b border-gray-100">
            <span className="grad-bg text-white rounded-xl p-2 shrink-0">
              <KeyRound size={15} />
            </span>
            <h3 className="font-display font-extrabold text-[15px]">Connection</h3>
            <button
              type="button"
              onClick={() => setShowKeys((v) => !v)}
              className="ml-auto flex items-center gap-1.5 text-[11px] font-extrabold text-gray-400 hover:text-[var(--g2)] transition"
            >
              {showKeys ? <EyeOff size={13} /> : <Eye size={13} />}
              {showKeys ? "Hide" : "Show"}
            </button>
          </div>

          <div className="p-4 md:p-5 space-y-3.5">
            <Field label="Base URL" icon={Link2} hint="From the Steadfast API guide — no trailing slash needed.">
              <input
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder={COURIER_DEFAULT_BASE}
                disabled={!ready}
                className={INPUT}
              />
            </Field>

            <Field
              label="Api-Key"
              icon={KeyRound}
              hint={cfg.apiKeyMask ? `Saved: ${cfg.apiKeyMask} — leave blank to keep it` : "Required"}
            >
              <input
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                type={showKeys ? "text" : "password"}
                autoComplete="off"
                placeholder={cfg.apiKeyMask || "paste your Api-Key"}
                disabled={!ready}
                className={INPUT}
              />
            </Field>

            <Field
              label="Secret-Key"
              icon={KeyRound}
              hint={cfg.secretKeyMask ? `Saved: ${cfg.secretKeyMask} — leave blank to keep it` : "Required"}
            >
              <input
                value={secretKey}
                onChange={(e) => setSecretKey(e.target.value)}
                type={showKeys ? "text" : "password"}
                autoComplete="off"
                placeholder={cfg.secretKeyMask || "paste your Secret-Key"}
                disabled={!ready}
                className={INPUT}
              />
            </Field>

            <label className="block min-w-0">
              <span className="block text-[10.5px] font-extrabold uppercase tracking-wider text-gray-500 mb-1.5">
                After a successful send, move the order to
              </span>
              <select
                value={sentStatusKey}
                onChange={(e) => setSentStatusKey(e.target.value)}
                disabled={!ready}
                className="w-full rounded-xl border-[1.5px] border-gray-200 bg-white px-3.5 py-2.5 text-[12.5px] font-bold outline-none focus:border-[var(--g1)] transition cursor-pointer"
              >
                {statuses
                  .filter((s) => s.isActive)
                  .map((s) => (
                    <option key={s.key} value={s.key}>
                      {s.label}
                    </option>
                  ))}
              </select>
              <span className="block mt-1.5 text-[10.5px] font-bold text-gray-400">
                Manage this list on Delivery Area → Order Status.
              </span>
            </label>

            {error && (
              <p className="flex items-center gap-2 text-[12px] font-bold text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-3.5 py-2">
                <AlertTriangle size={14} className="shrink-0" />
                {error}
              </p>
            )}

            <p className="flex items-start gap-2 text-[11.5px] font-bold text-sky-700 bg-sky-50 border border-sky-100 rounded-2xl px-3.5 py-2.5">
              <Info size={14} className="shrink-0 mt-[1px]" />
              <span>
                Both keys are encrypted before they are written to the database and are never sent back to this page in
                full — only the masked preview above.
              </span>
            </p>
          </div>

          <div className="px-4 md:px-5 py-4 border-t border-gray-100 flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={saving || !ready}
              className="flex-1 min-w-[140px] inline-flex items-center justify-center gap-2 grad-bg text-white rounded-2xl px-4 py-3 text-[12.5px] font-extrabold hover:opacity-90 transition disabled:opacity-60"
            >
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
              Save
            </button>
            <button
              type="button"
              onClick={test}
              disabled={testing || !cfg.hasKeys}
              className="flex-1 min-w-[140px] inline-flex items-center justify-center gap-2 rounded-2xl border-[1.5px] border-gray-200 px-4 py-3 text-[12.5px] font-extrabold text-gray-700 hover:border-[var(--g1)] hover:text-[var(--g2)] transition disabled:opacity-50"
            >
              {testing ? <Loader2 size={15} className="animate-spin" /> : <PlugZap size={15} />}
              Test connection
            </button>
            {cfg.hasKeys && (
              <button
                type="button"
                onClick={() => setConfirmClear(true)}
                className="w-11 rounded-2xl bg-rose-50 text-rose-500 grid place-items-center hover:bg-rose-100 transition"
                aria-label="Remove saved keys"
                title="Remove saved keys"
              >
                <Trash2 size={15} />
              </button>
            )}
          </div>
        </form>

        {/* ---------------- balance + what is wired ---------------- */}
        <div className="space-y-3">
          <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_4px_18px_rgba(17,18,28,0.05)] overflow-hidden">
            <div className="flex items-center gap-2.5 px-4 md:px-5 py-4 border-b border-gray-100">
              <span className="grad-bg text-white rounded-xl p-2 shrink-0">
                <Wallet size={15} />
              </span>
              <h3 className="font-display font-extrabold text-[15px]">Courier balance</h3>
              <button
                onClick={refreshBalance}
                disabled={refreshing || !connected}
                className="ml-auto flex items-center gap-1.5 text-[11px] font-extrabold text-gray-400 hover:text-[var(--g2)] transition disabled:opacity-40"
              >
                {refreshing ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                Refresh
              </button>
            </div>
            <div className="p-4 md:p-5">
              <p className="font-display text-[34px] leading-none font-extrabold grad-text">
                {cfg.lastBalance === null ? "—" : taka(cfg.lastBalance)}
              </p>
              <p className="mt-2 text-[11.5px] font-bold text-gray-400">
                {checkedAt ? `Checked ${checkedAt}` : "Not checked yet"}
              </p>
              <p className="mt-3 text-[11.5px] font-semibold text-gray-500 leading-relaxed">
                Delivered COD, minus delivery charges and the courier&apos;s 1% collection charge — what you could ask
                for a payout of right now.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_4px_18px_rgba(17,18,28,0.05)] overflow-hidden">
            <div className="flex items-center gap-2.5 px-4 md:px-5 py-4 border-b border-gray-100">
              <span className="grad-bg text-white rounded-xl p-2 shrink-0">
                <BadgeCheck size={15} />
              </span>
              <h3 className="font-display font-extrabold text-[15px]">What is wired</h3>
            </div>
            <ul className="p-4 md:p-5 space-y-2">
              {[
                "Courier button on every order — books one parcel",
                "Bulk “Send to courier” for the selected orders",
                "Consignment id, tracking code and link saved on the order",
                "Order status moves automatically after a successful send",
                "An order already sent can never be sent twice",
                "Refresh delivery status from the order page",
                "Real courier fraud check on the order page",
              ].map((t) => (
                <li key={t} className="flex items-start gap-2 text-[12px] font-semibold text-gray-600">
                  <Check size={13} className="text-emerald-500 shrink-0 mt-[2px]" />
                  <span className="min-w-0">{t}</span>
                </li>
              ))}
              <li className="flex items-start gap-2 text-[12px] font-semibold text-gray-400 pt-1 border-t border-gray-50 mt-2">
                <X size={13} className="shrink-0 mt-[2px]" />
                <span className="min-w-0">Background auto-sync (cron / webhook) — next step</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {confirmClear && (
        <ConfirmModal
          title="Remove the saved courier keys?"
          message="The courier switches off and nothing can be dispatched until you paste the keys again. Parcels already booked are not affected."
          loading={clearing}
          onConfirm={clearKeys}
          onClose={() => setConfirmClear(false)}
        />
      )}

      <Toast state={toast} />
    </div>
  );
}
