import "dotenv/config";
import { eq, sql } from "drizzle-orm";
import { db } from "./index";
import {
  admins,
  banners,
  categories,
  deliveryAreas,
  menus,
  orderStatuses,
  orders,
  products,
  settings,
  type OrderItem,
} from "./schema";
import { hashPassword } from "@/lib/auth";

const img = (id: number) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=800`;

async function main() {
  console.log("Seeding database...");

  await db.execute(
    sql`TRUNCATE TABLE orders, customers, products, categories, banners, menus, delivery_areas, order_statuses, settings, admins RESTART IDENTITY CASCADE`
  );

  /* ---------------- order statuses ---------------- */
  await db.insert(orderStatuses).values([
    { key: "pending", label: "Pending", color: "#F59E0B", sortOrder: 1, isSystem: true },
    { key: "confirmed", label: "On The Way", color: "#0EA5E9", sortOrder: 2, isSystem: true },
    { key: "delivered", label: "Delivered", color: "#10B981", sortOrder: 3, isSystem: true },
    { key: "cancelled", label: "Cancelled", color: "#F43F5E", sortOrder: 4, isSystem: true },
  ]);

  /* ---------------- main admin ---------------- */
  await db.insert(admins).values({
    name: "Atik Hasan",
    email: "atikhasan315377@gmail.com",
    passwordHash: hashPassword("Atik123@@"),
    role: "owner",
    permissions: [
      "orders",
      "products",
      "categories",
      "banners",
      "menus",
      "delivery",
      "customers",
      "reports",
      "api",
      "roles",
      "settings",
    ],
    isActive: true,
  });

  /* ---------------- settings ---------------- */
  await db.insert(settings).values({
    id: 1,
    siteName: "KmcBazar",
    logoHeader: "/assets/logo-header.svg",
    logoFooter: "/assets/logo-footer.svg",
    slogan: "Smart shopping, happy living — everything you need at your door.",
    phone: "+880 1700-112233",
    email: "support@kmcbazar.com",
    address: "Level 4, Block B, Bashundhara City, Dhaka 1215",
    facebook: "https://facebook.com/kmcbazarbd",
    instagram: "https://instagram.com/kmcbazarbd",
    youtube: "https://youtube.com/@kmcbazarbd",
    whatsapp: "https://wa.me/8801700112233",
    colorFrom: "#FF7A00",
    colorTo: "#FF3D77",
    allProductsTitle: "All Products",
    categoryTitle: "Shop by Category",
    categorySubtitle:
      "Find your favourites from our wide range of curated collections",
    buyNowText: "Buy Now",
  });

  await db.insert(banners).values([
    { imageUrl: "/assets/banners/banner-1.jpg", alt: "Mega Sale up to 70% off", sortOrder: 1 },
    { imageUrl: "/assets/banners/banner-2.jpg", alt: "Fashion Fest — New Arrivals", sortOrder: 2 },
    { imageUrl: "/assets/banners/banner-3.jpg", alt: "Free Delivery inside Dhaka", sortOrder: 3 },
  ]);

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

  const cats = await db
    .insert(categories)
    .values([
      { name: "Electronics", slug: "electronics", imageUrl: img(18542241), sortOrder: 1, showOnHome: true },
      { name: "Mobile & Gadgets", slug: "mobile-gadgets", imageUrl: img(30639091), sortOrder: 2, showOnHome: false },
      { name: "Men's Fashion", slug: "mens-fashion", imageUrl: img(2112636), sortOrder: 3, showOnHome: true },
      { name: "Women's Fashion", slug: "womens-fashion", imageUrl: img(21897141), sortOrder: 4, showOnHome: false },
      { name: "Footwear", slug: "footwear", imageUrl: img(18202566), sortOrder: 5, showOnHome: true },
      { name: "Watches & Accessories", slug: "watches-accessories", imageUrl: img(13695978), sortOrder: 6, showOnHome: false },
      { name: "Beauty & Care", slug: "beauty-care", imageUrl: img(5632335), sortOrder: 7, showOnHome: true },
      { name: "Home & Living", slug: "home-living", imageUrl: img(29866936), sortOrder: 8, showOnHome: false },
    ])
    .returning();

  const cid = (slug: string) => cats.find((c) => c.slug === slug)!.id;

  const desc = (n: string) =>
    `${n} — 100% authentic product with brand warranty and quality checked by KmcBazar. Cash on delivery available all over Bangladesh with easy 7-day replacement guarantee.`;

  type P = [string, string, string, number, number | null, number];
  const rows: P[] = [
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

  const slugOf = (name: string) =>
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80);

  const insertedProducts = await db
    .insert(products)
    .values(
      rows.map(([name, catSlug, image, regularPrice, sellPrice, stock]) => ({
        name,
        slug: slugOf(name),
        categoryId: cid(catSlug),
        description: desc(name),
        images: [image],
        regularPrice,
        sellPrice,
        costPrice: Math.round((sellPrice ?? regularPrice) * 0.66),
        stock,
        isActive: true,
      }))
    )
    .returning();

  const areas = await db
    .insert(deliveryAreas)
    .values([
      { name: "Inside Dhaka", charge: 100, sortOrder: 1 },
      { name: "Dhaka Sub Area (Savar / Gazipur / Narayanganj)", charge: 110, sortOrder: 2 },
      { name: "Outside Dhaka", charge: 120, sortOrder: 3 },
      { name: "Chittagong City", charge: 120, sortOrder: 4 },
    ])
    .returning();

  /* ---------------- demo orders (last 30 days) ---------------- */
  const names = [
    "Rahim Uddin", "Sadia Akter", "Tanvir Hasan", "Nusrat Jahan",
    "Arif Chowdhury", "Mim Rahman", "Shakib Khan", "Farhana Yeasmin",
    "Rakibul Islam", "Priya Das", "Mehedi Hasan", "Sumaiya Islam",
  ];
  const addresses = [
    "House 12, Road 5, Dhanmondi, Dhaka",
    "Flat 4B, Green Road, Farmgate, Dhaka",
    "House 7, Block C, Mirpur 10, Dhaka",
    "Village Shibpur, Narsingdi Sadar",
    "House 22, GEC Circle, Chattogram",
    "Road 3, Banani, Dhaka",
    "Zindabazar, Sylhet",
    "Sonadanga, Khulna",
  ];
  const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];
  const rndPhone = () =>
    `01${pick(["3", "5", "6", "7", "8", "9"])}${String(
      Math.floor(10000000 + Math.random() * 89999999)
    )}`;

  const dayMs = 24 * 3600 * 1000;
  const now = Date.now();
  const demoOrders: (typeof orders.$inferInsert)[] = [];

  for (let day = 29; day >= 0; day--) {
    const base = now - day * dayMs;
    const orderCount =
      day === 0 ? 3 : Math.random() < 0.72 ? 1 + Math.floor(Math.random() * 3) : 0;

    for (let k = 0; k < orderCount; k++) {
      const itemCount = 1 + Math.floor(Math.random() * 3);
      const chosen = new Set<number>();
      const items: OrderItem[] = [];
      for (let j = 0; j < itemCount; j++) {
        let idx = Math.floor(Math.random() * insertedProducts.length);
        while (chosen.has(idx)) idx = Math.floor(Math.random() * insertedProducts.length);
        chosen.add(idx);
        const p = insertedProducts[idx];
        items.push({
          productId: p.id,
          name: p.name,
          image: (p.images && p.images[0]) || "",
          price: p.sellPrice ?? p.regularPrice,
          qty: 1 + Math.floor(Math.random() * 2),
        });
      }
      const area = pick(areas);
      const subtotal = items.reduce((a, i) => a + i.price * i.qty, 0);

      let status: string;
      const r = Math.random();
      if (day === 0) status = ["pending", "confirmed", "delivered"][k % 3];
      else if (day <= 2) status = r < 0.4 ? "pending" : r < 0.75 ? "confirmed" : r < 0.9 ? "delivered" : "cancelled";
      else status = r < 0.66 ? "delivered" : r < 0.78 ? "confirmed" : r < 0.9 ? "pending" : "cancelled";

      const created = new Date(base - Math.floor(Math.random() * 10 * 3600 * 1000));

      demoOrders.push({
        code: "",
        customerName: pick(names),
        phone: rndPhone(),
        address: pick(addresses),
        deliveryAreaName: area.name,
        deliveryCharge: area.charge,
        subtotal,
        total: subtotal + area.charge,
        items,
        status,
        createdAt: created,
      });
    }
  }

  demoOrders.sort((a, b) => (a.createdAt as Date).getTime() - (b.createdAt as Date).getTime());

  for (const o of demoOrders) {
    const [ins] = await db.insert(orders).values(o).returning({ id: orders.id });
    await db
      .update(orders)
      .set({ code: String(ins.id).padStart(6, "0") })
      .where(eq(orders.id, ins.id));
  }

  console.log(`Seed complete ✔ (${demoOrders.length} demo orders)`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
