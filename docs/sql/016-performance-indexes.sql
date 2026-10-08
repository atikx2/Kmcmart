-- Performance indexes for storefront/admin product queries.
-- Safe to run once; PostgreSQL skips indexes that already exist.
CREATE INDEX IF NOT EXISTS products_active_category_id_idx ON products (is_active, category_id, id);
CREATE INDEX IF NOT EXISTS products_category_id_created_idx ON products (category_id, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS products_slug_idx ON products (slug);
CREATE INDEX IF NOT EXISTS categories_active_home_sort_idx ON categories (is_active, show_on_home, sort_order, id);
CREATE INDEX IF NOT EXISTS categories_slug_idx ON categories (slug);
CREATE INDEX IF NOT EXISTS menus_active_sort_idx ON menus (is_active, sort_order, id);
