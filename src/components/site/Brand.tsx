import Image from "next/image";

export type BrandSettings = {
  siteName: string;
  logoMode: string;
  logoText: string;
  logoHeader: string;
  logoFooter: string;
};

/**
 * Site logo. The admin either uploads an image or switches to a text wordmark
 * (rendered in the brand gradient), so a store with no logo file still looks
 * finished.
 */
export default function Brand({
  settings,
  variant = "header",
  width = 150,
  height = 36,
  className = "h-9 w-auto",
  textClassName = "text-[22px]",
  priority = false,
}: {
  settings: BrandSettings;
  variant?: "header" | "footer";
  width?: number;
  height?: number;
  className?: string;
  textClassName?: string;
  priority?: boolean;
}) {
  const wordmark = settings.logoText.trim() || settings.siteName;

  if (settings.logoMode === "text") {
    return (
      <span
        className={`font-display font-extrabold tracking-tight leading-none whitespace-nowrap ${
          variant === "footer" ? "text-white" : "grad-text"
        } ${textClassName}`}
      >
        {wordmark}
      </span>
    );
  }

  const src = variant === "footer" ? settings.logoFooter : settings.logoHeader;
  return (
    <Image
      src={src}
      alt={settings.siteName}
      width={width}
      height={height}
      className={className}
      priority={priority}
      unoptimized={src.startsWith("data:")}
    />
  );
}
