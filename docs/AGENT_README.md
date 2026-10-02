# Kmcmartbd — read this before you change anything

You are picking up an **existing, live** Bangladeshi e-commerce site. It is not a
greenfield project. Almost everything below exists because something broke once;
treat it as hard-won rather than as suggestions.

**Your job is to extend this codebase, not to redesign it.** Match the style of
the file you are editing. If you think something should be rebuilt, say so and
ask — do not just do it.

---

## 1. The 60-second version

| | |
|---|---|
| **Stack** | Next.js 16 (App Router, Turbopack) · React 19 · TypeScript · Tailwind v4 · Drizzle ORM + Postgres (Neon) |
| **Host** | Netlify → `kmcmartbd.netlify.app` |
| **Database** | Neon Postgres. `DATABASE_URL` (falls back to `NETLIFY_DATABASE_URL`) |
| **Currency** | BDT ৳ via `taka()` in `src/lib/format.ts` |
| **Icons** | `lucide-react` **only**. Never emojis. If lucide lacks a brand icon, write inline SVG (see `Footer.tsx`) |
| **Owner** | Works from a **phone**. Cannot run commands, cannot edit files on GitHub. Anything that needs doing, you do in code |

### Repository map

```
src/
  app/
    (store)/       storefront: / · /product/[slug] · /category/[slug] · /search
                   /checkout · /complete-order/[code] · /login · /register · /account
    admin/
      login/                 public
      (panel)/               everything behind the session guard in its layout.tsx
        page.tsx (dashboard) · orders · orders/[code] · products · products/new
        products/[id]/edit · categories · banners · menus · delivery-areas
        customers · customers/[phone] · reports · api · roles · settings
      print/                 shipping labels / invoices (own layout, no shell)
    api/
      orders · products · search · auth/* · health
      img/[kind]/[id]/[idx]  serves DB-stored images (see §4 — important)
      cron/courier-sync      called by the Netlify scheduled function
      admin/*                43 routes; every one is permission-guarded
  components/
    admin/   AdminShell · ImageUploader · ConfirmModal · Toast · table-ui
             FraudModal · SecurityBanner
    site/    Header · Footer · Providers (cart context) · TrackingScripts
    home/    ProductCard · ProductsBlock · hero
  db/
    schema.ts   single source of truth for tables
    seed.ts     ⚠ TRUNCATES EVERYTHING. Never run it. See §3
  lib/          one file per domain; *-admin / admin-* split explained in §6
docs/
  AGENT_HANDOFF.md   the original build plan (historical, steps 1–9)
  AGENT_README.md    this file
  GO-LIVE.md         owner-facing: post-merge checklist + domain migration
  sql/               every migration, numbered. See §3
netlify/
  functions/courier-sync.mjs   scheduled function (V2 convention — see §8)
```

---

## 2. Rules that will bite you if you ignore them

1. **Every `src/app/api/admin/*` route must guard.** Use `guardAdmin(perm?)` from
   `src/lib/admin-api.ts`, which returns a ready `Response` (401/403) or `null`.
   Pages use `requirePermission(key)` from `admin-guard.ts`, which redirects to
   `/admin?denied=<key>`. The only unguarded admin routes are `auth/login` and
   `auth/logout`, and that is correct.

2. **Order status keys are frozen**: `pending | confirmed | delivered | cancelled`.
   The UI label for `confirmed` is **"On The Way"**. Labels and colours are
   editable from Delivery Area → Order Status; **keys are not**. Dashboard and
   reports key off these exact strings. Only `delivered` counts as revenue, only
   `cancelled` counts as lost. Admin-created statuses are extra in-between states
   and count as neither.

3. **After mutating shared storefront data, revalidate.** Call
   `refreshStorefront(tag?)` from `src/lib/admin-api.ts` — it does
   `revalidateTag(tag, "max")` + `revalidatePath("/", "layout")`. Forget this and
   the owner edits something and sees no change for 60 seconds, then reports a bug.

4. **Post-login / post-logout navigation in client components must use
   `window.location.href`**, not the router. Soft navigation caused a
   session/RSC-cache loop. This has been fixed once; do not undo it.

5. **No guest-checkout label, no email field in checkout.** Deliberate.

6. **Never run `src/db/seed.ts`.** It truncates admins, orders and products. It
   exists for the original bootstrap only. There is no safe way to run it against
   the live database.

7. **Mutation API contract** (follow it so the client helpers keep working):
   `GET → { items }` · `POST → 201 { ok, item }` · `PATCH` accepts a subset ·
   `DELETE → { ok }` · errors via `fail(msg, status)` → `{ error }`.

---

## 3. Migrations — this project does them by hand, on purpose

There is **no migration runner**. The owner cannot run commands. The workflow is:

1. You edit `src/db/schema.ts`.
2. You write a **numbered, idempotent SQL file** in `docs/sql/`.
3. You **verify it matches Drizzle** (method below).
4. The owner pastes it into the **Neon SQL Editor** on their phone.

So every SQL file must be:

- `CREATE TABLE IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS` — re-running is harmless.
- Runnable **inside a transaction** (Neon's editor wraps multi-statement scripts).
  `VACUUM` cannot; if you need it, put it in a comment telling the owner to run
  that one line separately.
- Explicit about constraint names (`CONSTRAINT x_unique UNIQUE (col)`), so the
  name matches whatever Drizzle would have generated.

### How to verify a SQL file really matches the schema

Boot two scratch databases, apply your SQL to one and `drizzle-kit push` to the
other, then diff `information_schema`:

```bash
# one embedded postgres, two databases: kmcmart (hand SQL) and drz (drizzle)
node .tmpscripts/boot.mjs &                      # see §9 for the script
psql-ish: apply docs/sql/0XX-your-file.sql to kmcmart
DATABASE_URL=postgresql://kmc:kmc@127.0.0.1:55432/drz npx drizzle-kit push --force
# then compare columns + constraints for the tables you touched
```

Every file in `docs/sql/` was verified this way and came back
**COLUMNS: IDENTICAL / CONSTRAINTS: IDENTICAL**. Keep that standard.

### New code must survive its migration not having run yet

The owner may deploy before they paste the SQL. Anything that reads a new table
must swallow Postgres error **`42P01`** (undefined table) / **`42703`**
(undefined column) and degrade: return empty, show a "run the migration" notice,
and **never 500 the storefront**. `loadFraudConfig`, `listTrackingTags` and
`getSettings` all do this — copy the pattern (`isMissingTable()` walks `.cause`,
because Drizzle wraps the driver error).

### Existing migration files

| File | What |
|---|---|
| `RUN-ALL-PENDING.sql` | **what the owner actually runs** — all of the below, correctly ordered, minus the destructive part |
| `010-fraud-check.sql` | `fraud_config`, `fraud_reports` |
| `011-tracking-and-indexes.sql` | `tracking_tags`, 7 indexes, optional order-snapshot cleanup |
| `012-settings-step7.sql` | the 8 Site Settings columns |
| `013-courier-step9.sql` | courier auto-sync columns |

**Numeric order is not execution order.** `011` indexes
`orders.courier_checked_at`, which `013` adds, so `010 → 011` fails with
`42703` and Neon rolls the whole script back. When you add a migration that
depends on an earlier one, update `RUN-ALL-PENDING.sql` too, and test the
combined file in a single transaction.

**A missing column can be worse than a missing table.** `isMissingTable`
(42P01) does not catch 42703. More importantly, no catch helps an `INSERT`:
Drizzle builds the column list from the schema, so if `orders` is missing one
column, `POST /api/orders` fails and the shop takes no orders at all. That is
why the SQL has to be run *before* the deploy, and why "the code degrades
gracefully" is only true for reads.

Earlier changes (products.free_delivery, orders.customer_ip, admins.role/permissions,
`order_statuses`, `courier_config`) were sent to the owner as chat SQL before
`docs/sql/` existed. If something looks missing in their database, that is why —
check `information_schema` before assuming the code is wrong.

---

## 4. Images — the single biggest gotcha

**There is no object storage.** Uploaded pictures are compressed in the browser
(`ImageUploader`, canvas) and stored in Postgres as **base64 data URLs**:

- `products.images` — `jsonb` array of data URLs, `[0]` is primary
- `categories.image_url`, `banners.image_url` — single data URL
- `settings.logo_header / logo_footer / favicon` — single data URL

### Consequences you must respect

**Never `select *` from `products`.** A twelve-product grid used to pull ~13 MB
out of the database and render 39 MB of HTML. Select the columns you need, and
for a thumbnail select a **content hash** instead of the image:

```ts
// the shared projection in src/lib/data.ts
imageVersion: sql<string | null>`substr(md5(${products.images}->>0), 1, 8)`
```

Then build the URL with `dbImageUrl(kind, id, index, version)` from
`src/lib/format.ts`, which produces `/api/img/p/123/0?v=ab12cd34`.

**`/api/img/[kind]/[id]/[idx]`** decodes the data URL once and serves real bytes
with `Cache-Control: public, max-age=31536000, immutable` when `?v=` is present.
Kinds: `p` products, `c` categories, `b` banners. Because `v` is a hash of the
contents, replacing an image changes the URL and no stale cache can survive.

Gotcha inside that route: `jsonb ->> $1` with a **text** parameter looks up an
object *key* and always returns null on an array. Cast it: `->>(${idx})::int`.

**Order snapshots store a link, not a copy.** `orders.items[].image` holds
`/api/img/p/<id>/0`. It used to hold the whole base64 image, which is why the
orders table had grown to tens of megabytes. `011` part 3 rewrites old rows.

**Admin edit forms still need the raw data URL** (the uploader has to show and
re-save it), so single-product and single-category fetches keep the real value.
Only *lists* use the hash + `/api/img`.

---

## 5. Security model

- **Admin sessions**: `scrypt` password hash, HMAC-SHA256 signed cookie
  (`src/lib/admin-auth.ts`). The secret is `AUTH_SECRET`, and **it falls back to
  a constant that is public in this repo** if unset. `SecurityBanner` shouts
  about this on every admin page while it is missing. Do not remove that banner,
  and do not make the fallback quieter.
- **Integration keys** (courier, fraud) are **encrypted at rest** with a key
  derived from `AUTH_SECRET` (`src/lib/courier-crypto.ts`). It tries both the
  real secret and the fallback when decrypting, so adding `AUTH_SECRET` later
  does not strand existing rows.
- **Marketing tags store an id, never a script.** `TrackingScripts.tsx` builds
  the snippet from a template. This is deliberate: a stolen admin password must
  not become arbitrary JavaScript on the storefront. If someone asks for "paste
  any script here", push back and point them at a GTM container instead.
- **Permissions** (11): `orders, products, categories, banners, menus, delivery,
  customers, reports, api, roles, settings`. The **owner** is the admin with the
  lowest `admins.id` and always has all of them.

---

## 6. Library layout — why files are split

Client components cannot import anything that pulls in `pg`. So domains that are
used on both sides are split in two:

| client-safe | server |
|---|---|
| `order-status.ts` | `admin-orders.ts`, `admin-order-statuses.ts` |
| `product-admin.ts` | `admin-products.ts` |
| `category-admin.ts` | `admin-categories.ts` |
| `courier.ts` | `admin-courier.ts` |
| `fraud-check.ts` | `admin-fraud.ts` |
| `tracking.ts` | `admin-tracking.ts` |
| `site-content.ts`, `i18n.ts`, `format.ts`, `permissions.ts` | `data.ts`, `admin-*.ts` |

The server file re-exports the client file (`export * from "@/lib/x"`) so server
code only needs one import. **If you get a webpack error about `pg` in a client
component, you imported the wrong half.**

---

## 7. Features and where they live

**Storefront** — home (hero banners, category strip, product blocks), product
detail with gallery + related, category, search, cart (context in
`site/Providers.tsx`, persisted to localStorage), checkout, order confirmation,
customer accounts.

**Checkout** — `POST /api/orders`, body
`{ items:[{id,qty}], customerName, phone /^01[3-9]\d{8}$/, address ≥10, deliveryAreaId }`
→ `{ ok, code }`. It is deliberately **two** database round trips: one
`Promise.all` (delivery area + products + session), then one INSERT that draws
its id from the sequence so `code` is written in the same statement:

```sql
id   = nextval(pg_get_serial_sequence('orders','id'))
code = lpad(currval(pg_get_serial_sequence('orders','id'))::text, 6, '0')
```

(A data-modifying CTE does **not** work here — sub-statements cannot see each
other's effects.) The fraud lookup runs in `after()` so the shopper never waits.

**Admin panel** — dashboard, orders (list + detail + bulk + CSV export + print
labels), products, categories, banners, menus, delivery areas & order statuses,
customers, reports, API integrations, roles, site settings.

**Courier (Steadfast / Packzy)** — base `https://portal.packzy.com/api/v1`.
Booking a parcel moves the order to **On The Way** and stores
`courier_consignment_id`, which is also what blocks a double send. Status is
**polled**, not pushed — they have no webhook. `syncCourierStatuses()` runs every
15 minutes from a Netlify scheduled function, with a 60 s minimum gap, an 18 s
internal budget and concurrency 4.

**Fraud check (fraudchecker.link)** — `GET ?api_key=&phone=` → totals plus a
per-courier breakdown. Reports are cached **per phone number**, not per order, so
a repeat customer costs one lookup. New orders are checked automatically in the
background; the courier cron also backfills anything missed. Clicking the score
chip on the orders table opens `FraudModal` with the per-courier table.

**Marketing tags** — multiple tags live at once (GTM, GA4, Google Ads, Meta
Pixel, Search Console). All load `afterInteractive`.

---

## 8. Netlify specifics

- **Scheduled functions must use the V2 convention**:
  `export default async (req) => {}` plus `export const config = { schedule: "..." }`
  in `netlify/functions/<name>.mjs`. The legacy `schedule(cron, handler)` wrapper
  from `@netlify/functions` is a **runtime no-op** and silently never registers.
- Scheduled functions **only fire on published production deploys** — never on a
  Deploy Preview. Test with "Run now" on the Netlify Functions page, or the
  "Sync now" button in the panel.
- They cannot be invoked by URL and have a **30 s** limit.
- `after()` from `next/server` is **not guaranteed** on every runtime version.
  Anything scheduled with it needs a cron backstop. The fraud auto-check has one.
- Browser code must never call `localhost` — it is not the server.

---

## 9. Working locally

There is no local database in the repo. Spin up a throwaway one:

```bash
npm install
npm install --no-save embedded-postgres    # ~200 MB, do not commit
```

Create `.tmpscripts/` (gitignored — it **must** live inside the repo for the
embedded binaries to resolve):

```js
// .tmpscripts/boot.mjs — postgres on 55432, databases "kmcmart" and "drz"
import EmbeddedPostgres from "embedded-postgres";
import fs from "node:fs";
const dir = "/home/user/Kmcmart/.tmpscripts/pgdata";
const pg = new EmbeddedPostgres({ databaseDir: dir, user: "kmc", password: "kmc", port: 55432, persistent: true });
const fresh = !fs.existsSync(dir + "/PG_VERSION");
if (fresh) await pg.initialise();
await pg.start();
if (fresh) { await pg.createDatabase("kmcmart"); await pg.createDatabase("drz"); }
console.log("postgres up on 55432");
setInterval(() => {}, 1 << 30);
```

```bash
echo 'DATABASE_URL=postgresql://kmc:kmc@127.0.0.1:55432/kmcmart' > .env
echo 'AUTH_SECRET=local-dev-only-long-random-string' >> .env
npx drizzle-kit push --force          # schema
# then apply docs/sql/*.sql and insert a settings row + an admin
npm run dev -- -H 0.0.0.0 -p 3000
```

Seed enough to be realistic. If you are measuring performance, seed images at
the size the real uploader produces (~340 KB of base64 each) — with tiny
fixtures every query looks fast and you will optimise the wrong thing.

### Verify before you report

```bash
npx next typegen
npm exec tsc -- --noEmit     # must be clean
npm run build                # must pass
npm run lint                 # baseline is 5 errors / 0 warnings — do not add more
```

Then actually exercise it with `curl`: log in, hit the pages, hit the routes,
check the negative paths (bad input, not signed in, migration not run). Claims
in a report should be things you watched happen.

---

## 10. Things that are known-bad and why they are still here

- **Base64 images in Postgres.** The real fix is object storage (S3 / R2 /
  Netlify Blobs) and it would be a big, worthwhile change. `/api/img` is the
  mitigation, not the cure. The URL shape `/api/img/p/<id>/<idx>?v=<hash>` was
  chosen so a future blob store can keep it unchanged.
- **`next.config.ts` allows `hostname: "**"`** for remote images, because the
  owner can paste any image URL. That is an open image-optimizer proxy. Narrow it
  if you ever get a bandwidth bill.
- **Product search uses `ILIKE '%q%'`**, which no btree index can help. At a few
  thousand products it is fine; beyond that add `pg_trgm` + a GIN index.
- **Lint baseline is 5 pre-existing errors**, mostly `set-state-in-effect` in
  `Providers.tsx` (cart hydration from localStorage). Leave them unless you are
  deliberately fixing them; just never add a sixth.

---

## 11. Working with this owner

- Reply in **Banglish** (Bengali written in Latin script, mixed with English).
- They are on a phone. They cannot run a command, open a terminal, or edit a file
  on GitHub. If something needs doing, you do it in code and push it.
- The one thing they *can* do is paste SQL into the Neon console. Make it easy:
  one numbered file, say exactly which buttons to press.
- **Warn before anything destructive.** The Deploy Preview points at the **same
  production Neon database** as the live site.
- Work on the session branch, push to it, keep using the **same PR** — do not
  open a new one per step and do not ask them to merge mid-stream.
- Give them the deploy-preview link and a short, concrete list of what to check.
