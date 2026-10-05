import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { getSettings } from "@/lib/data";
import { isLang } from "@/lib/i18n";
import { getActiveTrackingTags } from "@/lib/admin-tracking";
import TrackingScripts, { TrackingNoScript, verificationTokens } from "@/components/site/TrackingScripts";
import NavigationLoader from "@/components/site/NavigationLoader";

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
  const [s, tags] = await Promise.all([getSettings(), getActiveTrackingTags()]);
  const title = s.metaTitle.trim() || `${s.siteName} — Best Online Shopping in Bangladesh`;
  const favicon = s.favicon.trim();
  const verification = verificationTokens(tags);
  return {
    title: { default: title, template: `%s | ${s.siteName}` },
    description: s.metaDescription.trim() || s.slogan,
    ...(favicon ? { icons: { icon: favicon, shortcut: favicon, apple: favicon } } : {}),
    ...(verification.length ? { verification: { google: verification } } : {}),
  };
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [settings, tags] = await Promise.all([getSettings(), getActiveTrackingTags()]);

  return (
    <html
      lang={isLang(settings.language) ? settings.language : "en"}
      className={`${manrope.variable} ${grotesk.variable}`}
    >
      <body className="min-h-screen flex flex-col">
        <TrackingNoScript tags={tags} />
        <style>{`:root{--g1:${settings.colorFrom};--g2:${settings.colorTo};}`}</style>
        {children}
        <NavigationLoader />
        <TrackingScripts tags={tags} />
      </body>
    </html>
  );
}
