-- 009_order_tracking.sql
-- Logística de envíos: número de guía (obligatorio al marcar 'shipped'
-- desde el panel — lo exige el frontend) y link de rastreo opcional.

alter table public.orders
  add column if not exists tracking_number text;

alter table public.orders
  add column if not exists tracking_url text
  check (tracking_url is null or tracking_url ~* '^https?://');


