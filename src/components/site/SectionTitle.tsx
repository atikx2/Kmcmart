import { Sparkles } from "lucide-react";

export default function SectionTitle({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="text-center mb-7 md:mb-10 px-4">
      {eyebrow && (
        <span className="inline-flex items-center gap-1.5 grad-soft text-[10.5px] md:text-xs font-extrabold uppercase tracking-[0.18em] px-4 py-1.5 rounded-full mb-3">
          <Sparkles size={13} className="text-[var(--g2)]" />
          <span className="grad-text">{eyebrow}</span>
        </span>
      )}
      <h2 className="font-display text-[24px] md:text-[34px] font-extrabold tracking-tight text-gray-900 flex items-center justify-center gap-3 md:gap-5">
        <span className="title-line l-left hidden sm:block" />
        <span className="relative">
          {title}
        </span>
        <span className="title-line hidden sm:block" />
      </h2>
      {subtitle && (
        <p className="mt-2.5 text-gray-500 text-[13px] md:text-[15px] max-w-xl mx-auto">{subtitle}</p>
      )}
    </div>
  );
}
