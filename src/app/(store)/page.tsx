import { Headphones, RefreshCcw, ShieldCheck, Truck } from "lucide-react";
import {
  getBanners,
  getCategories,
  getHomeCategories,
  getProducts,
  getSiteText,
} from "@/lib/data";
import HeroSlider from "@/components/home/HeroSlider";
import CategorySlider from "@/components/home/CategorySlider";
import ProductsBlock from "@/components/home/ProductsBlock";
import SectionTitle from "@/components/site/SectionTitle";
import Reveal from "@/components/site/Reveal";

export default async function HomePage() {
  const [text, banners, categories, homeCats, all] = await Promise.all([
    getSiteText(),
    getBanners(),
    getCategories(),
    getHomeCategories(),
    getProducts({ limit: 12 }),
  ]);

  const perks = [
    { icon: Truck, title: text.fastDeliveryTitle, sub: text.fastDeliverySub },
    { icon: ShieldCheck, title: text.authenticTitle, sub: text.genuineSub },
    { icon: RefreshCcw, title: text.returnTitle, sub: text.returnSub },
    { icon: Headphones, title: text.supportTitle, sub: text.supportSub },
  ];

  const catSections = await Promise.all(
    homeCats.map(async (c) => ({
      category: c,
      result: await getProducts({ categorySlug: c.slug, limit: 12 }),
    }))
  );

  return (
    <div className="pb-0">
      {/* hero */}
      <HeroSlider banners={banners} />

      {/* trust strip */}
      <div className="max-w-7xl mx-auto px-4 lg:px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 md:gap-4 -mt-2 md:-mt-3 relative z-10">
          {perks.map(({ icon: Icon, title, sub }, i) => (
            <Reveal key={title} delay={i * 70}>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_8px_28px_rgba(17,18,28,0.07)] px-4 py-3.5 flex items-center gap-3 h-full">
                <span className="grad-bg text-white rounded-xl p-2.5 shrink-0">
                  <Icon size={17} />
                </span>
                <span className="min-w-0">
                  <span className="block text-[12.5px] md:text-[13.5px] font-extrabold text-gray-900 leading-tight">
                    {title}
                  </span>
                  <span className="block text-[10.5px] md:text-xs text-gray-400 font-semibold truncate">{sub}</span>
                </span>
              </div>
            </Reveal>
          ))}
        </div>
      </div>

      {/* categories */}
      {categories.length > 0 && (
        <section id="categories" className="mt-10 md:mt-16">
          <div className="max-w-7xl mx-auto px-3 lg:px-6">
            <Reveal>
              <SectionTitle
                eyebrow={text.categoryEyebrow}
                title={text.categoryTitle}
                subtitle={text.categorySubtitle}
              />
            </Reveal>
            <Reveal delay={120}>
              <div className="bg-white rounded-[28px] border border-gray-100 shadow-[0_10px_40px_rgba(17,18,28,0.06)] px-2 md:px-6 py-5 md:py-7">
                <CategorySlider categories={categories} />
              </div>
            </Reveal>
          </div>
        </section>
      )}

      {/* all products */}
      <section className="mt-10 md:mt-16 py-10 md:py-14 grad-soft">
        <div className="max-w-7xl mx-auto px-3 lg:px-6">
          <Reveal>
            <SectionTitle eyebrow={text.featuredEyebrow} title={text.allProductsTitle} />
          </Reveal>
          <Reveal delay={100}>
            <ProductsBlock
              initialItems={all.items}
              initialHasMore={all.hasMore}
              categorySlug="all"
            />
          </Reveal>
        </div>
      </section>

      {/* category-wise products */}
      {catSections.map(({ category, result }, i) =>
        result.items.length === 0 ? null : (
          <section
            key={category.id}
            className={`py-10 md:py-14 ${i % 2 === 0 ? "bg-white" : "grad-soft"}`}
          >
            <div className="max-w-7xl mx-auto px-3 lg:px-6">
              <Reveal>
                <SectionTitle eyebrow={text.categorySectionEyebrow} title={category.name} />
              </Reveal>
              <Reveal delay={100}>
                <ProductsBlock
                  initialItems={result.items}
                  initialHasMore={result.hasMore}
                  categorySlug={category.slug}
                />
              </Reveal>
            </div>
          </section>
        )
      )}
    </div>
  );
}
