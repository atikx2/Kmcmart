# Kmcmartbd — Agent Handoff Instructions

New agent দিয়ে বাকি কাজ করার জন্য এই ফাইলটি ধাপে ধাপে ব্যবহার করো।

**নিয়ম:** প্রথমে "PART 0 — CONTEXT" পুরোটা একবার paste করো। তারপর একবারে শুধু একটি STEP paste করে বলো "ei step ta complete koro, build pass koro, tarpor report dao"। একটি STEP শেষ ও build পাস না হলে পরেরটা দিও না।

---

## PART 0 — CONTEXT (প্রথমে একবার paste করো)

```
You are continuing work on an EXISTING Next.js 16 e-commerce project "Kmcmartbd" (Bangladeshi store, currency BDT ৳). Do NOT rebuild or redesign existing features — extend them. Follow existing code style exactly.

STACK: Next.js 16 App Router · TypeScript · Tailwind CSS v4 (imported in src/app/globals.css) · Drizzle ORM + PostgreSQL (client: import { db } from "@/db") · lucide-react for ALL icons (NEVER emojis, never brand icons from lucide if missing — write inline SVG like Footer.tsx does).

STRUCTURE:
- Storefront routes: src/app/(store)/ — layout adds Header/Footer via Providers (cart context). Pages: home (/), /product/[slug], /category/[slug], /search, /checkout, /complete-order/[code], /login, /register, /account.
- Admin: src/app/admin/login (public) + src/app/admin/(panel)/ (protected by layout via getSessionAdmin; force-dynamic). Shell: src/components/admin/AdminShell.tsx — collapsible sidebar (state persisted in localStorage), header with profile dropdown (change email/password modals, logout).
- DB schema: src/db/schema.ts → tables: settings, menus, banners, categories, products, deliveryAreas, customers, orders, admins.
- Lib: src/lib/data.ts (storefront queries, unstable_cache 60s), src/lib/admin-data.ts (dashboard stats/chart/recent orders), src/lib/admin-auth.ts (admin session: scrypt hash + signed cookie; helpers re-exported from src/lib/auth.ts), src/lib/format.ts (taka(n), effectivePrice(regular,sell), discountPercent(), padOrderCode(id)).
- APIs: src/app/api/... — customer: auth/(login|register|logout), orders, products, search, health. Admin: api/admin/auth/login, api/admin/auth/logout, api/admin/profile.

DESIGN TOKENS (use them, don't invent):
- CSS vars --g1/--g2 (brand gradient); classes: grad-bg, grad-text, grad-border, grad-soft, field (inputs, left-icon padding), title-line, offer-tag (discount ribbon), animate-fade-up, animate-slide-down, shimmer, no-scrollbar.
- Admin cards: bg-white rounded-2xl/3xl border border-gray-100 shadow-[0_4px_18px_rgba(17,18,28,0.05)], font-extrabold labels, gradient rounded-xl lucide icon chips.
- Fonts: --font-sans (Manrope), --font-display (Space_Grotesk). Currency: taka() → ৳.

HARD RULES:
- Order status values: pending | confirmed (UI label "On The Way") | delivered | cancelled. Dashboard depends on these exact keys — do NOT rename.
- Order code: zero-padded 6-digit from serial id (000001). Orders snapshot items jsonb + deliveryAreaName + deliveryCharge — old orders must stay correct even if an area is deleted.
- products.sellPrice nullable ⇒ effectivePrice(). products.images = string[] jsonb, images[0] primary. Slugs unique, kebab-case.
- EVERY new route under src/app/api/admin/* must call await getSessionAdmin() and return 401 if null.
- After admin mutations of shared storefront data (settings/menus/banners/categories/deliveryAreas): revalidatePath("/", "layout") in the API route.
- In client components after login/logout use window.location.href (hard navigation) — soft nav caused a session/RSC-cache loop (already fixed once).
- Schema change? then run: npx drizzle-kit push --force. NEVER run src/db/seed.ts again (it TRUNCATEs admins, orders, products!) unless the user explicitly asks.
- NO guest-checkout label in checkout, NO email field in checkout form — already done, keep it.
- After EACH step you MUST run and pass: 1) npx next typegen  2) npm exec tsc -- --noEmit --pretty false  3) npm run build. Report the result.
- AdminShell.tsx NAV array has items with soon:true — when you build that page, give it a real href and remove soon:true. Orders item badge uses pendingOrders prop already.

ADMIN LOGIN: atikhasan315377@gmail.com / Atik123@@ (main admin).
Reply in Bengali+English mix (Banglish) like the user speaks.
```

---

## STEP 1 — Order Management (`/admin/orders`)

```
Build Order Management at /admin/orders (page src/app/admin/(panel)/orders/page.tsx) and activate the sidebar item (href /admin/orders, remove soon:true).

UI (desktop table, mobile stacked cards — responsive):
- Status filter tabs on top: All, Pending, On The Way (confirmed), Delivered, Cancelled — each with count chip.
- Search box (SVG Search icon) — search by order code / customer name / phone. Debounced.
- Table columns: Order # (grad-text, e.g. #000121) · Customer (name+phone) · Items (pcs) · Total (taka) · Delivery Area · Status badge (amber=pending, sky=on the way, emerald=delivered, rose=cancelled) · Date · Actions: View (Eye icon), Delete (Trash2, with confirm modal).
- Pagination (12 per page) or Load More — your choice, keep it snappy.
- Click row or Eye → order details page /admin/orders/[code] OR a wide right-side drawer (your pick): full customer info (name, phone, address), delivery area + charge, items list (image thumb, name, price × qty, line total), subtotal/total breakdown, status change dropdown with SVG icons, and a status timeline (Placed → Confirmed → On Delivery → Delivered). Delete button with confirm modal.

APIs: GET /api/admin/orders?status=&q=&offset=&limit= (list with counts per status), PATCH /api/admin/orders/[id] { status } (validate against allowed values), DELETE /api/admin/orders/[id] (hard delete, confirm client-side first). All guarded by getSessionAdmin().
Sidebar pending badge must keep working (it reads orders where status='pending').
After status change, refresh the page data (router.refresh() is fine here) and show a small success toast/checkmark state.
Empty state per tab: nice centered icon + text ("No pending orders right now" etc.).
```

---

## STEP 2 — Product Management (`/admin/products`)

```
Build Product Management at /admin/products. Activate sidebar item.

LIST PAGE:
- Search by name + category filter dropdown + "Add Product" button (grad-bg, Plus icon).
- Table/cards columns: Image thumb (rounded-xl, first image) · Name (truncated) · Category · Price (sellPrice grad-text bold + regularPrice struck-through when sellPrice exists) · Cost Price · Stock (red if <10) · Discount % chip · Status switch (isActive toggle — instant PATCH, optimistic UI) · Edit / Delete (confirm modal).
- Pagination or infinite, 15/page.

ADD/EDIT PAGE (/admin/products/new and /admin/products/[id]/edit — one shared client form):
- Fields with SVG icons (use .field class): Name (auto-generate kebab-case slug, editable, unique check) · Category (dropdown from categories table) · Description (textarea) · Images (list of URLs — add/remove input rows with live thumbnail previews, first image is primary; up to 5) · Regular Price (number, required) · Sell Price (number, optional — helper text "Leave empty = sell at regular price") · Cost Price (number, for profit calc — required) · Stock (number) · isActive switch.
- Client + server validation. On save → redirect to list with success state.

APIs: GET /api/admin/products (list w/ search, filter, pagination), POST /api/admin/products, GET/PATCH/DELETE /api/admin/products/[id], PATCH /api/admin/products/[id]/toggle (isActive).
revalidatePath("/", "layout") after mutations. Storefront must instantly respect isActive=false (hide from home/category/search).
```

---

## STEP 3 — Category Management (`/admin/categories`)

```
Build Category Management at /admin/categories. Activate sidebar item.

- Grid of category cards (image, name, slug, sortOrder, products count) + switches: isActive (visible in storefront) and showOnHome (this is the EXISTING flag controlling "Category-wise products" sections on the homepage — label it "Home page section visible").
- Add/Edit via modal or /admin/categories/[id] page: Name (auto slug), Image URL with preview, sortOrder (number — controls ordering in storefront slider + home sections).
- Delete rules: if the category has products, BLOCK delete and show which products belong (offer "move products to another category" select). Otherwise delete with confirm.
APIs: POST /api/admin/categories, PATCH /api/admin/categories/[id] (incl. toggles), DELETE /api/admin/categories/[id] (guard FK), revalidatePath("/", "layout") after each mutation.
```

---

## STEP 4 — Banners, Menus, Delivery Areas (3 ছোট CRUD)

```
Build three management pages and activate sidebar items:

A) /admin/banners — Hero slider images (max quality 3:1 ratio, e.g. 1920×640). List as large thumbnails with alt text, sortOrder number, isActive switch, Delete (confirm). "Add Banner": image URL input + live 3:1 preview + alt. Note under form: "মোবাইল/ডেস্কটপ দুইটাতেই ফুল ইমেজ দেখায় — 3:1 (1920×640) রাখলে কাটবে না"। Homepage slider auto-updates (same banners table).

B) /admin/menus — Header secondary nav + footer quick links (same menus table). Rows: label, href, sortOrder, isActive. Inline edit rows + add row + delete (confirm). Show hint: "href must start with / — e.g. /, /category/electronics, /checkout".

C) /admin/delivery-areas — Checkout dropdown data. Rows: name, charge (৳), sortOrder, isActive. Add/Edit/Delete same pattern. Old orders keep snapshot values — no problem.

APIs per entity under /api/admin/... with getSessionAdmin guards; revalidatePath("/", "layout") after each mutation. Reuse one generic look: white card + table + gradient "Add" button + switches + confirm modal.
```

---

## STEP 5 — Customers (`/admin/customers`)

```
Build /admin/customers and activate sidebar item.
- Table: Name (avatar chip with first letter) · Phone · Total orders (join from orders by phone/customerId) · Total spent (sum of orders.total, exclude cancelled) · Joined date · View → customer's order list (reuse the orders UI filtered).
- Search by name/phone. Read-only (no edit/delete).
API: GET /api/admin/customers?q=&offset=&limit=.
```

---

## STEP 6 — Role Management (`/admin/roles`) + Schema change

```
Add role support:
1) Schema: admins table → add role column: text("role").notNull().default("super") — values: super | editor | viewer. Run npx drizzle-kit push --force. Set existing admin atikhasan315377@gmail.com role='super' via psql (do NOT reseed!). Update Admin type.
2) Build /admin/roles, activate sidebar item — ONLY visible/accessible to role=super (hidden from sidebar for others, and page redirects to /admin for non-super).
3) Page: list admins (email, role badge, created date). "Add Admin": email + password + role select. Change role dropdown per row. Delete admin with confirm — BLOCK deleting yourself and BLOCK deleting the email atikhasan315377@gmail.com.
4) Permissions (enforce in panel layout AND every /api/admin/* mutation route): - super: everything.
   - editor: dashboard, orders, products, categories, banners, menus, delivery areas, customers (read). NO roles page, NO site settings.
   - viewer: dashboard + read-only everywhere (hide edit/add/delete buttons; POST/PATCH/DELETE APIs return 403).
   Implement a helper like canManage(admin, area) in src/lib/admin-auth.ts.
```

---

## STEP 7 — Site Settings (`/admin/settings`)

```
Build /admin/settings (final sidebar item; super + editor allowed per your role rules from STEP 6).

One page, section cards, single "Save Changes" sticky button (grad-bg), success toast:
1) Branding: siteName, header logo URL (live preview on light bg), footer logo URL (live preview on dark/black bg), slogan (shows in footer). [logo add option = URL input + preview; keep it simple]
2) Contact & Social (footer): phone, email, address, facebook, instagram, youtube, whatsapp.
3) Appearance: colorFrom + colorTo with <input type="color"> + big gradient preview bar + live preview of a button + "Applies site-wide instantly (titles, buttons, ribbons)".
4) Storefront Text: categoryTitle, categorySubtitle, allProductsTitle, buyNowText ("Buy Now" button label everywhere).

API: PUT /api/admin/settings (guard admin) → update settings row id=1 → revalidatePath("/", "layout"). Settings are already wired end-to-end (root layout injects --g1/--g2 vars, header/footer/sections read all fields) — you only build the form.
```

---

## FINAL STEP — Verify + Netlify

```
Final checks:
1) npx next typegen && npm exec tsc -- --noEmit --pretty false && npm run build — all must pass.
2) Walk through every admin page on mobile width (375px) — sidebar drawer, cards, tables must be responsive.
3) Confirm storefront still perfect: home hero slider (uncropped 3:1 banners), category slider, product grids with Load More AJAX, checkout with delivery-area charges, /complete-order/000XXX thank-you page.
4) Netlify: nothing new needed — netlify.toml exists, DATABASE_URL env var is all that matters. Remind me: after deploy, run drizzle push + seed ONCE against the production (Neon) DB.
Give me a final summary in Banglish of everything built.
```

---

## মনে রাখার মতো কৌশল

- **Seed আবার চালাবে না** — এতে অ্যাডমিন পাসওয়ার্ড রিসেট + ডেমো অর্ডার ডিলিট হয়ে যাবে। নতুন কলাম দরকার হলে শুধু `drizzle-kit push` + সিঙ্গেল `psql UPDATE`।
- প্রতি step-এর পর preview দেখে তুমি যাচাই করো, তারপর পরের step দাও।
- Agent যদি এক step-এ এইসব কামড়িয়ে nalay (বেশি কাজ একসাথে), তাকে শুধু সেই step-টুকু আবার দাও।
