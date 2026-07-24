<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import Navbar from '../components/Navbar.vue'
import Footer from '../components/Footer.vue'
import { cart, cartTotal, clearCart } from '../store/cart'
import { supabase } from '../supabase'
import { MEXICO_STATES } from '../lib/mexicoStates'
import { notifyAdminsOfOrder } from '../lib/notifications'
import { saveLastOrder } from '../lib/lastOrder'
import { getStripe, CARD_ELEMENT_STYLE } from '../lib/stripe'

const router = useRouter()

const form = ref({
  customer_email: '',
  telefono: '',
  estado: '',
  localidad_ciudad: '',
  colonia: '',
  calle: '',
  numero_ext_int: '',
  codigo_postal: '',
  referencias_vivienda: '',
})

const processing = ref(false)
const errorMessage = ref('')

// --- Stripe Elements ---
const cardMount = ref(null)
const cardReady = ref(false)
const cardComplete = ref(false)
const cardError = ref('')
let stripe = null
let cardElement = null

onMounted(async () => {
  if (cart.items.length === 0) {
    router.replace('/')
    return
  }

  stripe = await getStripe()
  if (!stripe || !cardMount.value) return

  const elements = stripe.elements()
  cardElement = elements.create('card', {
    style: CARD_ELEMENT_STYLE,
    hidePostalCode: true, // el CP logístico ya se captura en el formulario MX
  })
  cardElement.mount(cardMount.value)
  cardElement.on('ready', () => {
    cardReady.value = true
  })
  cardElement.on('change', (event) => {
    cardComplete.value = event.complete
    cardError.value = event.error?.message ?? ''
  })
})

onBeforeUnmount(() => {
  cardElement?.destroy()
})

function formatPrice(value) {
  return `$${Number(value).toFixed(2)}`
}

// Validación estricta espejo de los CHECK del servidor: rechazar aquí lo que
// la base rechazaría, con mensajes útiles en lugar de un error de constraint.
function validateForm() {
  const f = form.value

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.customer_email.trim())) {
    return 'Enter a valid email address.'
  }
  if (!/^\d{10}$/.test(f.telefono.trim())) {
    return 'Phone must be exactly 10 digits.'
  }
  if (!MEXICO_STATES.includes(f.estado)) {
    return 'Select your estado.'
  }
  for (const [field, label] of [
    ['localidad_ciudad', 'Ciudad / Localidad'],
    ['colonia', 'Colonia'],
    ['calle', 'Calle'],
    ['numero_ext_int', 'Número ext/int'],
  ]) {
    if (!f[field].trim()) return `${label} is required.`
  }
  if (!/^\d{5}$/.test(f.codigo_postal.trim())) {
    return 'Código postal must be exactly 5 digits.'
  }
  if (f.referencias_vivienda.trim().length < 10) {
    return 'Referencias de la vivienda: describe fachada, portón o entre calles (min 10 characters).'
  }
  if (cart.items.some((item) => !item.size)) {
    return 'An item in your bag is missing its size — remove it and add it again.'
  }
  if (!stripe || !cardElement) {
    return 'Payment form is not ready. Reload and try again.'
  }
  if (!cardComplete.value) {
    return 'Complete your card details.'
  }
  return null
}

function mapRpcError(message = '') {
  if (message.includes('OUT_OF_STOCK')) {
    // El mensaje del servidor trae "OUT_OF_STOCK: <nombre> (<talla>)"
    const detail = message.split('OUT_OF_STOCK:')[1]?.trim()
    return detail ? `Out of stock — ${detail} just sold out.` : 'An item just sold out.'
  }
  if (message.includes('EMPTY_CART')) return 'Your bag is empty.'
  if (message.includes('PRODUCT_NOT_FOUND') || message.includes('INVALID_ITEMS')) {
    return 'An item in your bag is no longer available.'
  }
  return 'Could not process the order. Try again.'
}

async function placeOrder() {
  if (processing.value) return
  errorMessage.value = ''

  const validationError = validateForm()
  if (validationError) {
    errorMessage.value = validationError
    return
  }

  processing.value = true
  try {
    const shipping = Object.fromEntries(
      Object.entries(form.value).map(([key, value]) => [key, value.trim()]),
    )
    const items = cart.items.map((item) => ({
      product_id: item.id,
      size: item.size,
      qty: item.quantity,
    }))

    // 1. La Edge Function calcula el monto en el servidor (precios reales +
    //    pre-chequeo de stock) y crea el PaymentIntent con la clave secreta.
    const { data: intent, error: intentError } = await supabase.functions.invoke(
      'create-payment-intent',
      { body: { items } },
    )

    if (intentError || !intent?.client_secret) {
      // FunctionsHttpError trae la Response en .context; el cuerpo se lee una vez.
      let detail = ''
      try {
        detail = intentError?.context?.text ? await intentError.context.text() : ''
      } catch {
        /* cuerpo ilegible: cae al mensaje genérico */
      }
      errorMessage.value = detail.includes('OUT_OF_STOCK')
        ? mapRpcError(detail)
        : 'Payment service unavailable. Try again in a moment.'
      return
    }

    // 2. Confirmación del cobro con los datos de tarjeta (nunca salen del
    //    iframe de Stripe; este cliente jamás ve el número completo).
    const result = await stripe.confirmCardPayment(intent.client_secret, {
      payment_method: {
        card: cardElement,
        billing_details: { email: shipping.customer_email, phone: shipping.telefono },
      },
    })

    if (result.error) {
      // Mensajes de Stripe ya localizados y aptos para el usuario
      // (tarjeta rechazada, fondos insuficientes, CVC inválido...).
      errorMessage.value = result.error.message ?? 'Payment failed. Try another card.'
      return
    }

    if (result.paymentIntent?.status !== 'succeeded') {
      errorMessage.value = 'Payment was not completed. Try again.'
      return
    }

    // 3. Pago cobrado: registrar la orden y descontar stock atómicamente.
    const { data, error } = await supabase.rpc('place_order_safely', {
      p_items: items,
      p_shipping: shipping,
      p_payment_intent_id: result.paymentIntent.id,
    })

    if (error) {
      // Ventana rarísima: pago exitoso pero el stock se agotó entre el
      // pre-chequeo y la reserva. En producción, el webhook de Stripe deberá
      // reembolsar automáticamente; por ahora se instruye contacto.
      errorMessage.value = `${mapRpcError(error.message)} Your payment (${result.paymentIntent.id}) will be refunded — contact us.`
      return
    }

    const order = { ...data, customer_email: shipping.customer_email, estado: shipping.estado }
    saveLastOrder(order)
    notifyAdminsOfOrder(order)
    clearCart()
    router.replace(`/order-success/${data.order_id}`)
  } catch {
    errorMessage.value = 'Could not process the order. Try again.'
  } finally {
    processing.value = false
  }
}
</script>

<template>
  <div class="flex min-h-screen flex-col bg-black text-white">
    <Navbar />

    <!-- Loader de procesamiento -->
    <Transition
      enter-active-class="transition-opacity duration-300"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
    >
      <div
        v-if="processing"
        class="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-8 bg-black/95"
      >
        <!-- Tinte atmosférico Blue Depths tras el ornamento -->
        <div
          class="pointer-events-none absolute inset-0"
          style="background: radial-gradient(circle at 50% 45%, rgba(38, 48, 86, 0.35) 0%, transparent 55%)"
        ></div>

        <span class="processing-mark relative font-display text-2xl text-silver/80">&#10022;</span>
        <p class="relative font-grotesk text-[10px] uppercase tracking-[0.5em] text-white/70">
          Processing payment
        </p>
        <span
          class="processing-rule relative block h-px w-40"
          style="background: linear-gradient(90deg, transparent, rgba(201, 208, 214, 0.6), transparent)"
        ></span>
        <p class="relative font-grotesk text-[9px] uppercase tracking-[0.35em] text-white/30">
          Do not close this window
        </p>
      </div>
    </Transition>

    <main class="mx-auto grid w-full max-w-6xl flex-1 grid-cols-1 gap-x-14 gap-y-10 px-6 py-12 lg:grid-cols-[11fr_9fr]">
      <!-- Formulario de envío (México) -->
      <section>
        <h1 class="font-display text-2xl font-semibold uppercase tracking-[0.25em]">Checkout</h1>
        <p class="mt-2 font-grotesk text-[9px] uppercase tracking-[0.35em] text-white/35">
          Shipping &mdash; México only
        </p>

        <form class="mt-10 flex flex-col gap-6" @submit.prevent="placeOrder">
          <label class="block">
            <span class="mb-2 block font-grotesk text-[10px] uppercase tracking-[0.3em] text-white/40">Email</span>
            <input
              v-model="form.customer_email"
              type="email"
              autocomplete="email"
              class="w-full border border-white/20 bg-transparent px-3 py-3 font-grotesk text-xs tracking-wider text-white transition-colors duration-300 placeholder:text-white/20 focus:border-silver/60 focus:outline-none"
              placeholder="you@domain.com"
            />
          </label>

          <label class="block">
            <span class="mb-2 block font-grotesk text-[10px] uppercase tracking-[0.3em] text-white/40">Teléfono (10 dígitos)</span>
            <input
              v-model="form.telefono"
              type="tel"
              inputmode="numeric"
              maxlength="10"
              autocomplete="tel-national"
              class="w-full border border-white/20 bg-transparent px-3 py-3 font-grotesk text-xs tracking-wider text-white transition-colors duration-300 placeholder:text-white/20 focus:border-silver/60 focus:outline-none"
              placeholder="3312345678"
            />
          </label>

          <div class="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <label class="block">
              <span class="mb-2 block font-grotesk text-[10px] uppercase tracking-[0.3em] text-white/40">Estado</span>
              <select
                v-model="form.estado"
                class="w-full border border-white/20 bg-black px-3 py-3 font-grotesk text-xs tracking-wider text-white transition-colors duration-300 focus:border-silver/60 focus:outline-none"
              >
                <option value="" disabled>Select estado...</option>
                <option v-for="state in MEXICO_STATES" :key="state" :value="state">{{ state }}</option>
              </select>
            </label>

            <label class="block">
              <span class="mb-2 block font-grotesk text-[10px] uppercase tracking-[0.3em] text-white/40">Ciudad / Localidad</span>
              <input
                v-model="form.localidad_ciudad"
                type="text"
                maxlength="120"
                class="w-full border border-white/20 bg-transparent px-3 py-3 font-grotesk text-xs tracking-wider text-white transition-colors duration-300 placeholder:text-white/20 focus:border-silver/60 focus:outline-none"
                placeholder="Guadalajara"
              />
            </label>
          </div>

          <div class="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <label class="block">
              <span class="mb-2 block font-grotesk text-[10px] uppercase tracking-[0.3em] text-white/40">Colonia</span>
              <input
                v-model="form.colonia"
                type="text"
                maxlength="120"
                class="w-full border border-white/20 bg-transparent px-3 py-3 font-grotesk text-xs tracking-wider text-white transition-colors duration-300 placeholder:text-white/20 focus:border-silver/60 focus:outline-none"
                placeholder="Col. Americana"
              />
            </label>

            <label class="block">
              <span class="mb-2 block font-grotesk text-[10px] uppercase tracking-[0.3em] text-white/40">Código Postal</span>
              <input
                v-model="form.codigo_postal"
                type="text"
                inputmode="numeric"
                maxlength="5"
                autocomplete="postal-code"
                class="w-full border border-white/20 bg-transparent px-3 py-3 font-grotesk text-xs tracking-wider text-white transition-colors duration-300 placeholder:text-white/20 focus:border-silver/60 focus:outline-none"
                placeholder="44160"
              />
            </label>
          </div>

          <div class="grid grid-cols-1 gap-6 sm:grid-cols-[2fr_1fr]">
            <label class="block">
              <span class="mb-2 block font-grotesk text-[10px] uppercase tracking-[0.3em] text-white/40">Calle</span>
              <input
                v-model="form.calle"
                type="text"
                maxlength="160"
                class="w-full border border-white/20 bg-transparent px-3 py-3 font-grotesk text-xs tracking-wider text-white transition-colors duration-300 placeholder:text-white/20 focus:border-silver/60 focus:outline-none"
                placeholder="Av. Chapultepec"
              />
            </label>

            <label class="block">
              <span class="mb-2 block font-grotesk text-[10px] uppercase tracking-[0.3em] text-white/40">Número ext / int</span>
              <input
                v-model="form.numero_ext_int"
                type="text"
                maxlength="40"
                class="w-full border border-white/20 bg-transparent px-3 py-3 font-grotesk text-xs tracking-wider text-white transition-colors duration-300 placeholder:text-white/20 focus:border-silver/60 focus:outline-none"
                placeholder="120 int. 4"
              />
            </label>
          </div>

          <label class="block">
            <span class="mb-2 block font-grotesk text-[10px] uppercase tracking-[0.3em] text-white/40">
              Referencias de la vivienda / Descripción de fachada
            </span>
            <textarea
              v-model="form.referencias_vivienda"
              rows="4"
              maxlength="1000"
              class="w-full border border-white/20 bg-transparent p-3 font-grotesk text-xs leading-relaxed tracking-wider text-white transition-colors duration-300 placeholder:text-white/20 focus:border-silver/60 focus:outline-none"
              placeholder="Casa de dos pisos con portón negro, entre calles Morelos y Libertad. Timbre a la derecha..."
            ></textarea>
          </label>

          <!-- Pago: Stripe Elements. Los datos de tarjeta viven en el iframe
               de Stripe — jamás tocan nuestro estado ni nuestra base. -->
          <div>
            <span class="mb-2 block font-grotesk text-[10px] uppercase tracking-[0.3em] text-white/40">
              Card Details
            </span>
            <div class="border border-white/20 px-3 py-4 transition-colors duration-300 focus-within:border-silver/60">
              <p
                v-if="!cardReady"
                class="animate-pulse font-grotesk text-xs tracking-wider text-white/25"
              >
                Loading secure payment form...
              </p>
              <!-- Contenedor exclusivo de Stripe: Vue no gestiona sus hijos -->
              <div v-show="cardReady" ref="cardMount"></div>
            </div>
            <p
              v-if="cardError"
              class="mt-2 font-grotesk text-[10px] uppercase tracking-[0.2em] text-red-400"
            >
              {{ cardError }}
            </p>
            <p class="mt-2 font-grotesk text-[9px] uppercase tracking-[0.25em] text-white/25">
              Test mode &mdash; use 4242 4242 4242 4242, any future date, any CVC
            </p>
          </div>
        </form>
      </section>

      <!-- Resumen de la orden -->
      <aside class="lg:sticky lg:top-28 lg:self-start">
        <h2 class="border-b border-white/10 pb-3 font-grotesk text-[10px] uppercase tracking-[0.35em] text-white/60">
          Order Summary
        </h2>

        <ul class="divide-y divide-white/10">
          <li v-for="item in cart.items" :key="`${item.id}-${item.size}`" class="flex items-center gap-4 py-4">
            <img :src="item.image" :alt="item.name" class="h-16 w-12 flex-shrink-0 object-cover" />
            <div class="min-w-0 flex-1">
              <p class="truncate font-grotesk text-xs uppercase tracking-wider text-white">{{ item.name }}</p>
              <p class="mt-1 font-grotesk text-[10px] tracking-wider text-white/40">
                {{ item.size }} &middot; x{{ item.quantity }}
              </p>
            </div>
            <p class="font-grotesk text-xs tracking-wider text-white/70">
              {{ formatPrice(item.price * item.quantity) }}
            </p>
          </li>
        </ul>

        <div class="border-t border-white/10 pt-4">
          <div class="flex items-center justify-between font-grotesk text-[10px] uppercase tracking-[0.25em] text-white/40">
            <span>Shipping</span>
            <span>Free &mdash; MX</span>
          </div>
          <div class="mt-3 flex items-center justify-between font-grotesk text-xs uppercase tracking-[0.25em]">
            <span class="text-white/60">Total</span>
            <span class="text-silver">{{ formatPrice(cartTotal) }}</span>
          </div>
        </div>

        <p
          v-if="errorMessage"
          role="alert"
          class="mt-5 font-grotesk text-[10px] uppercase tracking-[0.25em] text-red-400"
        >
          {{ errorMessage }}
        </p>

        <button
          type="button"
          :disabled="processing || cart.items.length === 0"
          class="mt-6 w-full bg-white py-4 font-grotesk text-xs font-semibold uppercase tracking-[0.35em] text-black transition-all duration-300 ease-out hover:bg-silver active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
          @click="placeOrder"
        >
          {{ processing ? 'Processing...' : 'Place Order' }}
        </button>

        <p class="mt-4 text-center font-grotesk text-[9px] uppercase tracking-[0.3em] text-white/25">
          Payments secured by Stripe &mdash; card data never touches our servers
        </p>
      </aside>
    </main>

    <Footer />
  </div>
</template>

<style scoped>
.processing-mark {
  animation: mark-pulse 1.8s ease-in-out infinite;
}

.processing-rule {
  animation: rule-sweep 1.8s ease-in-out infinite;
}

@keyframes mark-pulse {
  0%,
  100% {
    opacity: 0.45;
    transform: scale(0.92);
  }
  50% {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes rule-sweep {
  0%,
  100% {
    transform: scaleX(0.4);
    opacity: 0.4;
  }
  50% {
    transform: scaleX(1);
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .processing-mark,
  .processing-rule {
    animation: none;
  }
}
</style>
