/**
 * Shared admin table bits so every management page looks identical.
 * Neutral module (no "use client") — safe to import from both sides.
 */

export type IconCmp = React.ComponentType<{
  size?: number | string;
  className?: string;
  strokeWidth?: number;
}>;

export function Th({
  icon: Icon,
  label,
  className = "",
}: {
  icon: IconCmp;
  label: string;
  className?: string;
}) {
  return (
    <th className={`px-3 py-3.5 align-middle ${className}`}>
      <span className="inline-flex items-center gap-2 whitespace-nowrap">
        <span className="w-[26px] h-[26px] rounded-[9px] bg-white grid place-items-center text-[var(--g2)] shadow-[0_1px_3px_rgba(17,18,28,0.07),inset_0_0_0_1px_rgba(255,122,0,0.14)]">
          <Icon size={13} strokeWidth={2.4} />
        </span>
        <span className="text-[10.5px] font-extrabold uppercase tracking-[0.14em] text-gray-500">{label}</span>
      </span>
    </th>
  );
}

export const ACTION_BTN =
  "w-[30px] h-[30px] rounded-full grid place-items-center transition-all duration-200 shadow-[0_1px_3px_rgba(17,18,28,0.08)] hover:-translate-y-0.5 hover:shadow-[0_6px_14px_rgba(17,18,28,0.18)]";

/** Small stat chip used above the tables. */
export function StatChip({
  icon: Icon,
  label,
  value,
}: {
  icon: IconCmp;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <span className="shrink-0 flex items-center gap-2 rounded-2xl bg-[#fafafc] border border-gray-100 px-3.5 py-2.5">
      <span className="w-[26px] h-[26px] rounded-[9px] grad-soft grid place-items-center text-[var(--g2)]">
        <Icon size={13} strokeWidth={2.4} />
      </span>
      <span className="font-display text-[15px] font-extrabold leading-none text-gray-800">{value}</span>
      <span className="text-[10.5px] font-extrabold uppercase tracking-wider text-gray-400">{label}</span>
    </span>
  );
}
