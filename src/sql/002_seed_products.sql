-- 002_seed_products.sql
-- Inserta 4 productos de catálogo (estética opium / cyber-gothic) en public.products.
--
-- La tabla tiene RLS activo y la política de INSERT exige auth.uid() is not null,
-- así que la anon key del frontend NO puede ejecutar este script. Debe correrse
-- desde el SQL Editor de Supabase (dashboard) o con la service_role key, ambos
-- casos ejecutan como rol con privilegios que ignoran RLS.

-- Nota: la columna stock_by_size la crea 004_add_stock_control.sql — en una
-- instalación fresca ejecuta 001 → 004 antes de este seed, o corre este seed
-- primero y deja que el backfill de 004 rellene el stock.
insert into public.products (name, price, images, sizes, description, stock_by_size)
values
  (
    'Reaper Trench Coat',
    340.00,
    array[
      'https://picsum.photos/seed/reaper-trench/600/800',
      'https://picsum.photos/seed/reaper-trench-alt/600/800'
    ],
    array['S', 'M', 'L', 'XL'],
    'Abrigo largo oversized en negro mate con herrajes plateados y capucha desmontable. Silueta gothic-utility para clima frío.',
    '{"S": 0, "M": 8, "L": 8, "XL": 4}'::jsonb
  ),
  (
    'Static Noise Balaclava',
    58.00,
    array[
      'https://picsum.photos/seed/static-balaclava/600/800',
      'https://picsum.photos/seed/static-balaclava-alt/600/800'
    ],
    array['One Size'],
    'Pasamontañas de punto fino con estampado glitch/tv-static. Accesorio clave del look cyber-gothic.',
    '{"One Size": 2}'::jsonb
  ),
  (
    'Blackout Cargo Joggers',
    148.00,
    array[
      'https://picsum.photos/seed/blackout-cargo/600/800',
      'https://picsum.photos/seed/blackout-cargo-alt/600/800'
    ],
    array['S', 'M', 'L', 'XL'],
    'Jogger cargo de corte ancho con múltiples bolsillos, cintas ajustables en el tobillo y tela ripstop resistente.',
    '{"S": 8, "M": 8, "L": 8, "XL": 8}'::jsonb
  ),
  (
    'Neon Cross Longsleeve',
    92.00,
    array[
      'https://picsum.photos/seed/neon-cross/600/800',
      'https://picsum.photos/seed/neon-cross-alt/600/800'
    ],
    array['S', 'M', 'L', 'XL'],
    'Playera manga larga negra con gráfico de cruz en tinta reflejante neón. Fit oversized, algodón pesado 260gsm.',
    '{"S": 8, "M": 8, "L": 8, "XL": 8}'::jsonb
  );
