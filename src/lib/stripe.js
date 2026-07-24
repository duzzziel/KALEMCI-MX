import { loadStripe } from '@stripe/stripe-js'

// Singleton perezoso: Stripe.js se descarga una sola vez y solo cuando una
// vista lo necesita (el checkout), no en cada carga de la tienda.
let stripePromise = null

export function getStripe() {
  if (!stripePromise) {
    const key = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY
    if (!key) {
      console.warn('Falta VITE_STRIPE_PUBLISHABLE_KEY en .env — Stripe no se inicializó.')
      return Promise.resolve(null)
    }
    stripePromise = loadStripe(key)
  }
  return stripePromise
}

// Estilo del CardElement alineado al sistema KALEMCI: mono, blanco sobre
// negro. (Los bordes cuadrados los pone el contenedor — Stripe no dibuja caja.)
export const CARD_ELEMENT_STYLE = {
  base: {
    color: '#ffffff',
    fontFamily: "\"Alte Haas Grotesk\", \"Helvetica Neue\", sans-serif",
    fontSize: '12px',
    letterSpacing: '0.08em',
    iconColor: 'rgba(201, 208, 214, 0.7)', // silver Ice Palace
    '::placeholder': {
      color: 'rgba(255, 255, 255, 0.25)',
    },
  },
  invalid: {
    color: '#f87171',
    iconColor: '#f87171',
  },
}
