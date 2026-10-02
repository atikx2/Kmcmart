"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  BadgeCheck,
  Check,
  Clock,
  Eye,
  EyeOff,
  Info,
  KeyRound,
  Link2,
  Loader2,
  PlugZap,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Trash2,
  X,
  Zap,
} from "lucide-react";
import {
  FRAUD_DEFAULT_BASE,
  FRAUD_TONE_CHIP,
  FRAUD_TONE_TEXT,
  formatRate,
  fraudBaseError,
  fraudRiskLabel,
  fraudTone,
  isBdPhone,
  type FraudCheckReport,
  type FraudConfigPublic,
} from "@/lib/fraud-check";
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

export default function FraudClient({
  initial,
  ready,
  summary,
}: {
  initial: FraudConfigPublic;
  /** False until the migration SQL has created the fraud tables. */
  ready: boolean;
  summary: { reports: number; risky: number };
}) {
  const router = useRouter();
  const [toast, showToast] = useToast();
  const [cfg, setCfg] = useState<FraudConfigPublic>(initial);

  const [baseUrl, setBaseUrl] = useState(initial.baseUrl || FRAUD_DEFAULT_BASE);
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [cacheHours, setCacheHours] = useState(String(initial.cacheHours));
  const [testPhone, setTestPhone] = useState("");

  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [togglingAuto, setTogglingAuto] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [sample, setSample] = useState<FraudCheckReport | null>(null);
  const [error, setError] = useState("");

  const put = async (body: Record<string, unknown>) => {
    const res = await fetch("/api/admin/fraud/config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Could not save");
    return json.config as FraudConfigPublic;
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    const bad = fraudBaseError(baseUrl);
    if (bad) {
      setError(bad);
      return;
    }
    const hours = Number(cacheHours);
    if (!Number.isFinite(hours) || hours < 0 || hours > 720) {
      setError("Cache hours must be between 0 and 720");
      return;
    }
    setError("");
    setSaving(true);
    try {
      const next = await put({
        baseUrl: baseUrl.trim(),
        cacheHours: hours,
        ...(apiKey.trim() ? { apiKey: apiKey.trim() } : {}),
      });
      setCfg(next);
      setApiKey("");
      showToast("ok", "Fraud settings saved");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async () => {
    if (toggling) return;
    setToggling(true);
    try {
      const next = await put({ isActive: !cfg.isActive });
      setCfg(next);
      showToast("ok", next.isActive ? "Fraud check is on" : "Fraud check is off");
      router.refresh();
    } catch (err) {
      showToast("err", err instanceof Error ? err.message : "Could not save");
    } finally {
      setToggling(false);
    }
  };

  const toggleAuto = async () => {
    if (togglingAuto) return;
    setTogglingAuto(true);
    try {
      const next = await put({ autoCheck: !cfg.autoCheck });
      setCfg(next);
      showToast("ok", next.autoCheck ? "New orders will be checked automatically" : "Automatic check is off");
    } catch (err) {
      showToast("err", err instanceof Error ? err.message : "Could not save");
    } finally {
      setTogglingAuto(false);
    }
  };

  const test = async () => {
    if (testing) return;
    if (!isBdPhone(testPhone)) {
      setError("Enter a valid 11-digit number to test with");
      return;
    }
    setError("");
    setTesting(true);
    setSample(null);
    try {
      const res = await fetch("/api/admin/fraud/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: testPhone.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Test failed");
      if (json.ok) {
        setSample((json.report as FraudCheckReport) ?? null);
        showToast("ok", "Connected to fraudchecker.link");
      } else {
        setError(json.message || "Test failed");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Test failed");
    } finally {
      setTesting(false);
    }
  };

  const clearKey = async () => {
    setClearing(true);
    try {
      const next = await put({ clearKey: true, isActive: false });
      setCfg(next);
      setApiKey("");
      setConfirmClear(false);
      showToast("ok", "API key removed");
      router.refresh();
    } catch (err) {
      showToast("err", err instanceof Error ? err.message : "Could not remove the key");
    } finally {
      setClearing(false);
    }
  };

  const live = cfg.isActive && cfg.hasKey;

  return (
    <section className="bg-white rounded-3xl border border-gray-100 shadow-[0_4px_18px_rgba(17,18,28,0.05)] overflow-hidden">
      <div className="flex items-center gap-3 px-4 md:px-5 py-4 border-b border-gray-100">
        <span className="w-10 h-10 rounded-2xl grad-bg grid place-items-center text-white shrink-0">
          <ShieldCheck size={17} strokeWidth={2.3} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-display font-extrabold text-[15px] truncate">Fraud Check — fraudchecker.link</h3>
          <p className="text-[10.5px] font-extrabold uppercase tracking-wider text-gray-400 mt-0.5">
            {live ? "Connected" : cfg.hasKey ? "Key saved · switched off" : "Not connected"}
          </p>
        </div>
        <span
          className={`shrink-0 text-[9px] font-extrabold tracking-wider px-2 py-1 rounded-md uppercase ${
            live ? "bg-emerald-50 text-emerald-600" : "bg-gray-100 text-gray-500"
          }`}
        >
          {live ? "Live" : "Off"}
        </span>
      </div>

      <div className="p-4 md:p-5 space-y-4">
        <p className="text-[12.5px] font-semibold text-gray-500 leading-relaxed">
          Looks a customer&apos;s phone number up across every courier and shows how many of their parcels were
          actually received and how many came back. The score sits on the order row — tap it for the per-courier
          breakdown.
        </p>

        {!ready && (
          <p className="flex items-start gap-2 text-[11.5px] font-bold text-amber-700 bg-amber-50 border border-amber-100 rounded-2xl px-3.5 py-2.5">
            <AlertTriangle size={14} className="shrink-0 mt-[1px]" />
            <span>
              The fraud tables are not in the database yet. Run the migration SQL sent in chat, then reload this page.
            </span>
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <StatChip icon={Smartphone} label="Numbers checked" value={String(summary.reports)} />
          <StatChip icon={ShieldAlert} label="High risk" value={String(summary.risky)} />
        </div>

        <form onSubmit={save} className="space-y-3.5">
          <Field label="Base URL" icon={Link2} hint="Leave as it is unless the provider changes their endpoint.">
            <input
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder={FRAUD_DEFAULT_BASE}
              className={INPUT}
              spellCheck={false}
            />
          </Field>

          <Field
            label="API key"
            icon={KeyRound}
            hint={cfg.hasKey ? `Saved · ${cfg.apiKeyMask} — type a new key to replace it` : "From your fraudchecker.link dashboard"}
          >
            <input
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              type={showKey ? "text" : "password"}
              autoComplete="off"
              placeholder={cfg.hasKey ? "••••••••••••••••" : "Paste the key"}
              className={INPUT}
              spellCheck={false}
            />
            <button
              type="button"
              onClick={() => setShowKey((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              aria-label={showKey ? "Hide key" : "Show key"}
            >
              {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </Field>

          <Field
            label="Re-check after (hours)"
            icon={Clock}
            hint="A number already checked inside this window reuses the saved result instead of spending a lookup. 0 = always ask."
          >
            <input
              value={cacheHours}
              onChange={(e) => setCacheHours(e.target.value.replace(/[^\d]/g, ""))}
              inputMode="numeric"
              placeholder="24"
              className={INPUT}
            />
          </Field>

          {error && (
            <p className="flex items-start gap-2 text-[11.5px] font-bold text-rose-600 bg-rose-50 border border-rose-100 rounded-2xl px-3.5 py-2.5">
              <AlertTriangle size={14} className="shrink-0 mt-[1px]" />
              <span className="min-w-0">{error}</span>
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={saving}
              className="grad-bg text-white rounded-2xl px-5 py-2.5 text-[12.5px] font-extrabold inline-flex items-center gap-2 disabled:opacity-60"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              Save
            </button>

            <button
              type="button"
              onClick={toggleActive}
              disabled={toggling || !cfg.hasKey}
              title={cfg.hasKey ? undefined : "Save an API key first"}
              className={`rounded-2xl px-4 py-2.5 text-[12.5px] font-extrabold inline-flex items-center gap-2 border-[1.5px] transition disabled:opacity-50 ${
                cfg.isActive
                  ? "border-rose-200 text-rose-500 hover:bg-rose-50"
                  : "border-emerald-200 text-emerald-600 hover:bg-emerald-50"
              }`}
            >
              {toggling ? <Loader2 size={14} className="animate-spin" /> : <PlugZap size={14} />}
              {cfg.isActive ? "Switch off" : "Switch on"}
            </button>

            {cfg.hasKey && (
              <button
                type="button"
                onClick={() => setConfirmClear(true)}
                className="rounded-2xl px-4 py-2.5 text-[12.5px] font-extrabold inline-flex items-center gap-2 border-[1.5px] border-gray-200 text-gray-600 hover:border-rose-200 hover:text-rose-500 transition"
              >
                <Trash2 size={14} />
                Remove key
              </button>
            )}
          </div>
        </form>

        <div className="rounded-2xl border border-gray-100 p-3.5">
          <div className="flex items-start gap-3">
            <span className="w-9 h-9 rounded-xl grad-soft grid place-items-center text-[var(--g2)] shrink-0">
              <Zap size={15} strokeWidth={2.4} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-display font-extrabold text-[13px]">Check new orders automatically</p>
              <p className="text-[11.5px] font-semibold text-gray-500 mt-0.5 leading-relaxed">
                Every order placed on the site gets looked up on its own, right after it is saved. The customer never
                waits for it.
              </p>
            </div>
            <button
              type="button"
              onClick={toggleAuto}
              disabled={togglingAuto}
              role="switch"
              aria-checked={cfg.autoCheck}
              aria-label="Check new orders automatically"
              className={`shrink-0 w-12 h-7 rounded-full transition relative ${
                cfg.autoCheck ? "grad-bg" : "bg-gray-200"
              } disabled:opacity-60`}
            >
              <span
                className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-all ${
                  cfg.autoCheck ? "left-6" : "left-1"
                }`}
              />
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-100 p-3.5 space-y-3">
          <p className="font-display font-extrabold text-[13px]">Test the connection</p>
          <div className="flex flex-col sm:flex-row gap-2">
            <span className="relative flex-1 min-w-0">
              <Smartphone
                size={15}
                strokeWidth={2.3}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              />
              <input
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value.replace(/[^\d]/g, "").slice(0, 11))}
                inputMode="numeric"
                placeholder="017XXXXXXXX"
                className={INPUT}
              />
            </span>
            <button
              type="button"
              onClick={test}
              disabled={testing || !cfg.hasKey}
              className="rounded-2xl px-5 py-2.5 text-[12.5px] font-extrabold inline-flex items-center justify-center gap-2 border-[1.5px] border-gray-200 text-gray-700 hover:border-[var(--g1)] hover:text-[var(--g2)] transition disabled:opacity-50"
            >
              {testing ? <Loader2 size={14} className="animate-spin" /> : <BadgeCheck size={14} />}
              Test
            </button>
          </div>

          {sample && (
            <div className="rounded-xl bg-[#fafafc] border border-gray-100 p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="font-display text-[20px] font-extrabold leading-none text-gray-900">
                  <span className={FRAUD_TONE_TEXT[fraudTone(sample)]}>{formatRate(sample.deliveryRate)}%</span>
                </span>
                <span
                  className={`text-[9.5px] font-extrabold uppercase tracking-wider px-2 py-1 rounded-lg ring-1 ${
                    FRAUD_TONE_CHIP[fraudTone(sample)]
                  }`}
                >
                  {fraudRiskLabel(sample)}
                </span>
              </div>
              <p className="mt-1.5 text-[11.5px] font-bold text-gray-500">
                {sample.totalDelivered} received · {sample.totalCancelled} cancelled · {sample.totalParcels} parcels ·{" "}
                {sample.couriers.length} courier{sample.couriers.length === 1 ? "" : "s"}
              </p>
            </div>
          )}

          {cfg.lastError && !sample && (
            <p className="flex items-start gap-2 text-[11.5px] font-bold text-rose-600">
              <X size={14} className="shrink-0 mt-[1px]" />
              <span className="min-w-0">Last attempt: {cfg.lastError}</span>
            </p>
          )}
        </div>

        <p className="flex items-start gap-2 text-[11.5px] font-bold text-sky-700 bg-sky-50 border border-sky-100 rounded-2xl px-3.5 py-2.5">
          <Info size={14} className="shrink-0 mt-[1px]" />
          <span>
            Results are saved against the phone number, not the order — a repeat customer costs one lookup, however
            many times they order.
          </span>
        </p>
      </div>

      {confirmClear && (
        <ConfirmModal
          title="Remove the API key?"
          message="The fraud check switches off until a new key is saved. Reports already saved stay where they are."
          confirmLabel="Remove"
          loading={clearing}
          onConfirm={clearKey}
          onClose={() => setConfirmClear(false)}
        />
      )}

      <Toast state={toast} />
    </section>
  );
}
