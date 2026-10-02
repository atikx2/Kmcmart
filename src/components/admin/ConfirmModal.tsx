"use client";

import { AlertTriangle, Loader2, X } from "lucide-react";

export default function ConfirmModal({
  title,
  message,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  loading = false,
  tone = "danger",
  onConfirm,
  onClose,
}: {
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  tone?: "danger" | "brand";
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[130] grid place-items-center px-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[3px]" onClick={loading ? undefined : onClose} />
      <div className="relative w-full max-w-[400px] bg-white rounded-3xl shadow-2xl p-6 animate-slide-down">
        <button
          onClick={onClose}
          disabled={loading}
          className="absolute right-4 top-4 w-9 h-9 rounded-full bg-gray-100 grid place-items-center hover:bg-gray-200 transition disabled:opacity-50"
          aria-label="Close"
        >
          <X size={16} />
        </button>

        <span
          className={`w-12 h-12 rounded-2xl grid place-items-center text-white shadow-md ${
            tone === "danger" ? "bg-gradient-to-br from-rose-500 to-red-500" : "grad-bg"
          }`}
        >
          <AlertTriangle size={20} />
        </span>

        <h3 className="font-display font-extrabold text-lg mt-4">{title}</h3>
        <div className="text-[13px] font-semibold text-gray-500 mt-1.5 leading-relaxed">{message}</div>

        <div className="flex gap-2.5 mt-6">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 rounded-2xl py-3 text-[13px] font-extrabold text-gray-600 bg-gray-100 hover:bg-gray-200 transition disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 rounded-2xl py-3 text-[13px] font-extrabold text-white flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.99] transition disabled:opacity-70 ${
              tone === "danger" ? "bg-gradient-to-br from-rose-500 to-red-500" : "grad-bg"
            }`}
          >
            {loading && <Loader2 size={15} className="animate-spin" />}
            {loading ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
