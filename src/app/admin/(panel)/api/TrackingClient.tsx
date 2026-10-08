"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Check,
  Info,
  Loader2,
  Plus,
  Tag,
  Trash2,
} from "lucide-react";
import {
  TRACKING_PROVIDERS,
  TRACKING_VERIFY_HINT,
  cleanTagId,
  providerName,
  tagIdError,
  type TrackingProvider,
  type TrackingTagPublic,
} from "@/lib/tracking";
import ConfirmModal from "@/components/admin/ConfirmModal";
import Toast, { useToast } from "@/components/admin/Toast";

const PROVIDER_CHIP: Record<TrackingProvider, string> = {
  gtm: "bg-sky-50 text-sky-600 ring-sky-100",
  ga4: "bg-amber-50 text-amber-600 ring-amber-100",
  gads: "bg-emerald-50 text-emerald-600 ring-emerald-100",
  meta: "bg-indigo-50 text-indigo-600 ring-indigo-100",
  verification: "bg-gray-100 text-gray-500 ring-gray-200",
};

export default function TrackingClient({
  initial,
  ready,
}: {
  initial: TrackingTagPublic[];
  /** False until the migration SQL has created tracking_tags. */
  ready: boolean;
}) {
  const router = useRouter();
  const [toast, showToast] = useToast();
  const [items, setItems] = useState<TrackingTagPublic[]>(initial);

  const [provider, setProvider] = useState<TrackingProvider>("gtm");
  const [tagId, setTagId] = useState("");
  const [label, setLabel] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");

  const [busyId, setBusyId] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<TrackingTagPublic | null>(null);

  const info = TRACKING_PROVIDERS.find((p) => p.key === provider)!;

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (adding) return;
    const cleaned = cleanTagId(provider, tagId);
    const bad = tagIdError(provider, cleaned);
    if (bad) {
      setError(bad);
      return;
    }
    setError("");
    setAdding(true);
    try {
      const res = await fetch("/api/admin/tracking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, tagId: cleaned, label }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not save the tag");
      setItems((v) => [...v, json.item as TrackingTagPublic]);
      setTagId("");
      setLabel("");
      showToast("ok", `${providerName(provider)} connected`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the tag");
    } finally {
      setAdding(false);
    }
  };

  const toggle = async (t: TrackingTagPublic) => {
    if (busyId) return;
    setBusyId(t.id);
    /* Optimistic — the switch should feel instant. */
    const prev = items;
    setItems((v) => v.map((x) => (x.id === t.id ? { ...x, isActive: !x.isActive } : x)));
    try {
      const res = await fetch(`/api/admin/tracking/${t.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !t.isActive }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Could not update");
      showToast("ok", !t.isActive ? "Tag is live" : "Tag paused");
      router.refresh();
    } catch (err) {
      setItems(prev);
      showToast("err", err instanceof Error ? err.message : "Could not update");
    } finally {
      setBusyId(null);
    }
  };

  const remove = async () => {
    if (!confirmDelete) return;
    setBusyId(confirmDelete.id);
    try {
      const res = await fetch(`/api/admin/tracking/${confirmDelete.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error || "Could not remove");
      setItems((v) => v.filter((x) => x.id !== confirmDelete.id));
      setConfirmDelete(null);
      showToast("ok", "Tag removed");
      router.refresh();
    } catch (err) {
      showToast("err", err instanceof Error ? err.message : "Could not remove");
    } finally {
      setBusyId(null);
    }
  };

  const liveCount = items.filter((t) => t.isActive).length;

  return (
    <section className="bg-white rounded-3xl border border-gray-100 shadow-[0_4px_18px_rgba(17,18,28,0.05)] overflow-hidden">
      <div className="flex items-center gap-3 px-4 md:px-5 py-4 border-b border-gray-100">
        <span className="w-10 h-10 rounded-2xl grad-bg grid place-items-center text-white shrink-0">
          <Tag size={17} strokeWidth={2.3} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-display font-extrabold text-[15px] truncate">Google Tag &amp; Pixels</h3>
          <p className="text-[10.5px] font-extrabold uppercase tracking-wider text-gray-400 mt-0.5">
            {liveCount > 0 ? `${liveCount} live` : "Not connected"}
          </p>
        </div>
        <span
          className={`shrink-0 text-[9px] font-extrabold tracking-wider px-2 py-1 rounded-md uppercase ${
            liveCount > 0 ? "bg-emerald-50 text-emerald-600" : "bg-gray-100 text-gray-500"
          }`}
        >
          {liveCount > 0 ? "Live" : "Off"}
        </span>
      </div>

      <div className="p-4 md:p-5 space-y-4">
        <p className="text-[12.5px] font-semibold text-gray-500 leading-relaxed">
          Add as many tags as you need — a Tag Manager container, a GA4 property, a Google Ads conversion id and a
          Meta pixel can all run together. They load after the page is interactive, so they never slow the shop down.
        </p>

        {!ready && (
          <p className="flex items-start gap-2 text-[11.5px] font-bold text-amber-700 bg-amber-50 border border-amber-100 rounded-2xl px-3.5 py-2.5">
            <AlertTriangle size={14} className="shrink-0 mt-[1px]" />
            <span>The tracking table is not in the database yet. Run the migration SQL, then reload this page.</span>
          </p>
        )}

        {/* ---- current tags ---- */}
        {items.length > 0 && (
          <div className="space-y-2">
            {items.filter((t) => t.provider !== "meta").map((t) => (
              <div
                key={t.id}
                className="flex items-center gap-3 rounded-2xl border border-gray-100 px-3.5 py-3 hover:bg-[#fff7f3] transition"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`text-[9.5px] font-extrabold uppercase tracking-wider px-2 py-[3px] rounded-full ring-1 ${
                        PROVIDER_CHIP[t.provider]
                      }`}
                    >
                      {providerName(t.provider)}
                    </span>
                    {t.label && (
                      <span className="text-[11px] font-extrabold text-gray-500 truncate">{t.label}</span>
                    )}
                  </div>
                  <p className="mt-1 text-[12px] font-extrabold text-gray-700 font-mono truncate">{t.tagId}</p>
                </div>

                <button
                  onClick={() => toggle(t)}
                  disabled={busyId === t.id}
                  role="switch"
                  aria-checked={t.isActive}
                  aria-label={`${t.isActive ? "Pause" : "Activate"} ${providerName(t.provider)}`}
                  className={`shrink-0 w-11 h-6 rounded-full transition relative ${
                    t.isActive ? "grad-bg" : "bg-gray-200"
                  } disabled:opacity-60`}
                >
                  <span
                    className={`absolute top-[3px] w-[18px] h-[18px] rounded-full bg-white shadow transition-all ${
                      t.isActive ? "left-[23px]" : "left-[3px]"
                    }`}
                  />
                </button>

                <button
                  onClick={() => setConfirmDelete(t)}
                  className="shrink-0 w-8 h-8 rounded-xl grid place-items-center text-gray-400 hover:text-rose-500 hover:bg-rose-50 transition"
                  aria-label="Remove tag"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ---- add a tag ---- */}
        <form onSubmit={add} className="rounded-2xl border border-gray-100 p-3.5 space-y-3">
          <p className="font-display font-extrabold text-[13px]">Add a tag</p>

          <div className="flex flex-wrap gap-1.5">
            {TRACKING_PROVIDERS.filter((p) => p.key !== "meta").map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => {
                  setProvider(p.key);
                  setError("");
                }}
                className={`text-[11px] font-extrabold px-3 py-2 rounded-xl border-[1.5px] transition ${
                  provider === p.key
                    ? "border-[var(--g1)] text-[var(--g2)] bg-[#fff7f3]"
                    : "border-gray-200 text-gray-500 hover:border-gray-300"
                }`}
              >
                {p.name}
              </button>
            ))}
          </div>

          <p className="text-[11.5px] font-semibold text-gray-500 leading-relaxed">{info.hint}</p>

          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2">
            <input
              value={tagId}
              onChange={(e) => {
                setTagId(e.target.value);
                setError("");
              }}
              placeholder={info.placeholder}
              spellCheck={false}
              className="w-full rounded-xl border-[1.5px] border-gray-200 bg-white px-3.5 py-2.5 text-[12.5px] font-bold outline-none focus:border-[var(--g1)] transition font-mono"
            />
            <button
              type="submit"
              disabled={adding || !ready}
              className="grad-bg text-white rounded-xl px-5 py-2.5 text-[12.5px] font-extrabold inline-flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {adding ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              Save &amp; connect
            </button>
          </div>

          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Name it so you remember — optional"
            className="w-full rounded-xl border-[1.5px] border-gray-200 bg-white px-3.5 py-2.5 text-[12.5px] font-bold outline-none focus:border-[var(--g1)] transition"
          />

          {error && (
            <p className="flex items-start gap-2 text-[11.5px] font-bold text-rose-600 bg-rose-50 border border-rose-100 rounded-2xl px-3.5 py-2.5">
              <AlertTriangle size={14} className="shrink-0 mt-[1px]" />
              <span className="min-w-0">{error}</span>
            </p>
          )}

          <p className="flex items-start gap-2 text-[11px] font-bold text-gray-500">
            <Check size={13} className="shrink-0 mt-[1px] text-emerald-500" />
            <span>{TRACKING_VERIFY_HINT[provider]}</span>
          </p>
        </form>

        <p className="flex items-start gap-2 text-[11.5px] font-bold text-sky-700 bg-sky-50 border border-sky-100 rounded-2xl px-3.5 py-2.5">
          <Info size={14} className="shrink-0 mt-[1px]" />
          <span>
            Only the id is stored, never a script block — so a stolen admin password cannot put code on your shop.
            Need a tag that is not listed? Add your Tag Manager container and manage everything from there.
          </span>
        </p>
      </div>

      {confirmDelete && (
        <ConfirmModal
          title={`Remove this ${providerName(confirmDelete.provider)} tag?`}
          message="It stops firing on the storefront straight away. You can add it again at any time."
          confirmLabel="Remove"
          loading={busyId === confirmDelete.id}
          onConfirm={remove}
          onClose={() => setConfirmDelete(null)}
        />
      )}

      <Toast state={toast} />
    </section>
  );
}
