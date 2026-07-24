// Correos transaccionales de órdenes — Resend vía Edge Function.
//
// El navegador solo envía el order_id: la función lee la orden real de la
// base con la service role y construye los correos desde ahí (anti-spam:
// nadie puede usar nuestro remitente con contenido arbitrario). Es
// idempotente en el servidor (orders.notified_at), así que reintentar es
// seguro. Fire-and-forget: un fallo de correo jamás rompe el checkout.
import { supabase } from '../supabase'

export function notifyAdminsOfOrder(order) {
  if (!supabase || !order?.order_id) return

  supabase.functions
    .invoke('send-order-email', { body: { order_id: order.order_id } })
    .then(({ data, error }) => {
      if (error) {
        console.warn('Correo de orden no enviado (¿función sin desplegar?):', error.message)
        return
      }
      console.info(
        `Correos de la orden ${String(order.order_id).slice(0, 8)} →`,
        data?.sent ? 'enviados' : `omitidos (${data?.reason ?? 'sin motivo'})`,
      )
    })
    .catch((error) => {
      console.warn('Correo de orden no enviado:', error?.message ?? error)
    })
}
