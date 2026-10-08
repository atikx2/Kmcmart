import { LoaderCircle, Sparkles } from "lucide-react";

/** Global route transition fallback. Next shows this while a new page/server component is loading. */
export default function Loading() {
  return (
    <div
      className="fixed inset-0 z-[200] grid place-items-center bg-white/75 backdrop-blur-sm"
      role="status"
      aria-live="polite"
      aria-label="Loading page"
    >
      <div className="flex flex-col items-center gap-4 rounded-[28px] bg-white px-8 py-7 shadow-[0_20px_70px_rgba(17,18,28,0.14)] ring-1 ring-black/[0.04]">
        <div className="relative grid h-16 w-16 place-items-center rounded-[22px] grad-bg text-white shadow-[0_10px_26px_rgba(255,61,119,0.28)]">
          <LoaderCircle size={30} strokeWidth={2.5} className="animate-spin" />
          <Sparkles size={11} className="absolute right-2.5 top-2.5 animate-pulse" />
        </div>
        <div className="text-center">
          <p className="font-display text-sm font-extrabold text-gray-800">Loading…</p>
          <p className="mt-1 text-[11px] font-semibold text-gray-400">Just a moment</p>
        </div>
      </div>
    </div>
  );
}
