-- Kmc Bazar main categories for Kmcmart
-- Run once after confirming the category list. Safe to re-run by slug.
INSERT INTO categories (name, slug, image_url, sort_order, is_active, show_on_home) VALUES
('Accessories', 'accessories', 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=900&q=85', 1, true, true),
('Home & Kitchen', 'home-kitchen', 'https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=900&q=85', 2, true, true),
('Gadget items', 'gadget-items', 'https://images.unsplash.com/photo-1468495244123-6c6c332eeeca?auto=format&fit=crop&w=900&q=85', 3, true, true),
('Food Suppliment', 'food-suppliment', 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=900&q=85', 4, true, true),
('Health', 'health', 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?auto=format&fit=crop&w=900&q=85', 5, true, true),
('Bathroom Items', 'bathroom-items', 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=900&q=85', 6, true, true),
('Cosmetics', 'cosmetics', 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=900&q=85', 7, true, true)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  image_url = EXCLUDED.image_url,
  sort_order = EXCLUDED.sort_order,
  is_active = true,
  show_on_home = true;
