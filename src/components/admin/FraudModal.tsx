"use client";

import { useState } from "react";
import { Loader2, PackageCheck, PackageX, RefreshCw, ShieldAlert, Truck, X } from "lucide-react";
import {
  FRAUD_TONE_BAR,
  FRAUD_TONE_CHIP,
  FRAUD_TONE_TEXT,
  formatRate,
  fraudRiskLabel,
  fraudTone,
  type FraudCheckReport,
} from "@/lib/fraud-check";
import type { FraudScore } from "@/lib/order-status";

/**
 * The per-courier breakdown behind a score chip.
 * Also offers a re-check, because a report goes stale the moment the customer
 * places their next order somewhere else.
 */
export default function FraudModal({
  phone,
  customerName,
  report: initial,
  ownHistory,
  onClose,
  onUpdated,
}: {
  phone: string;
  customerName?: string;
  report: FraudCheckReport | null;
  /** This store's own delivery record for the same number. */
  ownHistory?: FraudScore;
  onClose: () => void;
  onUpdated?: (r: FraudCheckReport) => void;
}) {
  const [report, setReport] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const recheck = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/fraud/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not check this number");
      setReport(json.report);
      onUpdated?.(json.report);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not check this number");
    } finally {
      setLoading(false);
    }
  };

  const tone = report ? fraudTone(report) : "slate";
  const checkedAt = report?.checkedAt
    ? new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Dhaka",
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(new Date(report.checkedAt))
    : null;

  return (
    <div className="fixed inset-0 z-[130] flex items-end sm:items-center justify-center">
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/35 backdrop-blur-[2px] animate-fade-up"
      />

      <div className="relative w-full sm:max-w-[460px] max-h-[88vh] overflow-y-auto bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl animate-slide-down">
        <div className="sticky top-0 bg-white/95 backdrop-blur px-5 py-4 border-b border-gray-100 flex items-start gap-3">
          <span className="grad-bg text-white rounded-xl p-2 shrink-0">
            <ShieldAlert size={15} />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="font-display font-extrabold text-[15px] truncate">
              {customerName || "Customer history"}
            </h3>
            <p className="text-[11.5px] font-bold text-gray-400 font-mono">{phone}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 shrink-0 rounded-xl grid place-items-center text-gray-400 hover:bg-gray-100 transition"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {!report ? (
            <div className="text-center py-6">
              <p className="text-[12.5px] font-bold text-gray-400">
                This number has not been checked yet.
              </p>
              <button
                onClick={recheck}
                disabled={loading}
                className="mt-3 inline-flex items-center gap-2 grad-bg text-white rounded-2xl px-4 py-2.5 text-[12.5px] font-extrabold hover:opacity-90 transition disabled:opacity-60"
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                Check now
              </button>
            </div>
          ) : (
            <>
              {/* headline */}
              <div>
                <div className="flex items-end justify-between gap-3">
                  <div className="min-w-0">
                    <p className={`font-display text-[32px] leading-none font-extrabold ${FRAUD_TONE_TEXT[tone]}`}>
                      {report.totalParcels === 0 ? "—" : `${formatRate(report.deliveryRate)}%`}
                    </p>
                    <p className="mt-1.5 text-[11px] font-extrabold uppercase tracking-wider text-gray-400">
                      delivery rate
                    </p>
                  </div>
                  <span
                    className={`text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1.5 rounded-lg ring-1 ${FRAUD_TONE_CHIP[tone]}`}
                  >
                    {fraudRiskLabel(report)}
                  </span>
                </div>
                <div className="mt-3 h-2 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${FRAUD_TONE_BAR[tone]}`}
                    style={{ width: `${Math.min(100, Math.max(0, report.deliveryRate))}%` }}
                  />
                </div>
              </div>

              {/* totals */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { icon: Truck, label: "parcels", value: report.totalParcels, cls: "text-gray-800" },
                  { icon: PackageCheck, label: "received", value: report.totalDelivered, cls: "text-emerald-600" },
                  { icon: PackageX, label: "cancelled", value: report.totalCancelled, cls: "text-rose-500" },
                ].map((m) => {
                  const Icon = m.icon;
                  return (
                    <div key={m.label} className="rounded-2xl bg-[#fafafc] border border-gray-100 px-3 py-2.5">
                      <Icon size={13} className="text-gray-300 mb-1" />
                      <p className={`font-display text-[19px] font-extrabold leading-none ${m.cls}`}>{m.value}</p>
                      <p className="mt-1 text-[9.5px] font-extrabold uppercase tracking-wider text-gray-400">
                        {m.label}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* per courier */}
              {report.couriers.length > 0 ? (
                <div>
                  <p className="text-[10.5px] font-extrabold uppercase tracking-wider text-gray-400 mb-2">
                    By courier
                  </p>
                  <div className="rounded-2xl border border-gray-100 overflow-hidden">
                    <table className="w-full text-[12px]">
                      <thead>
                        <tr className="bg-[#fafafc] text-[9.5px] font-extrabold uppercase tracking-wider text-gray-400">
                          <th className="text-left px-3 py-2">Courier</th>
                          <th className="text-right px-2 py-2">Total</th>
                          <th className="text-right px-2 py-2">Received</th>
                          <th className="text-right px-3 py-2">Cancel</th>
                        </tr>
                      </thead>
                      <tbody>
                        {report.couriers.map((c, i) => (
                          <tr key={c.name} className={i % 2 === 1 ? "bg-[#fcfcfd]" : ""}>
                            <td className="px-3 py-2.5 font-extrabold text-gray-700 truncate max-w-[120px]">
                              {c.name}
                            </td>
                            <td className="px-2 py-2.5 text-right font-bold text-gray-600">{c.total}</td>
                            <td className="px-2 py-2.5 text-right font-extrabold text-emerald-600">{c.delivered}</td>
                            <td className="px-3 py-2.5 text-right font-extrabold text-rose-500">{c.cancelled}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                report.totalParcels === 0 && (
                  <p className="text-[11.5px] font-semibold text-gray-500 bg-[#fafafc] border border-gray-100 rounded-2xl px-3.5 py-3 leading-relaxed">
                    No courier has a record for this number. That is not a clean history — it is no history. Treat a
                    first-time number on its own merits.
                  </p>
                )
              )}

              {ownHistory && ownHistory.totalOrders > 0 && (
                <div className="pt-3 border-t border-gray-100">
                  <p className="text-[10.5px] font-extrabold uppercase tracking-wider text-gray-400 mb-1.5">
                    At your shop
                  </p>
                  <p className="text-[12px] font-bold text-gray-600">
                    {ownHistory.delivered} delivered · {ownHistory.cancelled} cancelled ·{" "}
                    {ownHistory.totalOrders} order{ownHistory.totalOrders === 1 ? "" : "s"}
                  </p>
                </div>
              )}

              {report.error && (
                <p className="text-[11.5px] font-bold text-amber-800 bg-amber-50 border border-amber-200 rounded-2xl px-3.5 py-2.5">
                  Last lookup failed: {report.error} — showing the stored copy.
                </p>
              )}

              {error && (
                <p className="text-[11.5px] font-bold text-rose-600 bg-rose-50 border border-rose-100 rounded-2xl px-3.5 py-2.5">
                  {error}
                </p>
              )}

              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={recheck}
                  disabled={loading}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl border-[1.5px] border-gray-200 px-4 py-2.5 text-[12.5px] font-extrabold text-gray-700 hover:border-[var(--g1)] hover:text-[var(--g2)] transition disabled:opacity-60"
                >
                  {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                  Re-check
                </button>
              </div>

              <p className="text-[10.5px] font-bold text-gray-400 text-center">
                {checkedAt ? `Checked ${checkedAt}` : "Not checked yet"}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
