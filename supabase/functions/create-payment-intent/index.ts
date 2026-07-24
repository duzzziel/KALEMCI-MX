// Edge Function: create-payment-intent
//
// Único componente con acceso a la CLAVE SECRETA de Stripe. Corre en el
// servidor de Supabase (Deno) — la sk_ jamás viaja al navegador.
//
// Reglas de oro implementadas:
//   1. El MONTO se calcula aquí, leyendo precios reales de la tabla products.
//      El cliente solo manda ids/tallas/cantidades; si mandara "total: 1"
//      se ignora por completo.
//   2. Pre-verificación de stock ANTES de crear el intento: no se cobra a
//      nadie por una prenda que ya se agotó. (La reserva definitiva la hace
//      place_order_safely con FOR UPDATE tras el pago.)
//
// Despliegue:
//   npx supabase secrets set STRIPE_SECRET_KEY=sk_test_...
//   npx supabase functions deploy create-payment-intent

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

interface CartItem {
  product_id: string
  size: string
  qty: number
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }
  if (req.method !== 'POST') {
    return json({ error: 'METHOD_NOT_ALLOWED' }, 405)
  }

  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')
  if (!stripeKey) {
    return json({ error: 'PAYMENTS_NOT_CONFIGURED' }, 500)
  }

  let items: CartItem[]
  try {
    const body = await req.json()
    items = body?.items
  } catch {
    return json({ error: 'INVALID_BODY' }, 400)
  }

  if (!Array.isArray(items) || items.length === 0 || items.length > 50) {
    return json({ error: 'INVALID_ITEMS' }, 400)
  }
  for (const item of items) {
    if (
      typeof item?.product_id !== 'string' ||
      typeof item?.size !== 'string' ||
      !Number.isInteger(item?.qty) ||
      item.qty < 1 ||
      item.qty > 20
    ) {
      return json({ error: 'INVALID_ITEMS' }, 400)
    }
  }

  // Precios y stock desde la base — el catálogo es de lectura pública,
  // basta la anon key que Supabase inyecta en el runtime.
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
  const ids = [...new Set(items.map((i) => i.product_id))].join(',')

  const productsRes = await fetch(
    `${supabaseUrl}/rest/v1/products?select=id,name,price,stock_by_size&id=in.(${ids})`,
    { headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` } },
  )
  if (!productsRes.ok) {
    return json({ error: 'CATALOG_UNAVAILABLE' }, 502)
  }
  const products: Array<{
    id: string
    name: string
    price: number
    stock_by_size: Record<string, number> | null
  }> = await productsRes.json()
  const byId = new Map(products.map((p) => [p.id, p]))

  let totalCents = 0
  const summary: string[] = []
  for (const item of items) {
    const product = byId.get(item.product_id)
    if (!product) return json({ error: 'PRODUCT_NOT_FOUND' }, 400)

    const stock = Number(product.stock_by_size?.[item.size] ?? 0)
    if (stock < item.qty) {
      return json({ error: `OUT_OF_STOCK: ${product.name} (${item.size})` }, 409)
    }

    totalCents += Math.round(Number(product.price) * 100) * item.qty
    summary.push(`${product.name} [${item.size}] x${item.qty}`)
  }

  if (totalCents < 1000) {
    // Mínimo de Stripe para MXN: $10.00
    return json({ error: 'AMOUNT_TOO_SMALL' }, 400)
  }

  const params = new URLSearchParams()
  params.append('amount', String(totalCents))
  params.append('currency', 'mxn')
  params.append('payment_method_types[]', 'card')
  params.append('description', 'KALEMCI order')
  params.append('metadata[items]', summary.join(' | ').slice(0, 500))

  const stripeRes = await fetch('https://api.stripe.com/v1/payment_intents', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${stripeKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params,
  })

  const intent = await stripeRes.json()
  if (!stripeRes.ok) {
    console.error('Stripe error:', intent?.error?.message)
    return json({ error: 'PAYMENT_PROVIDER_ERROR' }, 502)
  }

  return json({
    client_secret: intent.client_secret,
    payment_intent_id: intent.id,
    amount: totalCents,
  })
})
