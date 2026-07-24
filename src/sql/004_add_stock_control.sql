-- 004_add_stock_control.sql
-- Control de inventario por talla para evitar sobreventa en drops limitados.
--
-- Diseño: columna JSONB `stock_by_size` con relación talla → unidades,
-- p. ej. {"S": 5, "M": 12, "L": 0}. Encaja con el array `sizes` existente
-- sin normalizar a una tabla aparte (innecesario a esta escala).

alter table public.products
  add column if not exists stock_by_size jsonb not null default '{}'::jsonb;

-- Blindaje a nivel de base de datos: todos los valores del JSONB deben ser
-- enteros >= 0. Ni siquiera una sesión de admin (o un payload manipulado que
-- salte la sanitización del frontend) puede guardar stock negativo o basura.
create or replace function public.stock_by_size_is_valid(stock jsonb)
returns boolean
language sql
immutable
as $$
  select coalesce(
    bool_and(
      jsonb_typeof(value) = 'number'
      and (value::text)::numeric >= 0
      and (value::text)::numeric = floor((value::text)::numeric)
    ),
    true
  )
  from jsonb_each(stock)
$$;

alter table public.products
  drop constraint if exists products_stock_by_size_valid;

alter table public.products
  add constraint products_stock_by_size_valid
  check (
    jsonb_typeof(stock_by_size) = 'object'
    and public.stock_by_size_is_valid(stock_by_size)
  );

-- Backfill: los productos existentes reciben 8 unidades por cada talla
-- que ya tienen declarada en `sizes`.
update public.products
set stock_by_size = coalesce(
  (select jsonb_object_agg(size, 8) from unnest(sizes) as size),
  '{}'::jsonb
)
where stock_by_size = '{}'::jsonb;

-- Casos de prueba visibles para validar la UI de inmediato:
-- una talla agotada en un producto...
update public.products
set stock_by_size = jsonb_set(stock_by_size, '{S}', '0')
where name = 'Reaper Trench Coat';

-- ...y un producto de talla única casi agotado (para probar el tope del carrito).
update public.products
set stock_by_size = '{"One Size": 2}'::jsonb
where name = 'Static Noise Balaclava';
