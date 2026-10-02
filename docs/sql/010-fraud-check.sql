-- Task G — fraudchecker.link phone reputation
--
-- Run this once on the Neon database (SQL Editor). It is safe to re-run:
-- every statement is IF NOT EXISTS and nothing is dropped or overwritten.
--
-- Verified identical to `drizzle-kit push` output for src/db/schema.ts
-- (same column types, nullability, defaults and constraints).

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
