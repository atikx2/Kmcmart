"use client";

import { useRef, useState } from "react";
import {
  ImagePlus,
  Link2,
  Loader2,
  Plus,
  Star,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { MAX_PRODUCT_IMAGES } from "@/lib/product-admin";

/** Resize + re-encode in the browser so uploads stay small. */
async function compress(file: File): Promise<string> {
  const MAX_EDGE = 900;
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Your browser blocked image processing");
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();

  for (const q of [0.8, 0.7, 0.6, 0.5]) {
    const url = canvas.toDataURL("image/webp", q);
    if (url.length < 420_000) return url;
  }
  throw new Error("That image is too large — try a smaller one");
}

export default function ImageUploader({
  images,
  onChange,
  max = MAX_PRODUCT_IMAGES,
  label = "Add gallery image",
  columns = "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4",
}: {
  images: string[];
  onChange: (next: string[]) => void;
  /** Cap the number of images — categories only keep one. */
  max?: number;
  label?: string;
  columns?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [urlOpen, setUrlOpen] = useState(false);
  const [url, setUrl] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const room = max - images.length;

  const addFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setError("");
    setBusy(true);
    try {
      const picked = Array.from(files).slice(0, Math.max(0, room));
      const next: string[] = [];
      for (const f of picked) {
        if (!f.type.startsWith("image/")) continue;
        next.push(await compress(f));
      }
      if (next.length) onChange([...images, ...next]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const addUrl = () => {
    const v = url.trim();
    if (!v) return;
    if (!/^https?:\/\//i.test(v)) {
      setError("Image links must start with http:// or https://");
      return;
    }
    onChange([...images, v].slice(0, max));
    setUrl("");
    setUrlOpen(false);
    setError("");
  };

  const removeAt = (i: number) => onChange(images.filter((_, idx) => idx !== i));

  const makePrimary = (i: number) => {
    if (i === 0) return;
    const next = [...images];
    const [pick] = next.splice(i, 1);
    onChange([pick, ...next]);
  };

  return (
    <div>
      <div className={`grid ${columns} gap-3`}>
        {images.map((src, i) => (
          <div
            key={`${i}-${src.slice(-24)}`}
            className="group relative aspect-square rounded-2xl overflow-hidden bg-gray-50 ring-1 ring-gray-200"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt={`Product image ${i + 1}`} className="w-full h-full object-cover" />

            {i === 0 && max > 1 && (
              <span className="absolute top-2 left-2 grad-bg text-white text-[9px] font-extrabold uppercase tracking-wider px-2 py-1 rounded-full shadow-sm">
                Primary
              </span>
            )}

            <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition grid place-items-center gap-2 grid-flow-col">
              {i !== 0 && max > 1 && (
                <button
                  type="button"
                  onClick={() => makePrimary(i)}
                  title="Make primary"
                  className="w-9 h-9 rounded-full bg-white/95 text-amber-500 grid place-items-center hover:scale-105 transition"
                >
                  <Star size={15} />
                </button>
              )}
              <button
                type="button"
                onClick={() => removeAt(i)}
                title="Remove image"
                className="w-9 h-9 rounded-full bg-white/95 text-rose-500 grid place-items-center hover:scale-105 transition"
              >
                <Trash2 size={15} />
              </button>
            </div>
          </div>
        ))}

        {room > 0 && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="aspect-square rounded-2xl border-[2px] border-dashed border-gray-200 hover:border-[var(--g1)] bg-[#fbfbfe] hover:bg-[color-mix(in_srgb,var(--g1)_6%,white)] transition grid place-items-center text-center px-3 disabled:opacity-60"
          >
            <span className="flex flex-col items-center gap-2">
              <span className="w-11 h-11 rounded-2xl grad-soft grid place-items-center text-[var(--g2)]">
                {busy ? <Loader2 size={18} className="animate-spin" /> : <Plus size={20} />}
              </span>
              <span className="text-[11.5px] font-extrabold text-gray-600 leading-tight">
                {busy ? "Processing…" : images.length === 0 ? "Add main image" : label}
              </span>
              <span className="text-[10px] font-bold text-gray-400">{room} slot{room === 1 ? "" : "s"} left</span>
            </span>
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => addFiles(e.target.files)}
      />

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy || room <= 0}
          className="inline-flex items-center gap-2 rounded-xl grad-bg text-white px-4 py-2.5 text-[12px] font-extrabold hover:opacity-90 transition disabled:opacity-45"
        >
          <Upload size={14} />
          Upload from device
        </button>
        <button
          type="button"
          onClick={() => setUrlOpen((v) => !v)}
          disabled={room <= 0}
          className="inline-flex items-center gap-2 rounded-xl border-[1.5px] border-gray-200 px-4 py-2.5 text-[12px] font-extrabold text-gray-600 hover:border-[var(--g1)] hover:text-[var(--g2)] transition disabled:opacity-45"
        >
          <Link2 size={14} />
          Paste image link
        </button>
        <span className="text-[11px] font-bold text-gray-400 inline-flex items-center gap-1.5">
          <ImagePlus size={13} />
          {max > 1 ? `First image is the primary one — up to ${max}` : "One image, square looks best"}
        </span>
      </div>

      {urlOpen && (
        <div className="mt-3 flex gap-2">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addUrl();
              }
            }}
            placeholder="https://example.com/photo.jpg"
            className="flex-1 min-w-0 rounded-xl border-[1.5px] border-gray-200 bg-[#fbfbfe] px-3.5 py-2.5 text-[13px] font-semibold outline-none focus:border-[var(--g1)] focus:bg-white transition"
          />
          <button
            type="button"
            onClick={addUrl}
            className="shrink-0 rounded-xl grad-bg text-white px-4 py-2.5 text-[12px] font-extrabold hover:opacity-90 transition"
          >
            Add
          </button>
          <button
            type="button"
            onClick={() => {
              setUrlOpen(false);
              setUrl("");
            }}
            className="shrink-0 w-10 rounded-xl bg-gray-100 text-gray-500 grid place-items-center hover:bg-gray-200 transition"
            aria-label="Cancel"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {error && (
        <p className="mt-2.5 text-[12px] font-bold text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-3.5 py-2">
          {error}
        </p>
      )}
    </div>
  );
}
