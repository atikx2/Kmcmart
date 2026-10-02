-- ════════════════════════════════════════════════════════════════════════
--  Kmcmartbd — everything outstanding, in one paste
-- ════════════════════════════════════════════════════════════════════════
--
--  Copy this whole file into the Neon SQL Editor and press Run, ONCE.
--
--  Safe to run even if you already ran some of it: every statement is
--  IF NOT EXISTS, nothing is dropped, and no value you have saved is
--  overwritten. Running it twice does nothing the second time.
--
--  This is the same content as files 010 / 012 / 013 and parts 1-2 of 011,
--  but ordered so it works: 013 must come before 011, because 011 builds an
--  index on a column that 013 adds. In the wrong order Neon rolls the whole
--  script back.
--
--  The optional, row-rewriting part 3 of 011 is deliberately NOT here.
--  Do that separately, later, when you feel like it.
--
--  Run this BEFORE deploying the new code.  Adding these columns does not
--  affect the version of the site that is live right now — the running code
--  simply ignores them until the new deploy goes out.
-- ════════════════════════════════════════════════════════════════════════


-- ── 1. Site Settings columns (was file 012) ──────────────────────────────
-- Without these, Site Settings cannot save. The storefront stays up either
-- way, but the page shows an orange "run the migration" notice.

ALTER TABLE settings ADD COLUMN IF NOT EXISTS meta_title text NOT NULL DEFAULT '';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS meta_description text NOT NULL DEFAULT '';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS favicon text NOT NULL DEFAULT '/favicon.ico';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS logo_mode text NOT NULL DEFAULT 'image';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS logo_text text NOT NULL DEFAULT '';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS language text NOT NULL DEFAULT 'en';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS text_overrides jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS admin_menu_mode text NOT NULL DEFAULT 'remember';

-- The panel edits a single row. If the table is empty, create it.
INSERT INTO settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;


-- ── 2. Courier auto-sync columns (was file 013) ──────────────────────────
-- These are the critical ones. Without courier_checked_at the new code
-- cannot write an order at all, so customers cannot check out.

ALTER TABLE courier_config ADD COLUMN IF NOT EXISTS auto_sync boolean NOT NULL DEFAULT true;
ALTER TABLE courier_config ADD COLUMN IF NOT EXISTS last_sync_at timestamptz;
ALTER TABLE courier_config ADD COLUMN IF NOT EXISTS last_sync_count integer;
ALTER TABLE courier_config ADD COLUMN IF NOT EXISTS last_sync_error text NOT NULL DEFAULT '';

ALTER TABLE orders ADD COLUMN IF NOT EXISTS courier_checked_at timestamptz;


-- ── 3. Fraud checker tables (was file 010) ───────────────────────────────

CREATE TABLE IF NOT EXISTS fraud_config (
  id serial PRIMARY KEY,
  provider text NOT NULL DEFAULT 'fraudchecker',
  base_url text NOT NULL DEFAULT 'https://fraudchecker.link/api/v1/qc/',
  -- Encrypted at rest, same scheme as the courier keys. Never store a raw key here.
  api_key text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT false,
  auto_check boolean NOT NULL DEFAULT true,
  cache_hours integer NOT NULL DEFAULT 24,
  last_checked_at timestamptz,
  last_error text NOT NULL DEFAULT ''
);

-- One cached report per phone number, not per order: a repeat customer
-- costs a single lookup however many times they order.
CREATE TABLE IF NOT EXISTS fraud_reports (
  id serial PRIMARY KEY,
  phone text NOT NULL,
  total_parcels integer NOT NULL DEFAULT 0,
  total_delivered integer NOT NULL DEFAULT 0,
  total_cancelled integer NOT NULL DEFAULT 0,
  delivery_rate real NOT NULL DEFAULT 0,
  risk_status text NOT NULL DEFAULT '',
  -- [{ name, total, delivered, cancelled }], sorted by total desc.
  couriers jsonb NOT NULL DEFAULT '[]'::jsonb,
  checked_at timestamptz NOT NULL DEFAULT now(),
  -- Non-empty when the last attempt failed; the row is kept so the panel can say why.
  error text NOT NULL DEFAULT '',
  CONSTRAINT fraud_reports_phone_unique UNIQUE (phone)
);


-- ── 4. Marketing tags table (was file 011, part 1) ───────────────────────

CREATE TABLE IF NOT EXISTS tracking_tags (
  id serial PRIMARY KEY,
  -- gtm | ga4 | gads | meta | verification
  provider text NOT NULL,
  label text NOT NULL DEFAULT '',
  tag_id text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);


-- ── 5. Indexes (was file 011, part 2) ────────────────────────────────────
-- The schema had none. On 31,000 orders these make the common admin queries
-- 13x to 30x faster, for about 192 kB of disk.

-- Storefront: category pages and every product grid.
CREATE INDEX IF NOT EXISTS products_active_category_idx
  ON products (is_active, category_id, id);

-- The foreign key had no index, so editing a category scanned all products.
CREATE INDEX IF NOT EXISTS products_category_idx
  ON products (category_id);

-- Admin orders list, newest first.
CREATE INDEX IF NOT EXISTS orders_created_at_idx
  ON orders (created_at DESC);

-- Admin orders filtered by status (the status tabs).
CREATE INDEX IF NOT EXISTS orders_status_created_idx
  ON orders (status, created_at DESC);

-- Phone lookups: order search, "my orders", and the fraud history rollup.
CREATE INDEX IF NOT EXISTS orders_phone_idx
  ON orders (phone);

-- The courier sync queue. Partial, so it only indexes booked parcels.
-- Needs courier_checked_at from section 2 above — hence the ordering.
CREATE INDEX IF NOT EXISTS orders_courier_queue_idx
  ON orders (courier_checked_at ASC NULLS FIRST, id)
  WHERE courier_consignment_id IS NOT NULL;

-- A customer's own order history.
CREATE INDEX IF NOT EXISTS orders_customer_idx
  ON orders (customer_id);

-- Keeps the planner's statistics honest right after the indexes appear.
ANALYZE products;
ANALYZE orders;


-- ════════════════════════════════════════════════════════════════════════
--  Done. You should see "Success" with no rows returned.
--  Now the new deploy is safe to publish.
-- ════════════════════════════════════════════════════════════════════════
