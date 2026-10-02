import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";

export type OrderItem = {
  productId: number;
  name: string;
  image: string;
  price: number;
  qty: number;
};

export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  siteName: text("site_name").notNull().default("Kmcmartbd"),
  logoHeader: text("logo_header").notNull().default("/assets/logo-header.svg"),
  logoFooter: text("logo_footer").notNull().default("/assets/logo-footer.svg"),
  slogan: text("slogan")
    .notNull()
    .default("Smart shopping, happy living — everything you need at your door."),
  phone: text("phone").notNull().default("+880 1700-112233"),
  email: text("email").notNull().default("support@kmcmartbd.com"),
  address: text("address").notNull().default("Dhaka, Bangladesh"),
  facebook: text("facebook").notNull().default("#"),
  instagram: text("instagram").notNull().default("#"),
  youtube: text("youtube").notNull().default("#"),
  whatsapp: text("whatsapp").notNull().default("#"),
  colorFrom: text("color_from").notNull().default("#FF7A00"),
  colorTo: text("color_to").notNull().default("#FF3D77"),
  allProductsTitle: text("all_products_title").notNull().default("All Products"),
  categoryTitle: text("category_title").notNull().default("Shop by Category"),
  categorySubtitle: text("category_subtitle")
    .notNull()
    .default("Find your favourites from our wide range of collections"),
  buyNowText: text("buy_now_text").notNull().default("Buy Now"),
});

export const menus = pgTable("menus", {
  id: serial("id").primaryKey(),
  label: text("label").notNull(),
  href: text("href").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
});

export const banners = pgTable("banners", {
  id: serial("id").primaryKey(),
  imageUrl: text("image_url").notNull(),
  alt: text("alt").notNull().default("Banner"),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
});

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  imageUrl: text("image_url").notNull().default(""),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  showOnHome: boolean("show_on_home").notNull().default(false),
});

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  categoryId: integer("category_id")
    .notNull()
    .references(() => categories.id),
  description: text("description").notNull().default(""),
  images: jsonb("images").$type<string[]>().notNull().default([]),
  regularPrice: integer("regular_price").notNull(),
  sellPrice: integer("sell_price"),
  costPrice: integer("cost_price"),
  stock: integer("stock").notNull().default(50),
  /** When true this product ships free — the admin sets it per product. */
  freeDelivery: boolean("free_delivery").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const deliveryAreas = pgTable("delivery_areas", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  charge: integer("charge").notNull().default(0),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
});

export const admins = pgTable("admins", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().default(""),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  /** "owner" is the first admin — it always keeps every permission. */
  role: text("role").notNull().default("manager"),
  /** Permission keys from ADMIN_PERMISSIONS; ignored for the owner. */
  permissions: jsonb("permissions").$type<string[]>().notNull().default([]),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  customerId: integer("customer_id").references(() => customers.id),
  customerName: text("customer_name").notNull(),
  phone: text("phone").notNull(),
  address: text("address").notNull(),
  deliveryAreaName: text("delivery_area_name").notNull(),
  deliveryCharge: integer("delivery_charge").notNull().default(0),
  subtotal: integer("subtotal").notNull().default(0),
  total: integer("total").notNull().default(0),
  items: jsonb("items").$type<OrderItem[]>().notNull().default([]),
  status: text("status").notNull().default("pending"),
  /** Visitor IP captured at checkout — used by the admin fraud panel. */
  customerIp: text("customer_ip"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Admin = typeof admins.$inferSelect;

export type Settings = typeof settings.$inferSelect;
export type Menu = typeof menus.$inferSelect;
export type Banner = typeof banners.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Product = typeof products.$inferSelect;
export type DeliveryArea = typeof deliveryAreas.$inferSelect;
export type Customer = typeof customers.$inferSelect;
export type Order = typeof orders.$inferSelect;

export type ProductLite = {
  id: number;
  name: string;
  slug: string;
  image: string;
  regularPrice: number;
  sellPrice: number | null;
  /** When true this product ships free — the cart waives the delivery charge
      as long as every item in it is a free-delivery product. */
  freeDelivery: boolean;
};
