import { getMenus, getSettings } from "@/lib/data";
import Providers from "@/components/site/Providers";
import Header from "@/components/site/Header";
import Footer from "@/components/site/Footer";

export default async function StoreLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [settings, menus] = await Promise.all([getSettings(), getMenus()]);

  return (
    <Providers>
      <Header settings={settings} menus={menus} />
      <main className="flex-1">{children}</main>
      <Footer settings={settings} menus={menus} />
    </Providers>
  );
}
