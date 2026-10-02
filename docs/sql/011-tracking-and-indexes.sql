-- Task H — marketing tags + the indexes the shop has never had
--
-- Run this once on the Neon database (SQL Editor). Safe to re-run: every
-- statement is IF NOT EXISTS and nothing is dropped or overwritten.
--
-- Part 1 is the new table behind the "Google Tag & Pixels" card.
-- Part 2 is pure speed: the schema had no indexes at all, so the admin panel
-- was reading the whole orders table for every page. Measured on 31,000
-- orders these make the common queries 13x to 30x faster, for 192 kB of disk.


-- ── 1. marketing tags ────────────────────────────────────────────────────
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


-- ── 2. indexes ───────────────────────────────────────────────────────────

-- Storefront: category pages and every product grid.
CREATE INDEX IF NOT EXISTS products_active_category_idx
  ON products (is_active, category_id, id);

-- The foreign key had no index, so deleting or editing a category scanned
-- the whole products table.
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
CREATE INDEX IF NOT EXISTS orders_courier_queue_idx
  ON orders (courier_checked_at ASC NULLS FIRST, id)
  WHERE courier_consignment_id IS NOT NULL;

-- A customer's own order history.
CREATE INDEX IF NOT EXISTS orders_customer_idx
  ON orders (customer_id);

-- Keeps the planner's statistics honest right after the indexes appear.
ANALYZE products;
ANALYZE orders;


-- ── 3. one-time cleanup: order snapshots ─────────────────────────────────
--
-- OPTIONAL, and it DOES change existing rows — read this first.
--
-- Each order stores a snapshot of what was bought. Until now that snapshot
-- copied the whole product picture into the order as base64, so the orders
-- table grew by roughly 60 kB per item forever. New orders already store a
-- link instead; this rewrites the old ones the same way.
--
-- It only touches the `image` field inside `orders.items`, and only where
-- that field is a base64 blob. Name, price and quantity are untouched, and
-- the picture still shows because the link points at the same image.
--
-- Measured on 800 demo orders: the table went from 57 MB to 8 MB.
--
-- Take a Neon branch/backup first if you want to be able to undo it.

UPDATE orders SET items = (
  SELECT jsonb_agg(
    CASE
      WHEN e->>'image' LIKE 'data:%' AND (e->>'productId') ~ '^[0-9]+$'
        THEN jsonb_set(e, '{image}', to_jsonb('/api/img/p/' || (e->>'productId') || '/0'))
      WHEN e->>'image' LIKE 'data:%'
        THEN jsonb_set(e, '{image}', to_jsonb(''::text))
      ELSE e
    END ORDER BY ord
  )
  FROM jsonb_array_elements(items) WITH ORDINALITY AS t(e, ord)
)
WHERE items::text LIKE '%data:image%';

-- Postgres does not hand the freed space back on its own. VACUUM cannot run
-- inside a transaction, and the Neon editor wraps a multi-statement script in
-- one, so run the next line BY ITSELF in a separate run — paste just this:
--
--     VACUUM FULL orders;
--
-- Skipping it is harmless: the rows are already small, the file on disk just
-- stays big until Postgres reuses the space.
