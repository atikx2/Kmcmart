import type { Metadata, Viewport } from "next";
import { Manrope, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { getSettings } from "@/lib/data";

export const dynamic = "force-dynamic";

const manrope = Manrope({ subsets: ["latin"], variable: "--font-sans" });
const grotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-display" });

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#FF3D77",
};

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  return {
    title: {
      default: `${s.siteName} — Best Online Shopping in Bangladesh`,
      template: `%s | ${s.siteName}`,
    },
    description: s.slogan,
  };
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const settings = await getSettings();

  return (
    <html lang="en" className={`${manrope.variable} ${grotesk.variable}`}>
      <body className="min-h-screen flex flex-col">
        <style>{`:root{--g1:${settings.colorFrom};--g2:${settings.colorTo};}`}</style>
        {children}
      </body>
    </html>
  );
}
