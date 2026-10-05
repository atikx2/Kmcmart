-- Meta Pixel + Conversions API configuration
-- Access tokens are encrypted by the application before storage.
CREATE TABLE IF NOT EXISTS meta_pixels (
  id serial PRIMARY KEY,
  label text NOT NULL DEFAULT '',
  pixel_id text NOT NULL UNIQUE,
  access_token text NOT NULL DEFAULT '',
  test_event_code text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  events jsonb NOT NULL DEFAULT '["PageView","ViewContent","AddToCart","InitiateCheckout","Purchase"]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS meta_pixels_active_idx ON meta_pixels (is_active, id);
