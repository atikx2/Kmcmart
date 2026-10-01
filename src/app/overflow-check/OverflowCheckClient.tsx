"use client";

/**
 * TEMPORARY DIAGNOSTIC PAGE — remove before the final merge.
 *
 * Loads any storefront/admin route in a same-origin iframe at a phone width and
 * reports whether the document scrolls sideways, plus which elements stick out.
 * Exists because the site owner reviews everything from a phone and cannot open
 * devtools.
 */

import { useCallback, useRef, useState } from "react";

type Offender = { tag: string; cls: string; right: number; text: string };
type Result = {
  scrollW: number;
  clientW: number;
  overflowBy: number;
  offenders: Offender[];
} | null;

const ROUTES = ["/", "/checkout", "/search?q=shirt", "/admin/orders"];
const WIDTHS = [360, 375, 412];

export default function OverflowCheckClient() {
  const [path, setPath] = useState("/");
  const [width, setWidth] = useState(375);
  const [result, setResult] = useState<Result>(null);
  const [status, setStatus] = useState("Loading…");
  const frameRef = useRef<HTMLIFrameElement>(null);

  const measure = useCallback(() => {
    const doc = frameRef.current?.contentDocument;
    if (!doc || !doc.documentElement) {
      setStatus("Could not read the frame");
      return;
    }
    const de = doc.documentElement;
    const clientW = de.clientWidth;
    const scrollW = Math.max(de.scrollWidth, doc.body?.scrollWidth ?? 0);

    const offenders: Offender[] = [];
    doc.querySelectorAll<HTMLElement>("body *").forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.right > clientW + 1) {
        offenders.push({
          tag: el.tagName.toLowerCase(),
          cls: (el.getAttribute("class") || "").slice(0, 110),
          right: Math.round(r.right),
          text: (el.textContent || "").trim().slice(0, 40),
        });
      }
    });

    offenders.sort((a, b) => b.right - a.right);
    setResult({ scrollW, clientW, overflowBy: scrollW - clientW, offenders: offenders.slice(0, 10) });
    setStatus("");
  }, []);

  /* reset the readout whenever the target changes (adjust-state-during-render) */
  const frameKey = `${path}-${width}`;
  const [prevKey, setPrevKey] = useState(frameKey);
  if (prevKey !== frameKey) {
    setPrevKey(frameKey);
    setResult(null);
    setStatus("Loading…");
  }

  const ok = result !== null && result.overflowBy <= 0;

  return (
    <div className="min-h-screen bg-[#f5f5f8] p-4 font-sans">
      <h1 className="font-display font-extrabold text-xl">Horizontal overflow check</h1>
      <p className="text-[12.5px] font-semibold text-gray-500 mt-1">
        Temporary tool — renders a page at phone width and reports sideways scroll.
      </p>

      <div className="mt-4 bg-white rounded-2xl border border-gray-100 p-3 space-y-3">
        <div className="flex flex-wrap gap-2">
          {ROUTES.map((r) => (
            <button
              key={r}
              onClick={() => setPath(r)}
              className={`rounded-xl px-3 py-2 text-[12px] font-extrabold transition ${
                path === r ? "grad-bg text-white" : "bg-gray-100 text-gray-600"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {WIDTHS.map((w) => (
            <button
              key={w}
              onClick={() => setWidth(w)}
              className={`rounded-xl px-3 py-2 text-[12px] font-extrabold transition ${
                width === w ? "grad-bg text-white" : "bg-gray-100 text-gray-600"
              }`}
            >
              {w}px
            </button>
          ))}
          <button
            onClick={measure}
            className="rounded-xl px-3 py-2 text-[12px] font-extrabold bg-gray-900 text-white"
          >
            Re-measure
          </button>
        </div>
      </div>

      <div
        className={`mt-4 rounded-2xl p-4 text-white font-extrabold ${
          result === null
            ? "bg-gray-400"
            : ok
              ? "bg-gradient-to-r from-emerald-500 to-green-500"
              : "bg-gradient-to-r from-rose-500 to-red-500"
        }`}
      >
        {result === null ? (
          status
        ) : (
          <>
            <p className="text-[15px]">
              {ok ? "✅ No horizontal overflow" : `❌ Overflows by ${result.overflowBy}px`}
            </p>
            <p className="text-[12px] font-bold opacity-90 mt-1">
              scrollWidth {result.scrollW} · viewport {result.clientW} · tested at {width}px
            </p>
          </>
        )}
      </div>

      {result && result.offenders.length > 0 && (
        <div className="mt-3 bg-white rounded-2xl border border-gray-100 p-3">
          <p className="text-[11px] font-extrabold uppercase tracking-wider text-gray-400 mb-2">
            Elements sticking out
          </p>
          <ul className="space-y-2">
            {result.offenders.map((o, i) => (
              <li key={i} className="text-[11px] font-mono bg-gray-50 rounded-lg p-2 break-all">
                <b>
                  {o.tag} → right {o.right}px
                </b>
                <br />
                {o.cls}
                {o.text && <em className="block text-gray-500 mt-1">“{o.text}”</em>}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-4 bg-white rounded-2xl border border-gray-100 p-2 overflow-x-auto">
        <iframe
          ref={frameRef}
          key={frameKey}
          src={path}
          title="preview"
          style={{ width, height: 680, border: "1px solid #eee", borderRadius: 12 }}
          onLoad={() => setTimeout(measure, 900)}
        />
      </div>
    </div>
  );
}
