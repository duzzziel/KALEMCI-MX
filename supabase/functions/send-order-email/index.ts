// Edge Function: send-order-email
//
// Envía los correos transaccionales de una orden vía Resend:
//   1. Alerta de fulfillment al administrador (dirección completa + guía).
//   2. Confirmación de compra al cliente.
//
// Diseño de seguridad:
//   - La API key vive SOLO en los secretos del entorno (Deno.env) — jamás
//     en el código fuente:  npx supabase secrets set RESEND_API_KEY=...
//   - El navegador solo envía { order_id }. El contenido del correo se
//     construye desde la fila real en la base (service role) — un cliente
//     hostil no puede usar esta función como relay de spam con contenido
//     arbitrario.
//   - Idempotente: `orders.notified_at` garantiza un solo disparo por orden.
//
// Despliegue:
//   npx supabase secrets set RESEND_API_KEY=re_...
//   npx supabase functions deploy send-order-email

import { Resend } from 'npm:resend@4'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ⚠️ Remitente de PRUEBAS de Resend. Cuando el dominio kalemci esté
// verificado en Resend (Domains > Add Domain), cámbialo por algo como
// 'KALEMCI <orders@kalemci.mx>'. Nota: con onboarding@resend.dev, Resend
// solo entrega a la dirección del dueño de la cuenta.
const FROM_ADDRESS = 'KALEMCI <onboarding@resend.dev>'

// Destinatario de las alertas de fulfillment (no es un secreto).
const ADMIN_EMAIL = Deno.env.get('ORDER_NOTIFY_EMAIL') ?? 'duzielm@gmail.com'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

// Todo texto proveniente de la base se originó en formularios de usuario:
// se escapa antes de interpolarse en HTML de correo.
function esc(value: unknown): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function money(value: number): string {
  return `$${Number(value).toFixed(2)} MXN`
}

interface OrderRow {
  id: string
  customer_email: string
  telefono: string
  total: number
  items: Array<{ name: string; size: string; qty: number; unit_price: number }>
  estado: string
  localidad_ciudad: string
  colonia: string
  calle: string
  numero_ext_int: string
  codigo_postal: string
  referencias_vivienda: string
  created_at: string
  notified_at: string | null
}

// --- Plantilla base: negro profundo, hairlines plata, tablas (email-safe) ---
function shell(title: string, inner: string): string {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#000000;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#000000;">
      <tr><td align="center" style="padding:40px 16px;">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
          <tr><td align="center" style="padding-bottom:28px;">
            <div style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-weight:700;font-size:26px;letter-spacing:3px;color:#ffffff;">
              KALEMCI<span style="font-size:11px;vertical-align:super;color:#8b9096;">&reg;</span>
            </div>
            <div style="height:1px;width:180px;margin:18px auto 0;background:linear-gradient(90deg,transparent,#C9D0D6,transparent);"></div>
          </td></tr>
          <tr><td align="center" style="padding-bottom:26px;">
            <div style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:11px;letter-spacing:4px;text-transform:uppercase;color:#C9D0D6;">
              ${title}
            </div>
          </td></tr>
          ${inner}
          <tr><td align="center" style="padding-top:34px;">
            <div style="height:1px;width:180px;margin:0 auto 16px;background:linear-gradient(90deg,transparent,rgba(201,208,214,.5),transparent);"></div>
            <div style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:9px;letter-spacing:3px;text-transform:uppercase;color:#5a5f66;">
              Curated scarcity &middot; Anonymous craft &middot; Disruption as form
            </div>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`
}

function itemRows(order: OrderRow): string {
  return order.items
    .map(
      (item) => `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #1c1f24;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:12px;color:#e8eaec;">
          ${esc(item.name)}
          <span style="color:#7c828a;">&middot; ${esc(item.size)} &middot; x${esc(item.qty)}</span>
        </td>
        <td align="right" style="padding:10px 0;border-bottom:1px solid #1c1f24;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:12px;color:#C9D0D6;white-space:nowrap;">
          ${money(item.unit_price * item.qty)}
        </td>
      </tr>`,
    )
    .join('')
}

function totalRow(order: OrderRow): string {
  return `
    <tr>
      <td style="padding:14px 0 0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#7c828a;">Total</td>
      <td align="right" style="padding:14px 0 0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:15px;color:#ffffff;">${money(order.total)}</td>
    </tr>`
}

function label(text: string): string {
  return `<div style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:9px;letter-spacing:3px;text-transform:uppercase;color:#7c828a;padding:16px 0 6px;">${text}</div>`
}

function value(text: string): string {
  return `<div style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:#e8eaec;">${text}</div>`
}

function buildAdminEmail(order: OrderRow): string {
  const inner = `
    <tr><td style="border:1px solid #23262b;padding:22px 24px;">
      ${label('Orden')}
      ${value(`#${esc(order.id.slice(0, 8).toUpperCase())} &middot; ${esc(new Date(order.created_at).toLocaleString('es-MX'))}`)}
      ${label('Art&iacute;culos')}
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${itemRows(order)}${totalRow(order)}</table>
      ${label('Cliente')}
      ${value(`${esc(order.customer_email)}<br/>Tel: ${esc(order.telefono)}`)}
      ${label('Enviar a')}
      ${value(
        `${esc(order.calle)} ${esc(order.numero_ext_int)}<br/>` +
          `Col. ${esc(order.colonia)}, C.P. ${esc(order.codigo_postal)}<br/>` +
          `${esc(order.localidad_ciudad)}, ${esc(order.estado)}, M&eacute;xico`,
      )}
      ${label('Referencias de la vivienda')}
      <div style="border-left:2px solid #C9D0D6;padding-left:12px;">
        ${value(esc(order.referencias_vivienda))}
      </div>
    </td></tr>`
  return shell('Nueva orden &mdash; preparar paquete', inner)
}

function buildCustomerEmail(order: OrderRow): string {
  const inner = `
    <tr><td align="center" style="padding-bottom:22px;">
      <div style="display:inline-block;border:1px solid rgba(201,208,214,.35);padding:10px 26px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:11px;letter-spacing:3px;color:#C9D0D6;">
        ORDER #${esc(order.id.slice(0, 8).toUpperCase())}
      </div>
    </td></tr>
    <tr><td style="border:1px solid #23262b;padding:22px 24px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${itemRows(order)}${totalRow(order)}</table>
      ${label('Env&iacute;o')}
      ${value(`${esc(order.localidad_ciudad)}, ${esc(order.estado)}, M&eacute;xico &mdash; free shipping`)}
      ${label('')}
      ${value('Your piece has entered the archive queue. We will notify you when it ships.')}
    </td></tr>`
  return shell('Order confirmed &mdash; welcome to the archive', inner)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS })
  if (req.method !== 'POST') return json({ error: 'METHOD_NOT_ALLOWED' }, 405)

  const resendKey = Deno.env.get('RESEND_API_KEY')
  if (!resendKey) return json({ error: 'EMAIL_NOT_CONFIGURED' }, 500)

  let orderId: string
  try {
    const body = await req.json()
    orderId = String(body?.order_id ?? '')
  } catch {
    return json({ error: 'INVALID_BODY' }, 400)
  }
  if (!UUID_RE.test(orderId)) return json({ error: 'INVALID_ORDER_ID' }, 400)

  // La verdad vive en la base: se lee la orden con la service role
  // (inyectada por Supabase en el runtime) — nada del cliente se confía.
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const serviceHeaders = {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    'Content-Type': 'application/json',
  }

  const orderRes = await fetch(
    `${supabaseUrl}/rest/v1/orders?select=*&id=eq.${orderId}&limit=1`,
    { headers: serviceHeaders },
  )
  if (!orderRes.ok) return json({ error: 'ORDER_LOOKUP_FAILED' }, 502)

  const [order]: OrderRow[] = await orderRes.json()
  if (!order) return json({ error: 'ORDER_NOT_FOUND' }, 404)

  // Idempotencia: una orden notifica exactamente una vez.
  if (order.notified_at) return json({ sent: false, reason: 'ALREADY_NOTIFIED' })

  const resend = new Resend(resendKey)
  const shortId = order.id.slice(0, 8).toUpperCase()

  // 1. Alerta de fulfillment al admin (crítica: si falla, se reporta error).
  const adminSend = await resend.emails.send({
    from: FROM_ADDRESS,
    to: ADMIN_EMAIL,
    subject: `🖤 Nueva orden #${shortId} — preparar paquete`,
    html: buildAdminEmail(order),
  })
  if (adminSend.error) {
    console.error('Resend admin email failed:', adminSend.error)
    return json({ error: 'EMAIL_SEND_FAILED' }, 502)
  }

  // 2. Confirmación al cliente (best-effort: en modo prueba Resend solo
  //    entrega al dueño de la cuenta; no debe tumbar la notificación).
  const customerSend = await resend.emails.send({
    from: FROM_ADDRESS,
    to: order.customer_email,
    subject: `KALEMCI — Order #${shortId} confirmed`,
    html: buildCustomerEmail(order),
  })
  if (customerSend.error) {
    console.warn('Resend customer email failed (test mode?):', customerSend.error)
  }

  // Marca la orden como notificada (cierra la ventana de reenvío).
  await fetch(`${supabaseUrl}/rest/v1/orders?id=eq.${orderId}`, {
    method: 'PATCH',
    headers: serviceHeaders,
    body: JSON.stringify({ notified_at: new Date().toISOString() }),
  })

  return json({
    sent: true,
    admin_email_id: adminSend.data?.id ?? null,
    customer_email_id: customerSend.data?.id ?? null,
  })
})
