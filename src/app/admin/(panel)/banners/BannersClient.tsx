"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowDownUp,
  Check,
  Eye,
  EyeOff,
  Hash,
  Image as ImageIcon,
  Images,
  Inbox,
  Info,
  Loader2,
  MousePointerClick,
  Pencil,
  Plus,
  Trash2,
  Type,
  X,
} from "lucide-react";
import { BANNER_HINT, type AdminBanner } from "@/lib/site-content";
import ConfirmModal from "@/components/admin/ConfirmModal";
import ImageUploader from "@/components/admin/ImageUploader";
import InlineEdit from "@/components/admin/InlineEdit";
import Toast, { useToast } from "@/components/admin/Toast";
import { ACTION_BTN, Th } from "@/components/admin/table-ui";

type Draft = { imageUrl: string; alt: string; sortOrder: string; isActive: boolean };

function BannerModal({
  mode,
  banner,
  nextSort,
  onClose,
  onSaved,
}: {
  mode: "create" | "edit";
  banner?: AdminBanner;
  nextSort: number;
  onClose: () => void;
  onSaved: (msg: string) => void;
}) {
  const [v, setV] = useState<Draft>(
    banner
      ? { imageUrl: banner.imageUrl, alt: banner.alt, sortOrder: String(banner.sortOrder), isActive: banner.isActive }
      : { imageUrl: "", alt: "", sortOrder: String(nextSort), isActive: true }
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    if (!v.imageUrl) {
      setError("Upload a banner image or paste an image link first");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch(mode === "create" ? "/api/admin/banners" : `/api/admin/banners/${banner!.id}`, {
        method: mode === "create" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl: v.imageUrl,
          alt: v.alt.trim() || "Banner",
          sortOrder: Math.max(0, Math.round(Number(v.sortOrder) || 0)),
          isActive: v.isActive,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not save the banner");
      onSaved(mode === "create" ? "Banner added" : "Banner updated");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the banner");
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[130] grid place-items-center px-4 py-6 overflow-y-auto">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[3px]" onClick={saving ? undefined : onClose} />
      <form onSubmit={submit} className="relative w-full max-w-[620px] bg-white rounded-3xl shadow-2xl animate-slide-down my-auto">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
          <span className="grad-bg text-white rounded-xl p-2 shrink-0">
            <Images size={15} strokeWidth={2.4} />
          </span>
          <h2 className="font-display font-extrabold text-base md:text-lg truncate">
            {mode === "create" ? "Add Banner" : "Edit Banner"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="ml-auto w-9 h-9 rounded-full bg-gray-100 grid place-items-center hover:bg-gray-200 transition disabled:opacity-50 shrink-0"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[66vh] overflow-y-auto">
          <ImageUploader
            images={v.imageUrl ? [v.imageUrl] : []}
            onChange={(next) => setV((p) => ({ ...p, imageUrl: next[0] ?? "" }))}
            max={1}
            columns="grid-cols-1"
            tile="aspect-[3/1]"
            maxEdge={1600}
            maxBytes={700_000}
            hint="Hero slider image — keep it 3:1 (1920×640)"
          />

          <p className="flex items-start gap-2 text-[11.5px] font-bold text-sky-700 bg-sky-50 border border-sky-100 rounded-xl px-3.5 py-2.5">
            <Info size={14} className="shrink-0 mt-[1px]" />
            {BANNER_HINT}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-[1fr_140px] gap-4">
            <label className="block min-w-0">
              <span className="block text-[11px] font-extrabold uppercase tracking-wider text-gray-500 mb-1.5">
                Alt text
              </span>
              <span className="relative block">
                <Type size={16} strokeWidth={2.3} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--g2)] pointer-events-none z-[1]" />
                <input
                  value={v.alt}
                  onChange={(e) => setV((p) => ({ ...p, alt: e.target.value }))}
                  placeholder="Eid mega sale banner"
                  className="field font-semibold"
                />
              </span>
              <span className="mt-1.5 block text-[11px] font-semibold text-gray-400">Shown if the image fails to load</span>
            </label>

            <label className="block min-w-0">
              <span className="block text-[11px] font-extrabold uppercase tracking-wider text-gray-500 mb-1.5">
                Sort order
              </span>
              <span className="relative block">
                <ArrowDownUp size={16} strokeWidth={2.3} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--g2)] pointer-events-none z-[1]" />
                <input
                  type="number"
                  min={0}
                  value={v.sortOrder}
                  onChange={(e) => setV((p) => ({ ...p, sortOrder: e.target.value }))}
                  className="field font-bold"
                />
              </span>
              <span className="mt-1.5 block text-[11px] font-semibold text-gray-400">Lower slides first</span>
            </label>
          </div>

          <button
            type="button"
            onClick={() => setV((p) => ({ ...p, isActive: !p.isActive }))}
            className={`w-full flex items-center gap-3 rounded-2xl border-[1.5px] px-3.5 py-3 text-left transition ${
              v.isActive
                ? "border-[color-mix(in_srgb,var(--g1)_45%,transparent)] bg-[color-mix(in_srgb,var(--g1)_7%,white)]"
                : "border-gray-200 bg-[#fbfbfe] hover:border-gray-300"
            }`}
          >
            <span className={`w-9 h-9 rounded-xl grid place-items-center shrink-0 ${v.isActive ? "grad-bg text-white" : "bg-white text-gray-400 ring-1 ring-gray-200"}`}>
              {v.isActive ? <Eye size={15} strokeWidth={2.3} /> : <EyeOff size={15} strokeWidth={2.3} />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[12.5px] font-extrabold text-gray-800">Show in the home slider</span>
              <span className="block text-[10.5px] font-semibold text-gray-400 mt-0.5">Turn off to keep it saved but hidden</span>
            </span>
            <span className={`relative w-[42px] h-[24px] rounded-full shrink-0 transition ${v.isActive ? "grad-bg" : "bg-gray-200"}`}>
              <span className={`absolute top-[3px] w-[18px] h-[18px] rounded-full bg-white shadow transition-all ${v.isActive ? "left-[21px]" : "left-[3px]"}`} />
            </span>
          </button>

          {error && (
            <p className="flex items-center gap-2 text-[12px] font-bold text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-3.5 py-2.5">
              <AlertTriangle size={14} />
              {error}
            </p>
          )}
        </div>

        <div className="flex gap-2.5 px-5 py-4 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-2xl px-4 py-3 text-[12.5px] font-extrabold text-gray-500 bg-gray-100 hover:bg-gray-200 transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 grad-bg text-white rounded-2xl py-3 text-[13px] font-extrabold hover:opacity-90 transition disabled:opacity-70"
          >
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
            {saving ? "Saving…" : mode === "create" ? "Add Banner" : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function BannersClient({ initial }: { initial: AdminBanner[] }) {
  const router = useRouter();
  const [toast, showToast] = useToast();
  const [items, setItems] = useState<AdminBanner[]>(initial);
  const [loading, setLoading] = useState(false);
  const [rowBusy, setRowBusy] = useState<number | null>(null);
  const [modal, setModal] = useState<{ mode: "create" | "edit"; row?: AdminBanner } | null>(null);
  const [toDelete, setToDelete] = useState<AdminBanner | null>(null);
  const [working, setWorking] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/banners");
      if (!res.ok) throw new Error();
      setItems((await res.json()).items);
    } catch {
      showToast("err", "Could not load banners");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  const save = async (id: number, body: Record<string, unknown>) => {
    const res = await fetch(`/api/admin/banners/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Could not save");
    return json;
  };

  const toggle = async (b: AdminBanner) => {
    setRowBusy(b.id);
    setItems((prev) => prev.map((x) => (x.id === b.id ? { ...x, isActive: !b.isActive } : x)));
    try {
      await save(b.id, { isActive: !b.isActive });
      showToast("ok", !b.isActive ? "Banner is live" : "Banner hidden");
      router.refresh();
    } catch (e) {
      setItems((prev) => prev.map((x) => (x.id === b.id ? { ...x, isActive: b.isActive } : x)));
      showToast("err", e instanceof Error ? e.message : "Could not update");
    } finally {
      setRowBusy(null);
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    setWorking(true);
    try {
      const res = await fetch(`/api/admin/banners/${toDelete.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Delete failed");
      setToDelete(null);
      showToast("ok", "Banner deleted");
      await refresh();
      router.refresh();
    } catch (e) {
      showToast("err", e instanceof Error ? e.message : "Delete failed");
    } finally {
      setWorking(false);
    }
  };

  const nextSort = items.length ? Math.max(...items.map((b) => b.sortOrder)) + 1 : 1;
  const liveCount = items.filter((b) => b.isActive).length;

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_4px_18px_rgba(17,18,28,0.05)] p-3 md:p-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <p className="flex items-start gap-2 text-[11.5px] font-bold text-sky-700 bg-sky-50 border border-sky-100 rounded-2xl px-3.5 py-2.5 min-w-0 flex-1">
            <Info size={14} className="shrink-0 mt-[1px]" />
            <span className="min-w-0">{BANNER_HINT}</span>
          </p>
          <div className="shrink-0 flex items-center gap-2.5">
            <span className="flex items-center gap-2 rounded-2xl bg-[#fafafc] border border-gray-100 px-3.5 py-2.5">
              <span className="w-[26px] h-[26px] rounded-[9px] grad-soft grid place-items-center text-[var(--g2)]">
                <Eye size={13} strokeWidth={2.4} />
              </span>
              <span className="font-display text-[15px] font-extrabold leading-none text-gray-800">
                {liveCount}/{items.length}
              </span>
              <span className="text-[10.5px] font-extrabold uppercase tracking-wider text-gray-400">live</span>
            </span>
            <button
              onClick={() => setModal({ mode: "create" })}
              className="flex items-center justify-center gap-2 grad-bg text-white rounded-2xl px-4 py-2.5 text-[12.5px] font-extrabold hover:opacity-90 transition"
            >
              <Plus size={15} strokeWidth={2.6} />
              Add Banner
            </button>
          </div>
        </div>
      </div>

      <div className="relative bg-white rounded-3xl border border-gray-100 shadow-[0_4px_18px_rgba(17,18,28,0.05)] overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-4 md:px-6 py-4 border-b border-gray-100">
          <h2 className="font-display font-extrabold text-base md:text-lg flex items-center gap-2.5 min-w-0">
            <span className="grad-bg text-white rounded-xl p-2 shrink-0">
              <Images size={15} strokeWidth={2.4} />
            </span>
            <span className="truncate">Hero Slider Banners</span>
          </h2>
          <span className="shrink-0 flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-wider text-gray-400">
            {loading && <Loader2 size={13} className="animate-spin text-[var(--g2)]" />}
            {items.length} total
          </span>
        </div>

        {items.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <span className="mx-auto w-20 h-20 rounded-full grad-soft grid place-items-center mb-4">
              <Inbox size={30} className="text-gray-400" />
            </span>
            <p className="font-display font-extrabold text-gray-700">No banners yet</p>
            <p className="text-[13px] font-semibold text-gray-400 mt-1.5 max-w-[360px] mx-auto">
              Add a 3:1 image and it shows up in the home slider straight away.
            </p>
            <button
              onClick={() => setModal({ mode: "create" })}
              className="mt-5 inline-flex items-center gap-2 grad-bg text-white text-[12.5px] font-extrabold px-5 py-2.5 rounded-full hover:opacity-90 transition"
            >
              <Plus size={15} />
              Add Banner
            </button>
          </div>
        ) : (
          <div className="relative">
            <div className="overflow-x-auto overscroll-x-contain [scrollbar-width:thin] [scrollbar-color:#d8d8e2_transparent]">
              <table className="w-full min-w-[860px] text-sm">
                <thead>
                  <tr className="text-left bg-gradient-to-r from-[#fff8f3] via-[#fff6f8] to-[#fff4f8] border-y border-gray-100">
                    <Th icon={Hash} label="SL" className="w-[64px]" />
                    <Th icon={ImageIcon} label="Banner" />
                    <Th icon={Type} label="Alt text" />
                    <Th icon={ArrowDownUp} label="Sort" />
                    <Th icon={Eye} label="Status" />
                    <Th icon={MousePointerClick} label="Action" className="text-right" />
                  </tr>
                </thead>
                <tbody>
                  {items.map((b, i) => (
                    <tr
                      key={b.id}
                      className={`group border-b border-gray-50 last:border-0 align-top transition-colors ${
                        i % 2 === 1 ? "bg-[#fcfcfd] hover:bg-[#fff7f3]" : "hover:bg-[#fff7f3]"
                      }`}
                    >
                      <td className="px-3 py-4">
                        <span className="inline-grid place-items-center w-7 h-7 rounded-lg bg-[#fafafc] border border-gray-100 text-[11px] font-extrabold text-gray-500">
                          {i + 1}
                        </span>
                      </td>

                      <td className="px-3 py-4">
                        <button
                          onClick={() => setModal({ mode: "edit", row: b })}
                          className="relative block w-[260px] aspect-[3/1] rounded-xl overflow-hidden bg-gray-100 ring-1 ring-gray-100 shadow-[0_1px_3px_rgba(17,18,28,0.08)]"
                          title="Edit banner"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={b.imageUrl} alt={b.alt} className="w-full h-full object-cover" loading="lazy" />
                          {!b.isActive && (
                            <span className="absolute inset-0 bg-white/65 grid place-items-center text-[10px] font-extrabold uppercase tracking-wider text-gray-500">
                              Hidden
                            </span>
                          )}
                        </button>
                      </td>

                      <td className="px-3 py-4">
                        <div className="w-[200px]">
                          <InlineEdit
                            value={b.alt}
                            title="Edit alt text"
                            inputClassName="w-[150px]"
                            display={<span className="block text-[13px] font-extrabold text-gray-800 leading-snug line-clamp-2">{b.alt}</span>}
                            onSave={async (next) => {
                              const alt = next.trim() || "Banner";
                              await save(b.id, { alt });
                              setItems((prev) => prev.map((x) => (x.id === b.id ? { ...x, alt } : x)));
                              showToast("ok", "Alt text updated");
                              router.refresh();
                            }}
                          />
                        </div>
                      </td>

                      <td className="px-3 py-4">
                        <div className="w-[96px]">
                          <InlineEdit
                            value={String(b.sortOrder)}
                            type="number"
                            title="Edit sort order"
                            inputClassName="w-[64px]"
                            prefix={
                              <span className="w-[22px] h-[22px] rounded-lg grad-soft grid place-items-center shrink-0 text-[var(--g2)] mt-[2px]">
                                <ArrowDownUp size={11} strokeWidth={2.5} />
                              </span>
                            }
                            display={<span className="font-display font-extrabold text-[15.5px] grad-text leading-none">{b.sortOrder}</span>}
                            onSave={async (next) => {
                              const n = Number(next);
                              if (!Number.isFinite(n) || n < 0) throw new Error("Invalid");
                              await save(b.id, { sortOrder: Math.round(n) });
                              showToast("ok", "Sort order updated");
                              await refresh();
                              router.refresh();
                            }}
                          />
                          <p className="mt-1.5 text-[9.5px] font-extrabold text-gray-400">lower = first</p>
                        </div>
                      </td>

                      <td className="px-3 py-4">
                        <button
                          onClick={() => toggle(b)}
                          disabled={rowBusy === b.id}
                          title={b.isActive ? "Live — click to hide" : "Hidden — click to show"}
                          className={`inline-flex items-center gap-1 text-[9.5px] font-extrabold uppercase tracking-wider px-2 py-[4px] rounded-full ring-1 transition disabled:opacity-60 ${
                            b.isActive
                              ? "bg-emerald-50 text-emerald-600 ring-emerald-100 hover:bg-emerald-100"
                              : "bg-gray-100 text-gray-500 ring-gray-200 hover:bg-gray-200"
                          }`}
                        >
                          {rowBusy === b.id ? (
                            <Loader2 size={10} className="animate-spin" />
                          ) : b.isActive ? (
                            <Eye size={10} strokeWidth={2.6} />
                          ) : (
                            <EyeOff size={10} strokeWidth={2.6} />
                          )}
                          {b.isActive ? "Live" : "Hidden"}
                        </button>
                      </td>

                      <td className="px-3 py-4">
                        <div className="flex justify-end">
                          <div className="inline-grid grid-cols-2 gap-1.5 p-1.5 rounded-2xl bg-[#fafafc] border border-gray-100">
                            <button
                              onClick={() => setModal({ mode: "edit", row: b })}
                              title="Edit banner"
                              className={`${ACTION_BTN} bg-indigo-50 text-indigo-500 hover:bg-indigo-500 hover:text-white`}
                            >
                              <Pencil size={13} strokeWidth={2.4} />
                            </button>
                            <button
                              onClick={() => setToDelete(b)}
                              title="Delete banner"
                              className={`${ACTION_BTN} bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white`}
                            >
                              <Trash2 size={13} strokeWidth={2.4} />
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <span className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-white to-transparent 2xl:hidden" />
          </div>
        )}
      </div>

      {modal && (
        <BannerModal
          key={modal.mode === "edit" ? `edit-${modal.row?.id}` : "create"}
          mode={modal.mode}
          banner={modal.row}
          nextSort={nextSort}
          onClose={() => setModal(null)}
          onSaved={async (msg) => {
            setModal(null);
            showToast("ok", msg);
            await refresh();
            router.refresh();
          }}
        />
      )}

      {toDelete && (
        <ConfirmModal
          title="Delete this banner?"
          message="It disappears from the home slider right away. This cannot be undone."
          loading={working}
          onConfirm={confirmDelete}
          onClose={() => setToDelete(null)}
        />
      )}

      <Toast state={toast} />
    </div>
  );
}
