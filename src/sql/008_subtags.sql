-- 008_subtags.sql
-- Amplía el vocabulario de tags con los subtags de tipo de prenda definidos
-- por dirección de arte. Los tags primarios (filtros principales) conviven
-- con los subtags en la misma columna text[].

alter table public.products
  drop constraint if exists products_tags_allowed;

alter table public.products
  add constraint products_tags_allowed
  check (
    tags <@ array[
      -- primarios
      'new-arrival', 'men', 'women', 'accessories',
      -- subtags de prenda
      'top', 'bottom', 'jackets', 'underwear', 'denim', 'tracksuits',
      'skirts', 'dresses', 'bodysuits', 'corsets', 'leather', 'pants'
    ]::text[]
  );
