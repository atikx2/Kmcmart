-- STEP 9 — courier auto-sync columns
--
-- Run this if the API page cannot turn auto-sync on, or the courier card
-- errors. Safe to re-run.

ALTER TABLE courier_config ADD COLUMN IF NOT EXISTS auto_sync boolean NOT NULL DEFAULT true;
ALTER TABLE courier_config ADD COLUMN IF NOT EXISTS last_sync_at timestamptz;
ALTER TABLE courier_config ADD COLUMN IF NOT EXISTS last_sync_count integer;
ALTER TABLE courier_config ADD COLUMN IF NOT EXISTS last_sync_error text NOT NULL DEFAULT '';

ALTER TABLE orders ADD COLUMN IF NOT EXISTS courier_checked_at timestamptz;
