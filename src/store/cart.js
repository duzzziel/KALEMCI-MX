import { reactive, computed, watch } from 'vue'

const STORAGE_KEY = 'kalemci-cart'

function loadItems() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export const cart = reactive({
  isOpen: false,
  items: loadItems(),
})

watch(
  () => cart.items,
  (items) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  },
  { deep: true },
)

export const cartCount = computed(() =>
  cart.items.reduce((total, item) => total + item.quantity, 0),
)

export const cartTotal = computed(() =>
  cart.items.reduce((total, item) => total + item.price * item.quantity, 0),
)

export function openCart() {
  cart.isOpen = true
}

export function closeCart() {
  cart.isOpen = false
}

export function toggleCart() {
  cart.isOpen = !cart.isOpen
}

// Tope de unidades para una línea del carrito. `maxStock` viaja con el ítem
// desde la vista de detalle (stock real de esa talla al momento de añadir);
// null/ausente significa "sin dato de stock" y no se limita — los carritos
// guardados antes del control de inventario siguen funcionando.
function stockCap(item) {
  return Number.isFinite(item?.maxStock) ? Math.max(0, Math.floor(item.maxStock)) : Infinity
}

export function addToCart(product, quantity = 1) {
  const existing = cart.items.find(
    (item) => item.id === product.id && item.size === product.size,
  )

  if (existing) {
    // Refresca el tope con el dato más reciente del detalle antes de sumar.
    if (Number.isFinite(product.maxStock)) existing.maxStock = product.maxStock
    existing.quantity = Math.min(existing.quantity + quantity, stockCap(existing))
    return
  }

  const cap = stockCap(product)
  if (cap === 0) return

  cart.items.push({ ...product, quantity: Math.min(quantity, cap) })
}

export function clearCart() {
  cart.items.splice(0, cart.items.length)
}

export function removeFromCart(productId, size = undefined) {
  const index = cart.items.findIndex((item) => item.id === productId && item.size === size)
  if (index !== -1) cart.items.splice(index, 1)
}

export function updateQuantity(productId, quantity, size = undefined) {
  const item = cart.items.find((item) => item.id === productId && item.size === size)
  if (!item) return

  if (quantity <= 0) {
    removeFromCart(productId, size)
    return
  }

  item.quantity = Math.min(quantity, stockCap(item))
}
