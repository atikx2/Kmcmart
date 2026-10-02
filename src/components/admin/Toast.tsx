"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, CircleX } from "lucide-react";

export type ToastState = { kind: "ok" | "err"; text: string } | null;

/** Tiny toast helper — `const [toast, showToast] = useToast()` then render <Toast state={toast} />. */
export function useToast(): [ToastState, (kind: "ok" | "err", text: string) => void] {
  const [toast, setToast] = useState<ToastState>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const show = useCallback((kind: "ok" | "err", text: string) => setToast({ kind, text }), []);
  return [toast, show];
}

export default function Toast({ state }: { state: ToastState }) {
  if (!state) return null;
  const ok = state.kind === "ok";
  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 md:left-auto md:right-6 md:translate-x-0 z-[140] px-4 w-full md:w-auto max-w-[420px] pointer-events-none">
      <div
        className={`flex items-center gap-2.5 rounded-2xl px-4 py-3 shadow-[0_18px_44px_rgba(17,18,28,0.2)] text-[13px] font-extrabold text-white animate-slide-down ${
          ok ? "bg-gradient-to-r from-emerald-500 to-green-500" : "bg-gradient-to-r from-rose-500 to-red-500"
        }`}
      >
        {ok ? <CheckCircle2 size={17} /> : <CircleX size={17} />}
        <span className="min-w-0 truncate">{state.text}</span>
      </div>
    </div>
  );
}
