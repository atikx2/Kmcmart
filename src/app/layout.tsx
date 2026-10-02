import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { getSettings } from "@/lib/data";
import { isLang } from "@/lib/i18n";

export const dynamic = "force-dynamic";

/* Self-hosted fonts (same families as before: Manrope + Space Grotesk).
   Kept local so builds never depend on fonts.googleapis.com being reachable. */
const manrope = localFont({
  src: "../fonts/Manrope-Variable.woff2",
  weight: "200 800",
  style: "normal",
  display: "swap",
  variable: "--font-sans",
  fallback: ["system-ui", "Segoe UI", "Arial", "sans-serif"],
});

const grotesk = localFont({
  src: "../fonts/SpaceGrotesk-Variable.woff2",
  weight: "300 700",
  style: "normal",
  display: "swap",
  variable: "--font-display",
  fallback: ["system-ui", "Segoe UI", "Arial", "sans-serif"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#FF3D77",
};

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  const title = s.metaTitle.trim() || `${s.siteName} — Best Online Shopping in Bangladesh`;
  const favicon = s.favicon.trim();
  return {
    title: { default: title, template: `%s | ${s.siteName}` },
    description: s.metaDescription.trim() || s.slogan,
    ...(favicon ? { icons: { icon: favicon, shortcut: favicon, apple: favicon } } : {}),
  };
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const settings = await getSettings();

  return (
    <html
      lang={isLang(settings.language) ? settings.language : "en"}
      className={`${manrope.variable} ${grotesk.variable}`}
    >
      <body className="min-h-screen flex flex-col">
        <style>{`:root{--g1:${settings.colorFrom};--g2:${settings.colorTo};}`}</style>
        {children}
      </body>
    </html>
  );
}
