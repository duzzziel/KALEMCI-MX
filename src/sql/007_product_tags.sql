-- 007_product_tags.sql
-- Tags de catálogo: hasta ahora el filtrado por categoría vivía hardcodeado
-- por nombre en el frontend (src/lib/categories.js). Con esta columna, el
-- admin asigna cada prenda a sus filtros desde el panel.

alter table public.products
  add column if not exists tags text[] not null default '{}';

-- Solo tags del vocabulario permitido — evita basura y typos en los filtros.
alter table public.products
  drop constraint if exists products_tags_allowed;

alter table public.products
  add constraint products_tags_allowed
  check (tags <@ array['new-arrival', 'men', 'women', 'accessories']::text[]);

-- Backfill con el mapeo que hasta hoy vivía en el frontend. Toda la primera
-- colección (REEBLOM) es además 'new-arrival'.
update public.products
set tags = case
  when name in ('Reaper Trench Coat', 'Blackout Cargo Joggers') then array['new-arrival', 'men']
  when name = 'Neon Cross Longsleeve' then array['new-arrival', 'women']
  when name = 'Static Noise Balaclava' then array['new-arrival', 'accessories']
  else array['new-arrival']
end
where tags = '{}';
