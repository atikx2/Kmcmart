-- STEP 7 — the Site Settings columns
--
-- Run this if /admin/settings tells you columns are missing, or if the logo
-- and favicon controls look wrong. Safe to re-run; it never overwrites a
-- value you have already saved.
--
-- Without these the storefront still works (it falls back to the shipped
-- defaults) but nothing on the Site Settings page can be saved.

ALTER TABLE settings ADD COLUMN IF NOT EXISTS meta_title text NOT NULL DEFAULT '';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS meta_description text NOT NULL DEFAULT '';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS favicon text NOT NULL DEFAULT '/favicon.ico';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS logo_mode text NOT NULL DEFAULT 'image';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS logo_text text NOT NULL DEFAULT '';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS language text NOT NULL DEFAULT 'en';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS text_overrides jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS admin_menu_mode text NOT NULL DEFAULT 'remember';

-- The panel edits one row. If the table is empty, create it.
INSERT INTO settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
