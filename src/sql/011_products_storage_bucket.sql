-- 011_products_storage_bucket.sql
-- Bucket público para las fotografías reales de producto (REEBLOM). Lectura
-- anónima (las fotos deben cargar en la tienda sin sesión iniciada); subida,
-- reemplazo y borrado solo para el admin — mismo criterio de whitelist que
-- ya protege products/orders (003_secure_admin_rls.sql).

insert into storage.buckets (id, name, public)
values ('products', 'products', true)
on conflict (id) do nothing;

create policy "Public read product images"
  on storage.objects for select
  using (bucket_id = 'products');

create policy "Admin upload product images"
  on storage.objects for insert
  with check (
    bucket_id = 'products'
    and lower(auth.jwt() ->> 'email') = lower('DuzielM@gmail.com')
  );

create policy "Admin update product images"
  on storage.objects for update
  using (
    bucket_id = 'products'
    and lower(auth.jwt() ->> 'email') = lower('DuzielM@gmail.com')
  );

create policy "Admin delete product images"
  on storage.objects for delete
  using (
    bucket_id = 'products'
    and lower(auth.jwt() ->> 'email') = lower('DuzielM@gmail.com')
  );
