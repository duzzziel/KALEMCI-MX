-- 010_order_notified.sql
-- Idempotencia del correo transaccional: la Edge Function send-order-email
-- marca aquí cuándo notificó una orden — cada orden dispara correos una
-- sola vez, aunque el cliente reintente o alguien invoque la función a mano.

alter table public.orders
  add column if not exists notified_at timestamptz;
