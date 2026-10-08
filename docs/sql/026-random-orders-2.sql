-- Generates 300 random orders. Run repeatedly for more duplicate-style orders.
BEGIN;
INSERT INTO orders (code, customer_id, customer_name, phone, address, delivery_area_name, delivery_charge, subtotal, total, items, status, created_at)
SELECT 'LEGACY-' || nextval(pg_get_serial_sequence('orders','id'))::text, c.id, c.name, c.phone, c.address, 'Imported address', 0, x.price*x.qty, x.price*x.qty,
       jsonb_build_array(jsonb_build_object('productId',p.id,'name',p.name,'image',COALESCE(p.images->>0,''),'price',x.price,'qty',x.qty)),
       (ARRAY['pending','confirmed','delivered','cancelled'])[1+floor(random()*4)::int], now() - (floor(random()*730)||' days')::interval
FROM generate_series(1,300) g
CROSS JOIN LATERAL (SELECT * FROM customers ORDER BY random() LIMIT 1) c
CROSS JOIN LATERAL (SELECT id,name,COALESCE(sell_price,regular_price) AS price,images FROM products WHERE is_active=true ORDER BY random() LIMIT 1) p
CROSS JOIN LATERAL (SELECT p.price, (1+floor(random()*3))::int AS qty) x;
COMMIT;
