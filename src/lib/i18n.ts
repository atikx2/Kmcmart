/**
 * Storefront language + editable text.
 *
 * Client-safe: no DB imports, so both server components and `"use client"`
 * files can pull from it.
 *
 * Every visible storefront string lives here with an English and a Bangla
 * version. The admin picks the language in Site Settings and can overwrite any
 * single string per language — overrides are stored in `settings.textOverrides`
 * keyed `"<lang>:<key>"`.
 */

export const LANGUAGES = [
  { key: "en", label: "English", native: "English", htmlLang: "en" },
  { key: "bn", label: "Bangla", native: "বাংলা", htmlLang: "bn" },
] as const;

export type Lang = (typeof LANGUAGES)[number]["key"];

export function isLang(v: unknown): v is Lang {
  return v === "en" || v === "bn";
}

type Entry = { en: string; bn: string; group: TextGroup; label: string };

export type TextGroup =
  | "Buttons"
  | "Headings"
  | "Header & Menu"
  | "Cart"
  | "Checkout"
  | "Product"
  | "Order Complete"
  | "Account"
  | "Footer"
  | "Messages";

export const TEXT_GROUPS: TextGroup[] = [
  "Buttons",
  "Headings",
  "Header & Menu",
  "Product",
  "Cart",
  "Checkout",
  "Order Complete",
  "Account",
  "Footer",
  "Messages",
];

export const UI_TEXT = {
  /* ---------------- buttons ---------------- */
  buyNow: { en: "Buy Now", bn: "অর্ডার করুন", group: "Buttons", label: "Buy Now button" },
  addToCart: { en: "Add to Cart", bn: "কার্টে যোগ করুন", group: "Buttons", label: "Add to Cart button" },
  continueShopping: { en: "Continue Shopping", bn: "কেনাকাটা চালিয়ে যান", group: "Buttons", label: "Continue Shopping" },
  proceedToCheckout: { en: "Proceed to Checkout", bn: "চেকআউট করুন", group: "Buttons", label: "Proceed to Checkout" },
  placeOrder: { en: "Place Order", bn: "অর্ডার কনফার্ম করুন", group: "Buttons", label: "Place Order button" },
  placingOrder: { en: "Placing Order…", bn: "অর্ডার হচ্ছে…", group: "Buttons", label: "Place Order (while saving)" },
  loadMore: { en: "Load More", bn: "আরও দেখুন", group: "Buttons", label: "Load More button" },
  viewAll: { en: "View All", bn: "সব দেখুন", group: "Buttons", label: "View All link" },
  callNow: { en: "Call", bn: "কল করুন", group: "Buttons", label: "Call button" },

  /* ---------------- headings ---------------- */
  categoryTitle: { en: "Shop by Category", bn: "ক্যাটাগরি অনুযায়ী কিনুন", group: "Headings", label: "Category section title" },
  categorySubtitle: {
    en: "Find your favourites from our wide range of collections",
    bn: "আমাদের বিশাল কালেকশন থেকে আপনার পছন্দের পণ্য বেছে নিন",
    group: "Headings",
    label: "Category section subtitle",
  },
  categoryEyebrow: { en: "Top Categories", bn: "জনপ্রিয় ক্যাটাগরি", group: "Headings", label: "Category section eyebrow" },
  allProductsTitle: { en: "All Products", bn: "সব পণ্য", group: "Headings", label: "All products section title" },
  featuredEyebrow: { en: "Featured Collection", bn: "ফিচার্ড কালেকশন", group: "Headings", label: "All products eyebrow" },
  categorySectionEyebrow: { en: "Category", bn: "ক্যাটাগরি", group: "Headings", label: "Home category block eyebrow" },
  relatedTitle: { en: "Related Products", bn: "সম্পর্কিত পণ্য", group: "Headings", label: "Related products title" },
  relatedEyebrow: { en: "You may also like", bn: "আপনার পছন্দ হতে পারে", group: "Headings", label: "Related products eyebrow" },
  searchResultsTitle: { en: "Search Products", bn: "পণ্য খুঁজুন", group: "Headings", label: "Search page title" },
  searchResultsFor: { en: "Results for", bn: "ফলাফল", group: "Headings", label: "Search results prefix" },

  /* ---------------- header & menu ---------------- */
  navHome: { en: "Home", bn: "হোম", group: "Header & Menu", label: "Home link" },
  navAccount: { en: "Account", bn: "অ্যাকাউন্ট", group: "Header & Menu", label: "Account label" },
  navCart: { en: "Cart", bn: "কার্ট", group: "Header & Menu", label: "Cart label" },
  navMenu: { en: "Menu", bn: "মেনু", group: "Header & Menu", label: "Menu label" },
  navSearch: { en: "Search", bn: "সার্চ", group: "Header & Menu", label: "Search label" },
  searchPlaceholder: { en: "Search products…", bn: "পণ্য খুঁজুন…", group: "Header & Menu", label: "Search box placeholder" },
  login: { en: "Login", bn: "লগইন", group: "Header & Menu", label: "Login" },
  register: { en: "Register", bn: "রেজিস্ট্রেশন", group: "Header & Menu", label: "Register" },
  logout: { en: "Logout", bn: "লগআউট", group: "Header & Menu", label: "Logout" },
  hotline: { en: "Hotline", bn: "হটলাইন", group: "Header & Menu", label: "Hotline label" },

  /* ---------------- product ---------------- */
  inStock: { en: "In Stock", bn: "স্টকে আছে", group: "Product", label: "In stock" },
  outOfStock: { en: "Out of Stock", bn: "স্টক শেষ", group: "Product", label: "Out of stock" },
  pcs: { en: "pcs", bn: "পিস", group: "Product", label: "Pieces short form" },
  quantity: { en: "Quantity", bn: "পরিমাণ", group: "Product", label: "Quantity label" },
  descriptionTitle: { en: "Description", bn: "বিবরণ", group: "Product", label: "Description heading" },
  freeDelivery: { en: "Free Delivery", bn: "ফ্রি ডেলিভারি", group: "Product", label: "Free delivery badge" },
  homeDelivery: { en: "Home Delivery", bn: "হোম ডেলিভারি", group: "Product", label: "Home delivery badge" },
  noDeliveryCharge: { en: "No delivery charge", bn: "কোনো ডেলিভারি চার্জ নেই", group: "Product", label: "No delivery charge" },
  chargeFrom: { en: "Charge from", bn: "চার্জ শুরু", group: "Product", label: "Delivery charge from" },
  genuineTitle: { en: "100% Genuine", bn: "১০০% আসল পণ্য", group: "Product", label: "Genuine badge" },
  genuineSub: { en: "Quality checked", bn: "মান যাচাই করা", group: "Product", label: "Genuine badge sub" },
  returnTitle: { en: "Easy Return", bn: "সহজ রিটার্ন", group: "Product", label: "Return badge" },
  returnSub: { en: "7 days replacement", bn: "৭ দিনে রিপ্লেসমেন্ট", group: "Product", label: "Return badge sub" },
  cashOnDeliveryNote: { en: "Cash on delivery available", bn: "ক্যাশ অন ডেলিভারি সুবিধা আছে", group: "Product", label: "Cash on delivery note" },
  fastDeliveryTitle: { en: "Fast Delivery", bn: "দ্রুত ডেলিভারি", group: "Product", label: "Trust bar — fast delivery" },
  fastDeliverySub: { en: "All over Bangladesh", bn: "সারা বাংলাদেশে", group: "Product", label: "Trust bar — fast delivery sub" },
  authenticTitle: { en: "100% Authentic", bn: "১০০% অরিজিনাল", group: "Product", label: "Trust bar — authentic" },
  supportTitle: { en: "Support", bn: "সাপোর্ট", group: "Product", label: "Trust bar — support" },
  supportSub: { en: "9 AM – 11 PM everyday", bn: "প্রতিদিন সকাল ৯টা – রাত ১১টা", group: "Product", label: "Trust bar — support hours" },
  off: { en: "OFF", bn: "ছাড়", group: "Product", label: "Discount badge" },

  /* ---------------- cart ---------------- */
  cartTitle: { en: "Shopping Cart", bn: "শপিং কার্ট", group: "Cart", label: "Cart drawer title" },
  cartEmpty: { en: "Your cart is empty", bn: "আপনার কার্ট খালি", group: "Cart", label: "Empty cart title" },
  cartEmptyHint: { en: "Add some products to get started", bn: "কেনাকাটা শুরু করতে পণ্য যোগ করুন", group: "Cart", label: "Empty cart hint" },
  subtotal: { en: "Subtotal", bn: "সাবটোটাল", group: "Cart", label: "Subtotal" },
  free: { en: "Free", bn: "ফ্রি", group: "Cart", label: "Free (price)" },
  freeDeliveryOnOrder: { en: "Free delivery on this order", bn: "এই অর্ডারে ডেলিভারি ফ্রি", group: "Cart", label: "Free delivery note" },
  deliveryAtCheckout: { en: "Delivery charge is added at checkout", bn: "ডেলিভারি চার্জ চেকআউটে যোগ হবে", group: "Cart", label: "Delivery note" },

  /* ---------------- checkout ---------------- */
  checkoutTitle: { en: "Checkout", bn: "চেকআউট", group: "Checkout", label: "Checkout title" },
  checkoutSubtitle: {
    en: "Fill up the form below — we will call to confirm your order",
    bn: "নিচের ফর্মটি পূরণ করুন — আমরা কল দিয়ে অর্ডার কনফার্ম করবো",
    group: "Checkout",
    label: "Checkout subtitle",
  },
  shippingInfo: { en: "Shipping Information", bn: "ডেলিভারির তথ্য", group: "Checkout", label: "Shipping section title" },
  fullName: { en: "Full Name", bn: "পুরো নাম", group: "Checkout", label: "Name field" },
  fullNamePlaceholder: { en: "e.g. Rahim Uddin", bn: "যেমনঃ রহিম উদ্দিন", group: "Checkout", label: "Name placeholder" },
  mobileNumber: { en: "Mobile Number", bn: "মোবাইল নম্বর", group: "Checkout", label: "Phone field" },
  deliveryArea: { en: "Delivery Area", bn: "ডেলিভারি এলাকা", group: "Checkout", label: "Delivery area field" },
  selectArea: { en: "Select area", bn: "এলাকা নির্বাচন করুন", group: "Checkout", label: "Area placeholder" },
  fullAddress: { en: "Full Address", bn: "সম্পূর্ণ ঠিকানা", group: "Checkout", label: "Address field" },
  addressPlaceholder: {
    en: "House, Road, Area, City — e.g. House 12, Road 5, Dhanmondi, Dhaka",
    bn: "বাসা, রোড, এলাকা, শহর — যেমনঃ বাসা ১২, রোড ৫, ধানমন্ডি, ঢাকা",
    group: "Checkout",
    label: "Address placeholder",
  },
  orderSummary: { en: "Order Summary", bn: "অর্ডার সামারি", group: "Checkout", label: "Order summary title" },
  deliveryCharge: { en: "Delivery Charge", bn: "ডেলিভারি চার্জ", group: "Checkout", label: "Delivery charge row" },
  total: { en: "Total", bn: "সর্বমোট", group: "Checkout", label: "Total row" },
  itemsWord: { en: "items", bn: "টি পণ্য", group: "Checkout", label: "Items word" },
  freeDeliveryApplied: { en: "Free delivery applied to this order", bn: "এই অর্ডারে ফ্রি ডেলিভারি প্রযোজ্য", group: "Checkout", label: "Free delivery applied" },
  freeShipNote: { en: "Every product in this order ships free — no delivery charge.", bn: "এই অর্ডারের সব পণ্যে ডেলিভারি ফ্রি — কোনো চার্জ লাগবে না।", group: "Checkout", label: "Free shipping note" },
  cashOnDelivery: { en: "Cash on Delivery", bn: "ক্যাশ অন ডেলিভারি", group: "Checkout", label: "Cash on delivery" },
  securedNote: { en: "Your information is safe with us", bn: "আপনার তথ্য আমাদের কাছে নিরাপদ", group: "Checkout", label: "Secure note" },

  /* ---------------- order complete ---------------- */
  thankYou: { en: "Thank You", bn: "ধন্যবাদ", group: "Order Complete", label: "Thank you heading" },
  orderPlaced: { en: "Your order has been placed successfully.", bn: "আপনার অর্ডারটি সফলভাবে সম্পন্ন হয়েছে।", group: "Order Complete", label: "Order placed message" },
  orderId: { en: "Order ID", bn: "অর্ডার আইডি", group: "Order Complete", label: "Order id label" },
  orderDetails: { en: "Order Details", bn: "অর্ডারের বিবরণ", group: "Order Complete", label: "Order details title" },
  stepCallTitle: { en: "Confirmation Call", bn: "কনফার্মেশন কল", group: "Order Complete", label: "Step 1 title" },
  stepCallSub: { en: "We will call you shortly", bn: "আমরা শীঘ্রই কল করবো", group: "Order Complete", label: "Step 1 sub" },
  stepPackTitle: { en: "Packing", bn: "প্যাকিং", group: "Order Complete", label: "Step 2 title" },
  stepPackSub: { en: "Your order gets packed", bn: "আপনার অর্ডার প্যাক হচ্ছে", group: "Order Complete", label: "Step 2 sub" },
  stepDeliveryTitle: { en: "Delivery", bn: "ডেলিভারি", group: "Order Complete", label: "Step 3 title" },
  stepDeliverySub: { en: "Within 24–72 hours", bn: "২৪–৭২ ঘণ্টার মধ্যে", group: "Order Complete", label: "Step 3 sub" },
  deliveryWord: { en: "Delivery", bn: "ডেলিভারি", group: "Order Complete", label: "Delivery row" },

  /* ---------------- account ---------------- */
  myAccount: { en: "My Account", bn: "আমার অ্যাকাউন্ট", group: "Account", label: "My account title" },
  loginTitle: { en: "Welcome Back", bn: "স্বাগতম", group: "Account", label: "Login page title" },
  loginSubtitle: { en: "Login to continue shopping", bn: "কেনাকাটা চালিয়ে যেতে লগইন করুন", group: "Account", label: "Login page subtitle" },
  registerTitle: { en: "Create Account", bn: "অ্যাকাউন্ট খুলুন", group: "Account", label: "Register page title" },
  registerSubtitle: { en: "Join us and start shopping", bn: "যোগ দিন আর কেনাকাটা শুরু করুন", group: "Account", label: "Register page subtitle" },
  password: { en: "Password", bn: "পাসওয়ার্ড", group: "Account", label: "Password field" },
  confirmPassword: { en: "Confirm Password", bn: "পাসওয়ার্ড নিশ্চিত করুন", group: "Account", label: "Confirm password field" },
  noAccount: { en: "Don't have an account?", bn: "অ্যাকাউন্ট নেই?", group: "Account", label: "No account prompt" },
  haveAccount: { en: "Already have an account?", bn: "আগে থেকেই অ্যাকাউন্ট আছে?", group: "Account", label: "Have account prompt" },
  myOrders: { en: "My Orders", bn: "আমার অর্ডার", group: "Account", label: "My orders title" },
  noOrders: { en: "You have no orders yet", bn: "আপনার কোনো অর্ডার নেই", group: "Account", label: "No orders" },

  /* ---------------- footer ---------------- */
  quickLinks: { en: "Quick Links", bn: "দরকারি লিংক", group: "Footer", label: "Quick links heading" },
  contactUs: { en: "Contact Us", bn: "যোগাযোগ", group: "Footer", label: "Contact heading" },
  allRightsReserved: { en: "All rights reserved.", bn: "সর্বস্বত্ব সংরক্ষিত।", group: "Footer", label: "Copyright line" },
  followUs: { en: "Follow Us", bn: "ফলো করুন", group: "Footer", label: "Follow us heading" },

  /* ---------------- messages ---------------- */
  errName: { en: "Please enter your full name", bn: "আপনার পুরো নাম লিখুন", group: "Messages", label: "Name error" },
  errPhone: { en: "Enter a valid 11 digit mobile number", bn: "সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন", group: "Messages", label: "Phone error" },
  errAddress: { en: "Please write your full address", bn: "আপনার সম্পূর্ণ ঠিকানা লিখুন", group: "Messages", label: "Address error" },
  errArea: { en: "Please select a delivery area", bn: "ডেলিভারি এলাকা নির্বাচন করুন", group: "Messages", label: "Area error" },
  emptyCartTitle: { en: "Your cart is empty", bn: "আপনার কার্ট খালি", group: "Messages", label: "Empty checkout title" },
  emptyCartHint: { en: "Add a few products before checking out", bn: "চেকআউটের আগে কিছু পণ্য যোগ করুন", group: "Messages", label: "Empty checkout hint" },
  noProducts: { en: "No products found", bn: "কোনো পণ্য পাওয়া যায়নি", group: "Messages", label: "No products" },
} satisfies Record<string, Entry>;

export type TextKey = keyof typeof UI_TEXT;

export const TEXT_KEYS = Object.keys(UI_TEXT) as TextKey[];

/** Every storefront string, already resolved for one language. */
export type SiteText = Record<TextKey, string>;

export function defaultText(lang: Lang): SiteText {
  const out = {} as SiteText;
  for (const key of TEXT_KEYS) out[key] = UI_TEXT[key][lang];
  return out;
}

export function overrideKey(lang: Lang, key: TextKey): string {
  return `${lang}:${key}`;
}

/** Dictionary + admin overrides merged into the final strings. */
export function resolveText(lang: Lang, overrides: Record<string, string> | null | undefined): SiteText {
  const out = defaultText(lang);
  if (!overrides) return out;
  for (const key of TEXT_KEYS) {
    const v = overrides[overrideKey(lang, key)];
    if (typeof v === "string" && v.trim() !== "") out[key] = v;
  }
  return out;
}

/** Keeps only real keys with a non-empty value that differs from the default. */
export function cleanOverrides(input: unknown): Record<string, string> {
  if (!input || typeof input !== "object") return {};
  const src = input as Record<string, unknown>;
  const out: Record<string, string> = {};
  for (const lang of LANGUAGES) {
    for (const key of TEXT_KEYS) {
      const k = overrideKey(lang.key, key);
      const v = src[k];
      if (typeof v !== "string") continue;
      const trimmed = v.trim();
      if (trimmed === "" || trimmed === UI_TEXT[key][lang.key]) continue;
      out[k] = trimmed.slice(0, 400);
    }
  }
  return out;
}

export function langLabel(lang: string): string {
  return LANGUAGES.find((l) => l.key === lang)?.native ?? "English";
}

/**
 * Four strings used to live in their own columns (`buy_now_text`,
 * `all_products_title`, `category_title`, `category_subtitle`). Anything the
 * admin had typed there keeps working as an English override until it is
 * edited again from the new Site Settings page.
 */
export function mergeLegacyText(s: {
  buyNowText: string;
  allProductsTitle: string;
  categoryTitle: string;
  categorySubtitle: string;
  textOverrides: Record<string, string> | null;
}): Record<string, string> {
  const legacy: Record<string, string> = {};
  const pairs: [TextKey, string][] = [
    ["buyNow", s.buyNowText],
    ["allProductsTitle", s.allProductsTitle],
    ["categoryTitle", s.categoryTitle],
    ["categorySubtitle", s.categorySubtitle],
  ];
  for (const [key, value] of pairs) {
    if (value && value.trim() !== "" && value !== UI_TEXT[key].en) legacy[overrideKey("en", key)] = value;
  }
  return { ...legacy, ...(s.textOverrides ?? {}) };
}

/** Column mirror, so old code reading settings.buyNowText stays in sync. */
export const LEGACY_TEXT_COLUMNS: Record<string, TextKey> = {
  buyNowText: "buyNow",
  allProductsTitle: "allProductsTitle",
  categoryTitle: "categoryTitle",
  categorySubtitle: "categorySubtitle",
};
