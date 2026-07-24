-- 001_create_products.sql
-- Crea la tabla `products` y sus políticas de Row Level Security.

create extension if not exists "pgcrypto";

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  price numeric not null,
  images text[] not null default '{}',
  sizes text[] not null default '{}',
  description text,
  created_at timestamptz not null default now()
);

alter table public.products enable row level security;

-- Lectura pública: cualquiera puede ver el catálogo.
create policy "Products are viewable by everyone"
  on public.products
  for select
  using (true);

-- Escritura restringida: solo usuarios autenticados (administradores) pueden
-- crear, actualizar o borrar productos.
create policy "Only authenticated users can insert products"
  on public.products
  for insert
  with check (auth.uid() is not null);

create policy "Only authenticated users can update products"
  on public.products
  for update
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

create policy "Only authenticated users can delete products"
  on public.products
  for delete
  using (auth.uid() is not null);
