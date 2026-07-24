-- 005_orders_and_checkout_rpc.sql
-- Núcleo transaccional: tabla de órdenes con logística MX + RPC atómica
-- inmune a condiciones de carrera.
--
-- Requiere 004_add_stock_control.sql (columna stock_by_size).

-- ---------------------------------------------------------------------------
-- 1. Estado de la orden
-- ---------------------------------------------------------------------------
create type public.order_status as enum ('paid', 'shipped', 'received');

-- ---------------------------------------------------------------------------
-- 2. Tabla orders — logística estricta para México
-- ---------------------------------------------------------------------------
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_email text not null
    check (customer_email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  telefono text not null
    check (telefono ~ '^[0-9]{10}$'),
  -- El total SIEMPRE lo calcula el servidor dentro de la RPC a partir de los
  -- precios reales de products — el cliente nunca lo envía.
  total numeric not null check (total >= 0),
  items jsonb not null,
  status public.order_status not null default 'paid',
  estado text not null check (length(trim(estado)) > 0),
  localidad_ciudad text not null check (length(trim(localidad_ciudad)) > 0),
  colonia text not null check (length(trim(colonia)) > 0),
  calle text not null check (length(trim(calle)) > 0),
  numero_ext_int text not null check (length(trim(numero_ext_int)) > 0),
  codigo_postal text not null check (codigo_postal ~ '^[0-9]{5}$'),
  referencias_vivienda text not null check (length(trim(referencias_vivienda)) > 0),
  created_at timestamptz not null default now()
);


-- Índice para las consultas del panel (activas por antigüedad, historial desc).
create index orders_status_created_at_idx on public.orders (status, created_at);

-- ---------------------------------------------------------------------------
-- 3. RLS: los clientes anónimos no pueden leer ni tocar órdenes.
--    Solo el admin de la lista blanca consulta y actualiza. No hay política
--    de INSERT: la única puerta de entrada es la RPC (security definer).
-- ---------------------------------------------------------------------------
alter table public.orders enable row level security;

create policy "Only whitelisted admins can read orders"
  on public.orders
  for select
  using (lower(auth.jwt() ->> 'email') = lower('DuzielM@gmail.com'));

create policy "Only whitelisted admins can update orders"
  on public.orders
  for update
  using (lower(auth.jwt() ->> 'email') = lower('DuzielM@gmail.com'))
  with check (lower(auth.jwt() ->> 'email') = lower('DuzielM@gmail.com'));

-- ---------------------------------------------------------------------------
-- 4. RPC atómica: place_order_safely(p_items, p_shipping)
--
-- p_items:    [{"product_id": "<uuid>", "size": "M", "qty": 1}, ...]
-- p_shipping: {"customer_email","telefono","estado","localidad_ciudad",
--              "colonia","calle","numero_ext_int","codigo_postal",
--              "referencias_vivienda"}
--
-- Toda la función corre en UNA transacción: si cualquier ítem falla,
-- rollback completo (ni stock descontado ni orden creada).
--
-- SECURITY DEFINER: ejecuta con privilegios del dueño, saltando RLS de
-- products/orders SOLO dentro de esta lógica controlada. search_path fijo
-- para impedir suplantación de objetos.
-- ---------------------------------------------------------------------------
create or replace function public.place_order_safely(p_items jsonb, p_shipping jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item jsonb;
  v_product public.products%rowtype;
  v_size text;
  v_qty int;
  v_stock int;
  v_total numeric := 0;
  v_order_items jsonb := '[]'::jsonb;
  v_order public.orders%rowtype;
begin
  -- Validación estructural del carrito
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'EMPTY_CART';
  end if;
  if jsonb_array_length(p_items) > 50 then
    raise exception 'TOO_MANY_ITEMS';
  end if;
  if p_shipping is null or jsonb_typeof(p_shipping) <> 'object' then
    raise exception 'INVALID_SHIPPING';
  end if;

  -- Recorrido con bloqueo de filas. El ORDER BY product_id garantiza que dos
  -- transacciones concurrentes bloqueen en el mismo orden (sin deadlocks):
  -- la segunda espera a la primera y ve el stock ya descontado.
  for v_item in
    select value from jsonb_array_elements(p_items) order by value ->> 'product_id'
  loop
    v_size := trim(coalesce(v_item ->> 'size', ''));
    v_qty := coalesce((v_item ->> 'qty')::int, 0);

    if v_size = '' then raise exception 'INVALID_SIZE'; end if;
    if v_qty < 1 or v_qty > 20 then raise exception 'INVALID_QTY'; end if;

    select * into v_product
    from public.products
    where id = (v_item ->> 'product_id')::uuid
    for update;

    if not found then
      raise exception 'PRODUCT_NOT_FOUND';
    end if;

    v_stock := coalesce((v_product.stock_by_size ->> v_size)::int, 0);
    if v_stock < v_qty then
      raise exception 'OUT_OF_STOCK: % (%)', v_product.name, v_size;
    end if;

    update public.products
    set stock_by_size = jsonb_set(stock_by_size, array[v_size], to_jsonb(v_stock - v_qty))
    where id = v_product.id;

    -- Nombre y precio se toman de la base, jamás del payload del cliente.
    v_total := v_total + (v_product.price * v_qty);
    v_order_items := v_order_items || jsonb_build_array(jsonb_build_object(
      'product_id', v_product.id,
      'name', v_product.name,
      'size', v_size,
      'qty', v_qty,
      'unit_price', v_product.price
    ));
  end loop;

  -- Los CHECK de la tabla validan email, teléfono (10 dígitos), CP (5 dígitos)
  -- y campos de dirección no vacíos; cualquier violación aborta la transacción.
  insert into public.orders (
    customer_email, telefono, total, items,
    estado, localidad_ciudad, colonia, calle,
    numero_ext_int, codigo_postal, referencias_vivienda
  )
  values (
    lower(trim(p_shipping ->> 'customer_email')),
    trim(p_shipping ->> 'telefono'),
    v_total,
    v_order_items,
    trim(p_shipping ->> 'estado'),
    trim(p_shipping ->> 'localidad_ciudad'),
    trim(p_shipping ->> 'colonia'),
    trim(p_shipping ->> 'calle'),
    trim(p_shipping ->> 'numero_ext_int'),
    trim(p_shipping ->> 'codigo_postal'),
    trim(p_shipping ->> 'referencias_vivienda')
  )
  returning * into v_order;

  return jsonb_build_object(
    'order_id', v_order.id,
    'total', v_order.total,
    'items', v_order.items,
    'created_at', v_order.created_at
  );
exception
  when invalid_text_representation then
    -- uuid/entero malformado en el payload
    raise exception 'INVALID_ITEMS';
end;
$$;

-- Ejecución pública de la RPC (cualquiera puede comprar), nada más.
revoke all on function public.place_order_safely(jsonb, jsonb) from public;
grant execute on function public.place_order_safely(jsonb, jsonb) to anon, authenticated;
