"use client";

import { useState } from "react";
import { Check, Loader2, Pencil, X } from "lucide-react";

/**
 * Click the pencil → the value turns into an input right where it sits.
 * `onSave` gets the new value and must throw to signal failure.
 */
export default function InlineEdit({
  value,
  onSave,
  as = "input",
  type = "text",
  display,
  inputClassName = "",
  title = "Edit",
  prefix,
}: {
  value: string;
  onSave: (next: string) => Promise<void>;
  as?: "input" | "textarea";
  type?: "text" | "number";
  display?: React.ReactNode;
  inputClassName?: string;
  title?: string;
  prefix?: React.ReactNode;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [lastValue, setLastValue] = useState(value);

  /* pick up server-side changes while not editing (adjust-state-on-prop-change) */
  if (!editing && lastValue !== value) {
    setLastValue(value);
    setDraft(value);
  }

  const start = () => {
    setDraft(value);
    setError("");
    setEditing(true);
  };

  const commit = async () => {
    const next = draft.trim();
    if (next === value.trim()) {
      setEditing(false);
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onSave(next);
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save");
    } finally {
      setSaving(false);
    }
  };

  if (!editing) {
    return (
      <span className="group/ie inline-flex items-start gap-1.5 min-w-0">
        {prefix}
        <span className="min-w-0">{display ?? value}</span>
        <button
          onClick={start}
          title={title}
          className="shrink-0 mt-[1px] w-5 h-5 rounded-md grid place-items-center text-gray-300 hover:text-white hover:grad-bg transition"
          aria-label={title}
        >
          <Pencil size={11} />
        </button>
      </span>
    );
  }

  const fieldCls = `min-w-0 flex-1 rounded-lg border-[1.5px] border-[var(--g1)] bg-white px-2 py-1 text-[12px] font-bold outline-none ${inputClassName}`;
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") setEditing(false);
    if (e.key === "Enter" && as === "input") commit();
  };

  return (
    <span className="block min-w-0">
      <span className="flex items-start gap-1.5">
        {as === "textarea" ? (
          <textarea
            value={draft}
            autoFocus
            rows={3}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            className={`${fieldCls} resize-none`}
          />
        ) : (
          <input
            type={type}
            value={draft}
            autoFocus
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            className={fieldCls}
          />
        )}
        <button
          onClick={commit}
          disabled={saving}
          className="shrink-0 w-6 h-6 rounded-md grid place-items-center text-white bg-emerald-500 hover:bg-emerald-600 transition disabled:opacity-60"
          aria-label="Save"
        >
          {saving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
        </button>
        <button
          onClick={() => setEditing(false)}
          disabled={saving}
          className="shrink-0 w-6 h-6 rounded-md grid place-items-center text-gray-500 bg-gray-100 hover:bg-gray-200 transition disabled:opacity-60"
          aria-label="Cancel"
        >
          <X size={12} />
        </button>
      </span>
      {error && <span className="block mt-1 text-[10.5px] font-bold text-rose-500">{error}</span>}
    </span>
  );
}
