import { getMenus, getSettings } from "@/lib/data";
import { isLang, mergeLegacyText, resolveText } from "@/lib/i18n";
import Providers from "@/components/site/Providers";
import Header from "@/components/site/Header";
import Footer from "@/components/site/Footer";

export default async function StoreLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [settings, menus] = await Promise.all([getSettings(), getMenus()]);
  const text = resolveText(isLang(settings.language) ? settings.language : "en", mergeLegacyText(settings));

  return (
    <Providers text={text}>
      <Header settings={settings} menus={menus} text={text} />
      <main className="flex-1">{children}</main>
      <Footer settings={settings} menus={menus} text={text} />
    </Providers>
  );
}
