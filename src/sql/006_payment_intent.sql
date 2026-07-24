-- 006_payment_intent.sql
-- Trazabilidad de pagos: cada orden guarda el PaymentIntent de Stripe que la
-- pagó, para reconciliar el dashboard de Stripe contra la tabla orders.
--
-- Requiere 005_orders_and_checkout_rpc.sql.

alter table public.orders
  add column if not exists payment_intent_id text;

-- Se reemplaza la función con un tercer parámetro OPCIONAL (default null):
-- drop explícito primero — un CREATE OR REPLACE con firma distinta crearía
-- una sobrecarga y PostgREST no sabría a cuál despachar.
drop function if exists public.place_order_safely(jsonb, jsonb);

create function public.place_order_safely(
  p_items jsonb,
  p_shipping jsonb,
  p_payment_intent_id text default null
)
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
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'EMPTY_CART';
  end if;
  if jsonb_array_length(p_items) > 50 then
    raise exception 'TOO_MANY_ITEMS';
  end if;
  if p_shipping is null or jsonb_typeof(p_shipping) <> 'object' then
    raise exception 'INVALID_SHIPPING';
  end if;

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

    v_total := v_total + (v_product.price * v_qty);
    v_order_items := v_order_items || jsonb_build_array(jsonb_build_object(
      'product_id', v_product.id,
      'name', v_product.name,
      'size', v_size,
      'qty', v_qty,
      'unit_price', v_product.price
    ));
  end loop;

  insert into public.orders (
    customer_email, telefono, total, items,
    estado, localidad_ciudad, colonia, calle,
    numero_ext_int, codigo_postal, referencias_vivienda,
    payment_intent_id
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
    trim(p_shipping ->> 'referencias_vivienda'),
    nullif(trim(coalesce(p_payment_intent_id, '')), '')
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
    raise exception 'INVALID_ITEMS';
end;
$$;

revoke all on function public.place_order_safely(jsonb, jsonb, text) from public;
grant execute on function public.place_order_safely(jsonb, jsonb, text) to anon, authenticated;


