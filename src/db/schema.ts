import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  real,
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
  siteName: text("site_name").notNull().default("Kmcbazar"),
  logoHeader: text("logo_header").notNull().default("/assets/logo-header.svg"),
  logoFooter: text("logo_footer").notNull().default("/assets/logo-footer.svg"),
  slogan: text("slogan")
    .notNull()
    .default("Smart shopping, happy living — everything you need at your door."),
  phone: text("phone").notNull().default("+880 1700-112233"),
  email: text("email").notNull().default("support@kmcbazar.com"),
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
  /* ---- STEP 7 ---- */
  /** Browser tab title. Empty = "<siteName> — Best Online Shopping in Bangladesh". */
  metaTitle: text("meta_title").notNull().default(""),
  /** Meta description. Empty = the slogan. */
  metaDescription: text("meta_description").notNull().default(""),
  /** Favicon URL or data URL. */
  favicon: text("favicon").notNull().default("/favicon.ico"),
  /** "image" = uploaded logo, "text" = site name rendered in the brand gradient. */
  logoMode: text("logo_mode").notNull().default("image"),
  /** Wordmark used when logoMode is "text". Empty falls back to siteName. */
  logoText: text("logo_text").notNull().default(""),
  /** Storefront language: "en" | "bn". */
  language: text("language").notNull().default("en"),
  /** Per-language string overrides keyed "<lang>:<key>". */
  textOverrides: jsonb("text_overrides").$type<Record<string, string>>().notNull().default({}),
  /** Admin sidebar: "expanded" | "collapsed" | "remember". */
  adminMenuMode: text("admin_menu_mode").notNull().default("remember"),
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

/**
 * Order status vocabulary the admin can extend.
 * The four `isSystem` rows (pending / confirmed / delivered / cancelled) are
 * seeded once and can never be deleted — reports, the dashboard and the fraud
 * score all key off them. Everything else is a custom, admin-made status.
 */
export const orderStatuses = pgTable("order_statuses", {
  id: serial("id").primaryKey(),
  /** Stored in `orders.status` — slug, immutable once created. */
  key: text("key").notNull().unique(),
  label: text("label").notNull(),
  /** Hex colour (#RRGGBB) used for the chip, dot and select. */
  color: text("color").notNull().default("#6B7280"),
  sortOrder: integer("sort_order").notNull().default(0),
  isSystem: boolean("is_system").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
});

/**
 * One-row courier provider configuration, edited on /admin/api.
 * `apiKey` / `secretKey` are stored encrypted (see `src/lib/courier-crypto.ts`)
 * and are never sent back to the browser in full.
 */
export const courierConfig = pgTable("courier_config", {
  id: serial("id").primaryKey(),
  /** Only "steadfast" today — the column exists so a second courier can be added. */
  provider: text("provider").notNull().default("steadfast"),
  baseUrl: text("base_url").notNull().default("https://portal.packzy.com/api/v1"),
  apiKey: text("api_key").notNull().default(""),
  secretKey: text("secret_key").notNull().default(""),
  /** Master switch — off means the Courier buttons stay disabled. */
  isActive: boolean("is_active").notNull().default(false),
  /** Order status key an order moves to right after a successful send. */
  sentStatusKey: text("sent_status_key").notNull().default("confirmed"),
  /** Cached balance so the panel can show a number without calling out every render. */
  lastBalance: integer("last_balance"),
  lastCheckedAt: timestamp("last_checked_at", { withTimezone: true }),
  /** Last connection-test result, shown on the API page. */
  lastError: text("last_error").notNull().default(""),
  /** Master switch for the scheduled delivery-status sync. */
  autoSync: boolean("auto_sync").notNull().default(true),
  lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
  /** How many orders the last sync actually touched. */
  lastSyncCount: integer("last_sync_count"),
  lastSyncError: text("last_sync_error").notNull().default(""),
});

/**
 * Third-party phone reputation (fraudchecker.link).
 * Separate from courier_config because it is a different vendor with its own
 * key — switching courier must not disturb fraud checking, or the reverse.
 */
export const fraudConfig = pgTable("fraud_config", {
  id: serial("id").primaryKey(),
  provider: text("provider").notNull().default("fraudchecker"),
  baseUrl: text("base_url").notNull().default("https://fraudchecker.link/api/v1/qc/"),
  /** Encrypted at rest, same scheme as the courier keys. */
  apiKey: text("api_key").notNull().default(""),
  isActive: boolean("is_active").notNull().default(false),
  /** Check every new order automatically, the moment it is placed. */
  autoCheck: boolean("auto_check").notNull().default(true),
  /** A report younger than this is reused instead of spending another call. */
  cacheHours: integer("cache_hours").notNull().default(24),
  lastCheckedAt: timestamp("last_checked_at", { withTimezone: true }),
  lastError: text("last_error").notNull().default(""),
});

export type FraudCourierRow = { name: string; total: number; delivered: number; cancelled: number };

/**
 * One cached report per phone number. Keyed by phone rather than by order so a
 * repeat customer costs one lookup, not one per order.
 */
export const fraudReports = pgTable("fraud_reports", {
  id: serial("id").primaryKey(),
  phone: text("phone").notNull().unique(),
  totalParcels: integer("total_parcels").notNull().default(0),
  totalDelivered: integer("total_delivered").notNull().default(0),
  totalCancelled: integer("total_cancelled").notNull().default(0),
  /** Percentage as the provider reports it, e.g. 88.89. */
  deliveryRate: real("delivery_rate").notNull().default(0),
  riskStatus: text("risk_status").notNull().default(""),
  /** Per-courier breakdown, already sorted by parcel count. */
  couriers: jsonb("couriers").$type<FraudCourierRow[]>().notNull().default([]),
  checkedAt: timestamp("checked_at", { withTimezone: true }).notNull().defaultNow(),
  /** Non-empty when the last attempt failed; the row is kept so we can show why. */
  error: text("error").notNull().default(""),
});

export type FraudConfigRow = typeof fraudConfig.$inferSelect;
export type FraudReportRow = typeof fraudReports.$inferSelect;

/**
 * Marketing / analytics tags the shop owner pastes in from the API page.
 *
 * Several can be live at once — a GTM container, a GA4 property and a Google
 * Ads conversion id is a normal combination — so this is a table rather than
 * a handful of columns on `settings`.
 *
 * Only an identifier is stored, never a raw <script> block: the site builds
 * the snippet itself from a known template. A compromised admin account
 * therefore cannot turn this into arbitrary JavaScript on the storefront.
 */
export const trackingTags = pgTable("tracking_tags", {
  id: serial("id").primaryKey(),
  /** One of TRACKING_PROVIDERS — gtm, ga4, gads, meta, verification. */
  provider: text("provider").notNull(),
  /** The owner's own note, e.g. "Main GA4" — shown in the list. */
  label: text("label").notNull().default(""),
  /** GTM-XXXXXXX, G-XXXXXXXXXX, AW-123456789, a pixel id, a verification token. */
  tagId: text("tag_id").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type TrackingTag = typeof trackingTags.$inferSelect;

export const metaPixels = pgTable("meta_pixels", {
  id: serial("id").primaryKey(),
  label: text("label").notNull().default(""),
  pixelId: text("pixel_id").notNull().unique(),
  accessToken: text("access_token").notNull().default(""),
  testEventCode: text("test_event_code").notNull().default(""),
  isActive: boolean("is_active").notNull().default(true),
  events: jsonb("events").$type<string[]>().notNull().default(["PageView", "ViewContent", "AddToCart", "InitiateCheckout", "Purchase"]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type MetaPixel = typeof metaPixels.$inferSelect;

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
  /* ---- courier (STEP 8) ---- */
  /** Set once the parcel is booked — its presence is what blocks a second send. */
  courierConsignmentId: text("courier_consignment_id"),
  courierTrackingCode: text("courier_tracking_code"),
  courierTrackingLink: text("courier_tracking_link"),
  /** Raw delivery_status from the courier, refreshed on demand. */
  courierStatus: text("courier_status"),
  courierSentAt: timestamp("courier_sent_at", { withTimezone: true }),
  /** Last time the sync asked the courier about this parcel — drives the queue order. */
  courierCheckedAt: timestamp("courier_checked_at", { withTimezone: true }),
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
export type OrderStatusRow = typeof orderStatuses.$inferSelect;
export type CourierConfigRow = typeof courierConfig.$inferSelect;
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
