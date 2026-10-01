import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import {
  admins,
  banners,
  categories,
  deliveryAreas,
  menus,
  products,
  settings,
} from "@/db/schema";
import { hashPassword } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS "admins" (
  "id" serial PRIMARY KEY NOT NULL,
  "email" text NOT NULL,
  "password_hash" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "admins_email_unique" UNIQUE("email")
);
CREATE TABLE IF NOT EXISTS "banners" (
  "id" serial PRIMARY KEY NOT NULL,
  "image_url" text NOT NULL,
  "alt" text DEFAULT 'Banner' NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL
);
CREATE TABLE IF NOT EXISTS "categories" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "slug" text NOT NULL,
  "image_url" text DEFAULT '' NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "show_on_home" boolean DEFAULT false NOT NULL,
  CONSTRAINT "categories_slug_unique" UNIQUE("slug")
);
CREATE TABLE IF NOT EXISTS "customers" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "phone" text NOT NULL,
  "password_hash" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "customers_phone_unique" UNIQUE("phone")
);
CREATE TABLE IF NOT EXISTS "delivery_areas" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "charge" integer DEFAULT 0 NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL
);
CREATE TABLE IF NOT EXISTS "menus" (
  "id" serial PRIMARY KEY NOT NULL,
  "label" text NOT NULL,
  "href" text NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL
);
CREATE TABLE IF NOT EXISTS "orders" (
  "id" serial PRIMARY KEY NOT NULL,
  "code" text NOT NULL,
  "customer_id" integer,
  "customer_name" text NOT NULL,
  "phone" text NOT NULL,
  "address" text NOT NULL,
  "delivery_area_name" text NOT NULL,
  "delivery_charge" integer DEFAULT 0 NOT NULL,
  "subtotal" integer DEFAULT 0 NOT NULL,
  "total" integer DEFAULT 0 NOT NULL,
  "items" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "status" text DEFAULT 'pending' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "orders_code_unique" UNIQUE("code")
);
CREATE TABLE IF NOT EXISTS "products" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "slug" text NOT NULL,
  "category_id" integer NOT NULL,
  "description" text DEFAULT '' NOT NULL,
  "images" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "regular_price" integer NOT NULL,
  "sell_price" integer,
  "cost_price" integer,
  "stock" integer DEFAULT 50 NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "products_slug_unique" UNIQUE("slug")
);
CREATE TABLE IF NOT EXISTS "settings" (
  "id" serial PRIMARY KEY NOT NULL,
  "site_name" text DEFAULT 'Kmcmartbd' NOT NULL,
  "logo_header" text DEFAULT '/assets/logo-header.svg' NOT NULL,
  "logo_footer" text DEFAULT '/assets/logo-footer.svg' NOT NULL,
  "slogan" text DEFAULT 'Smart shopping, happy living — everything you need at your door.' NOT NULL,
  "phone" text DEFAULT '+880 1700-112233' NOT NULL,
  "email" text DEFAULT 'support@kmcmartbd.com' NOT NULL,
  "address" text DEFAULT 'Dhaka, Bangladesh' NOT NULL,
  "facebook" text DEFAULT '#' NOT NULL,
  "instagram" text DEFAULT '#' NOT NULL,
  "youtube" text DEFAULT '#' NOT NULL,
  "whatsapp" text DEFAULT '#' NOT NULL,
  "color_from" text DEFAULT '#FF7A00' NOT NULL,
  "color_to" text DEFAULT '#FF3D77' NOT NULL,
  "all_products_title" text DEFAULT 'All Products' NOT NULL,
  "category_title" text DEFAULT 'Shop by Category' NOT NULL,
  "category_subtitle" text DEFAULT 'Find your favourites from our wide range of collections' NOT NULL,
  "buy_now_text" text DEFAULT 'Buy Now' NOT NULL
);
DO $$ BEGIN
  ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_customers_id_fk"
    FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "products" ADD CONSTRAINT "products_category_id_categories_id_fk"
    FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
`;

const img = (id: number) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=800`;

const slugOf = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

const desc = (n: string) =>
  `${n} — 100% authentic product with brand warranty and quality checked by Kmcmartbd. Cash on delivery available all over Bangladesh with easy 7-day replacement guarantee.`;

type ProductRow = [string, string, string, number, number | null, number];

const PRODUCT_ROWS: ProductRow[] = [
  ["NeonBass TWS Wireless Earbuds With Charging Case", "electronics", img(6867267), 1850, 1190, 42],
  ["EchoWave TWS Earbuds Sunset Edition Deep Bass", "electronics", img(33936400), 1450, 990, 60],
  ["Denim Fit Wireless Earbuds With ENC Mic", "electronics", img(18533839), 1250, 890, 55],
  ["ThunderBass Portable Speaker + Earbuds Combo", "electronics", img(18542241), 2990, 2190, 25],
  ["NeonBlue Pro Gaming Earbuds Low Latency", "electronics", img(17810097), 1690, 1190, 38],
  ["ClearCase Pro TWS Earbuds Transparent Edition", "electronics", img(13727225), 2190, 1590, 30],
  ["PinkPop Mini Wireless Earbuds For Daily Use", "electronics", img(32940456), 990, 690, 80],
  ["DarkGlow ANC Earbuds With Touch Control", "electronics", img(33936401), 2490, 1790, 22],
  ["Galaxy Ultra Pro Max 5G US Variant (12GB/256GB) Official Dual SIM", "mobile-gadgets", img(30639091), 124990, 114990, 8],
  ["Nova X5 Lite Smartphone (8GB/128GB) 90Hz Display", "mobile-gadgets", img(20360344), 21990, 18990, 15],
  ["PixelView V9 (6GB/64GB) AI Camera Phone", "mobile-gadgets", img(20360361), 16990, 14990, 20],
  ["Crimson Note 13 Pro 5G (8GB/256GB)", "mobile-gadgets", img(37467614), 28990, 24990, 12],
  ["Orange Flame X7 With 50MP Triple Camera", "mobile-gadgets", img(23990653), 15990, 12990, 18],
  ["Stealth Mini 5G Compact Flagship Phone", "mobile-gadgets", img(37467615), 34990, 29990, 10],
  ["Premium Cotton Graphic Tee White Relaxed Fit", "mens-fashion", img(2112636), 690, 490, 70],
  ["Sunset Orange Oversized Drop Shoulder T-Shirt", "mens-fashion", img(8148577), 550, 390, 90],
  ["Beige Casual Full Sleeve Cotton Shirt Slim Fit", "mens-fashion", img(11671275), 1150, 840, 45],
  ["Classic White Polo T-Shirt Premium Pique", "mens-fashion", img(7319172), 790, 560, 65],
  ["Soft Pastel Pullover Sweatshirt Winter Edition", "mens-fashion", img(9558699), 1250, 890, 40],
  ["Wardrobe Essentials 5 Piece Combo Pack For Men", "mens-fashion", img(6347892), 1990, 1450, 28],
  ["Elegant Twin Tote Handbag Set Premium PU Leather", "womens-fashion", img(23223849), 1690, 1190, 35],
  ["Designer Party Handbag Golden Chain Edition", "womens-fashion", img(21897141), 1990, 1390, 26],
  ["Chic Shoulder Bag Collection Multi Color", "womens-fashion", img(21897132), 1490, 1040, 33],
  ["Studio Series Quilted Handbag With Sling", "womens-fashion", img(21897127), 1890, 1290, 30],
  ["Trendy Street Style Complete Outfit For Women", "womens-fashion", img(16184558), 2190, 1590, 15],
  ["Luxe Quilted Chain Handbag Premium Finish", "womens-fashion", img(21897314), 2490, 1790, 20],
  ["Street Runner White Chunky Sneakers Unisex", "footwear", img(18202566), 2490, 1790, 40],
  ["AirFlex White Running Sneakers Lightweight", "footwear", img(12628400), 2890, 2190, 32],
  ["RS-X Platform Sneakers Sporty Comfort Sole", "footwear", img(6698234), 3290, 2490, 22],
  ["Pastel Casual Sneakers Soft Foam Cushion", "footwear", img(21263500), 1590, 1190, 48],
  ["Ocean Blue Sport Sneakers Breathable Mesh", "footwear", img(9537434), 1890, 1390, 36],
  ["Rainbow Court Beige Canvas Sneakers", "footwear", img(20191567), 2190, 1690, 27],
  ["Heritage Leather Watch & Wallet Gift Set", "watches-accessories", img(15118335), 2990, 2190, 18],
  ["Minimal Steel Analog Watch Leather Strap", "watches-accessories", img(13695978), 2190, 1590, 30],
  ["Retro Classic Wrist Watch Vintage Dial", "watches-accessories", img(15118341), 1890, 1390, 25],
  ["Gentleman Premium Gift Box (Watch + Perfume Set)", "watches-accessories", img(37900994), 3990, 2990, 12],
  ["Executive Black Chronograph Watch Metal Body", "watches-accessories", img(3380158), 2290, 1690, 28],
  ["Metro Black Analog Watch Minimal Dial", "watches-accessories", img(11403924), 2590, 1890, 24],
  ["GlowCare Skincare Mega Combo Set (Cleanser + Serum + Cream)", "beauty-care", img(5632335), 1490, 1090, 45],
  ["Hydra Dew Korean Skincare Kit 6 In 1", "beauty-care", img(31552020), 1790, 1290, 38],
  ["Vitamin C Brightening Face Serum 30ml", "beauty-care", img(30473041), 890, 640, 70],
  ["Luxury Repair Hair Serum Frizz Control", "beauty-care", img(16652492), 990, 690, 52],
  ["Niacinamide Pore Perfect Serum 10% 30ml", "beauty-care", img(32291052), 850, 590, 60],
  ["RoseGlow Daily Hydration Serum For All Skin", "beauty-care", img(33756890), 750, 520, 48],
  ["Cozy Corner Mug & Cushion Gift Set", "home-living", img(29866936), 990, 690, 40],
  ["Warm Ambient Wooden Table Lamp With Bulb", "home-living", img(10597616), 1450, 1090, 30],
  ["Hygge Throw Blanket + Cushion Cover Combo", "home-living", img(15239051), 1690, 1250, 22],
  ["Study Desk Ambience Combo (Lamp + Mug) Office Setup", "home-living", img(31344577), 1290, 940, 35],
  ["Soft Knit Sofa Blanket Set Winter Warm", "home-living", img(19416999), 1890, 1390, 18],
  ["Cozy Morning Coffee Lover Gift Set", "home-living", img(29749069), 1190, 890, 26],
];

async function isEmpty(tableName: string): Promise<boolean> {
  const result = await db.execute<{ n: number }>(
    sql.raw(`select count(*)::int as n from "${tableName}"`)
  );
  return (result.rows[0]?.n ?? 0) === 0;
}

export async function GET(req: Request) {
  const secret = process.env.SETUP_SECRET;
  if (!secret) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "SETUP_SECRET is not configured. Add it in Netlify → Site configuration → Environment variables, redeploy, then call /api/setup?key=<value>.",
      },
      { status: 503 }
    );
  }

  const key = new URL(req.url).searchParams.get("key");
  if (key !== secret) {
    return NextResponse.json({ ok: false, error: "Invalid key" }, { status: 401 });
  }

  const created: Record<string, number | string> = {};

  try {
    await db.execute(sql.raw(SCHEMA_SQL));
    created.tables = "ready";

    if (await isEmpty("admins")) {
      await db.insert(admins).values({
        email: "atikhasan315377@gmail.com",
        passwordHash: hashPassword("Atik123@@"),
      });
      created.admins = 1;
    }

    if (await isEmpty("settings")) {
      await db.insert(settings).values({
        id: 1,
        siteName: "Kmcmartbd",
        logoHeader: "/assets/logo-header.svg",
        logoFooter: "/assets/logo-footer.svg",
        slogan:
          "Smart shopping, happy living — everything you need at your door.",
        phone: "+880 1700-112233",
        email: "support@kmcmartbd.com",
        address: "Level 4, Block B, Bashundhara City, Dhaka 1215",
        facebook: "https://facebook.com/kmcmartbd",
        instagram: "https://instagram.com/kmcmartbd",
        youtube: "https://youtube.com/@kmcmartbd",
        whatsapp: "https://wa.me/8801700112233",
        colorFrom: "#FF7A00",
        colorTo: "#FF3D77",
        allProductsTitle: "All Products",
        categoryTitle: "Shop by Category",
        categorySubtitle:
          "Find your favourites from our wide range of curated collections",
        buyNowText: "Buy Now",
      });
      created.settings = 1;
    }

    if (await isEmpty("banners")) {
      await db.insert(banners).values([
        { imageUrl: "/assets/banners/banner-1.jpg", alt: "Mega Sale up to 70% off", sortOrder: 1 },
        { imageUrl: "/assets/banners/banner-2.jpg", alt: "Fashion Fest — New Arrivals", sortOrder: 2 },
        { imageUrl: "/assets/banners/banner-3.jpg", alt: "Free Delivery inside Dhaka", sortOrder: 3 },
      ]);
      created.banners = 3;
    }

    if (await isEmpty("menus")) {
      await db.insert(menus).values([
        { label: "Home", href: "/", sortOrder: 1 },
        { label: "Electronics", href: "/category/electronics", sortOrder: 2 },
        { label: "Mobiles", href: "/category/mobile-gadgets", sortOrder: 3 },
        { label: "Men's Fashion", href: "/category/mens-fashion", sortOrder: 4 },
        { label: "Women's Fashion", href: "/category/womens-fashion", sortOrder: 5 },
        { label: "Footwear", href: "/category/footwear", sortOrder: 6 },
        { label: "Watches", href: "/category/watches-accessories", sortOrder: 7 },
        { label: "Beauty", href: "/category/beauty-care", sortOrder: 8 },
        { label: "Home & Living", href: "/category/home-living", sortOrder: 9 },
      ]);
      created.menus = 9;
    }

    if (await isEmpty("delivery_areas")) {
      await db.insert(deliveryAreas).values([
        { name: "Inside Dhaka", charge: 100, sortOrder: 1 },
        { name: "Dhaka Sub Area (Savar / Gazipur / Narayanganj)", charge: 110, sortOrder: 2 },
        { name: "Outside Dhaka", charge: 120, sortOrder: 3 },
        { name: "Chittagong City", charge: 120, sortOrder: 4 },
      ]);
      created.deliveryAreas = 4;
    }

    if (await isEmpty("categories")) {
      await db.insert(categories).values([
        { name: "Electronics", slug: "electronics", imageUrl: img(18542241), sortOrder: 1, showOnHome: true },
        { name: "Mobile & Gadgets", slug: "mobile-gadgets", imageUrl: img(30639091), sortOrder: 2, showOnHome: false },
        { name: "Men's Fashion", slug: "mens-fashion", imageUrl: img(2112636), sortOrder: 3, showOnHome: true },
        { name: "Women's Fashion", slug: "womens-fashion", imageUrl: img(21897141), sortOrder: 4, showOnHome: false },
        { name: "Footwear", slug: "footwear", imageUrl: img(18202566), sortOrder: 5, showOnHome: true },
        { name: "Watches & Accessories", slug: "watches-accessories", imageUrl: img(13695978), sortOrder: 6, showOnHome: false },
        { name: "Beauty & Care", slug: "beauty-care", imageUrl: img(5632335), sortOrder: 7, showOnHome: true },
        { name: "Home & Living", slug: "home-living", imageUrl: img(29866936), sortOrder: 8, showOnHome: false },
      ]);
      created.categories = 8;
    }

    if (await isEmpty("products")) {
      const cats = await db
        .select({ id: categories.id, slug: categories.slug })
        .from(categories);
      const bySlug = new Map(cats.map((c) => [c.slug, c.id]));

      const values = PRODUCT_ROWS.filter(([, catSlug]) => bySlug.has(catSlug)).map(
        ([name, catSlug, image, regularPrice, sellPrice, stock]) => ({
          name,
          slug: slugOf(name),
          categoryId: bySlug.get(catSlug) as number,
          description: desc(name),
          images: [image],
          regularPrice,
          sellPrice,
          costPrice: Math.round((sellPrice ?? regularPrice) * 0.66),
          stock,
          isActive: true,
        })
      );

      if (values.length > 0) {
        await db.insert(products).values(values);
        created.products = values.length;
      }
    }

    return NextResponse.json({
      ok: true,
      message:
        "Database is ready. Log in at /admin/login and then remove the SETUP_SECRET environment variable.",
      created,
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
        created,
      },
      { status: 500 }
    );
  }
}
