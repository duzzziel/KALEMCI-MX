-- 003_secure_admin_rls.sql
-- Endurece las políticas de escritura de public.products creadas en 001.
--
-- Antes: cualquier usuario autenticado (auth.uid() is not null) podía escribir.
-- Eso permite escalada de privilegios trivial: basta registrarse con cualquier
-- correo para obtener permisos de escritura sobre el catálogo.
--
-- Ahora: solo la lista blanca de administradores. El claim 'email' del JWT lo
-- emite y firma Supabase Auth en el servidor — el cliente no puede alterarlo
-- sin invalidar la firma del token, por lo que esta comparación es confiable.
--
-- ⚠️ ANTES DE EJECUTAR: sustituye 'DuzielM@gmail.com' por tu correo real
--    (el mismo con el que crearás tu usuario en Authentication > Users).
--    Debe coincidir también con ADMIN_EMAILS en src/lib/adminAuth.js
--    (esa lista solo controla UI; esta política es la barrera real).

-- Se eliminan las políticas permisivas de 001.
drop policy if exists "Only authenticated users can insert products" on public.products;
drop policy if exists "Only authenticated users can update products" on public.products;
drop policy if exists "Only authenticated users can delete products" on public.products;

-- lower() en ambos lados: los correos no distinguen mayúsculas y Supabase
-- puede normalizarlos; sin esto un mismatch de capitalización bloquearía
-- al admin legítimo (o, peor, invitaría a relajar la regla).
create policy "Only whitelisted admins can insert products"
  on public.products
  for insert
  with check (lower(auth.jwt() ->> 'email') = lower('DuzielM@gmail.com'));

create policy "Only whitelisted admins can update products"
  on public.products
  for update
  using (lower(auth.jwt() ->> 'email') = lower('DuzielM@gmail.com'))
  with check (lower(auth.jwt() ->> 'email') = lower('DuzielM@gmail.com'));

create policy "Only whitelisted admins can delete products"
  on public.products
  for delete
  using (lower(auth.jwt() ->> 'email') = lower('DuzielM@gmail.com'));

-- La política de SELECT público de 001 ("Products are viewable by everyone")
-- se conserva intacta: el catálogo sigue siendo de lectura pública.

