-- 012_reebloom_real_products.sql
-- Reemplaza los 5 productos placeholder (fotografía gótica de relleno) por
-- las 5 prendas reales de la primera colección REEBLOM, ya fotografiadas.
-- Se reutilizan los IDs existentes: cualquier orden histórica que los
-- referencia guarda una copia (JSONB) de nombre/precio en el momento de la
-- compra, así que no se altera ningún pedido ya realizado.
--
-- Requiere haber corrido antes 011_products_storage_bucket.sql y haber
-- subido las fotos al bucket 'products' (lo hace Claude vía la sesión de
-- administrador, respetando esa misma política).

update public.products set
  name = 'Orchid Bloom Tee',
  price = 780.00,
  description = 'Oversized tee cortada en algodón pesado, estampada con una orquídea ilustrada a mano en magenta oscuro. Fit caído, hombro bajo. De la campaña REEBLOM Collection I.',
  tags = array['new-arrival','women','top'],
  sizes = array['S','M','L','XL'],
  stock_by_size = '{"S": 6, "M": 9, "L": 9, "XL": 6}'::jsonb,
  images = array[
    'https://ffurplzqeldxzeheetgg.supabase.co/storage/v1/object/public/products/orchid-bloom-tee/1.jpg',
    'https://ffurplzqeldxzeheetgg.supabase.co/storage/v1/object/public/products/orchid-bloom-tee/2.jpg',
    'https://ffurplzqeldxzeheetgg.supabase.co/storage/v1/object/public/products/orchid-bloom-tee/3.jpg'
  ]
where id = '2876697c-041b-4189-8ff0-d8c1fa1162d6';

update public.products set
  name = 'Wordmark Tee',
  price = 690.00,
  description = 'Tee oversized en algodón pesado con el wordmark de la casa al pecho. Lavado a piedra, silueta boxy, hombro caído.',
  tags = array['new-arrival','men','top'],
  sizes = array['S','M','L','XL'],
  stock_by_size = '{"S": 7, "M": 10, "L": 10, "XL": 7}'::jsonb,
  images = array[
    'https://ffurplzqeldxzeheetgg.supabase.co/storage/v1/object/public/products/type-logo-tee/1.jpg',
    'https://ffurplzqeldxzeheetgg.supabase.co/storage/v1/object/public/products/type-logo-tee/2.jpg'
  ]
where id = '5ffddb3d-14f0-478c-88d3-3e2f50d2e3c8';

update public.products set
  name = 'Moth Heart Tee',
  price = 750.00,
  description = 'Tee gráfica a dos caras: una polilla atrapada en su propia telaraña, pequeña al pecho dentro de un corazón, a escala completa en la espalda. Fit relajado, hombro caído.',
  tags = array['new-arrival','men','top'],
  sizes = array['S','M','L','XL'],
  stock_by_size = '{"S": 6, "M": 8, "L": 8, "XL": 5}'::jsonb,
  images = array[
    'https://ffurplzqeldxzeheetgg.supabase.co/storage/v1/object/public/products/moth-heart-tee/1.jpg',
    'https://ffurplzqeldxzeheetgg.supabase.co/storage/v1/object/public/products/moth-heart-tee/2.jpg'
  ]
where id = '5bbc8e91-a9b2-47d0-93cf-84cca5582634';

update public.products set
  name = 'Powder Satin Blouse',
  price = 890.00,
  description = 'Blusa sin mangas en satín, con volante en cuello y bastilla, terminada con un detalle de cadena deslizante. Caída suave y fluida.',
  tags = array['new-arrival','women','top'],
  sizes = array['XS','S','M','L'],
  stock_by_size = '{"XS": 4, "S": 7, "M": 7, "L": 4}'::jsonb,
  images = array[
    'https://ffurplzqeldxzeheetgg.supabase.co/storage/v1/object/public/products/ice-blouse/1.jpg',
    'https://ffurplzqeldxzeheetgg.supabase.co/storage/v1/object/public/products/ice-blouse/2.jpg'
  ]
where id = '24c34c3a-487d-4ef3-9489-0cf1a84c84b5';

update public.products set
  name = 'Polka Veil Blouse',
  price = 850.00,
  description = 'Blusa en chiffon negro de lunares, cuello y bastilla en volante. Delicada y precisa — inconfundiblemente REEBLOM.',
  tags = array['new-arrival','women','top'],
  sizes = array['XS','S','M','L'],
  stock_by_size = '{"XS": 4, "S": 6, "M": 6, "L": 4}'::jsonb,
  images = array[
    'https://ffurplzqeldxzeheetgg.supabase.co/storage/v1/object/public/products/dotted-blouse/1.jpg',
    'https://ffurplzqeldxzeheetgg.supabase.co/storage/v1/object/public/products/dotted-blouse/2.jpg'
  ]
where id = 'ca874ff4-dedc-4bcf-9939-4dd0b31425bc';
