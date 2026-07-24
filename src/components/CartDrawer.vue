<script setup>
import { watch, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { cart, cartTotal, closeCart, removeFromCart, updateQuantity } from '../store/cart'

const router = useRouter()

function formatPrice(value) {
  return `$${value.toFixed(2)}`
}

function goToCheckout() {
  closeCart()
  router.push('/checkout')
}

watch(
  () => cart.isOpen,
  (open) => {
    document.body.style.overflow = open ? 'hidden' : ''
  },
)

function onKeydown(event) {
  if (event.key === 'Escape' && cart.isOpen) closeCart()
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  if (cart.isOpen) document.body.style.overflow = ''
})
</script>

<template>
  <Transition
    enter-active-class="transition-opacity duration-300"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition-opacity duration-300"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div
      v-if="cart.isOpen"
      class="fixed inset-0 z-50 bg-black/70 backdrop-blur-[2px]"
      @click="closeCart"
    ></div>
  </Transition>

  <Transition
    enter-active-class="transition-transform duration-300 ease-out"
    enter-from-class="translate-x-full"
    enter-to-class="translate-x-0"
    leave-active-class="transition-transform duration-300 ease-in"
    leave-from-class="translate-x-0"
    leave-to-class="translate-x-full"
  >
    <aside
      v-if="cart.isOpen"
      class="fixed right-0 top-0 z-50 flex h-full w-full flex-col border-l border-white/10 bg-black text-white sm:w-[26rem]"
    >
      <div class="flex items-center justify-between border-b border-white/10 px-6 py-5">
        <h2 class="font-display text-xl font-semibold uppercase tracking-widest">Your Bag</h2>
        <button
          type="button"
          class="font-grotesk text-xs uppercase tracking-[0.2em] text-white/60 transition-colors hover:text-white"
          @click="closeCart"
        >
          Close
        </button>
      </div>

      <div class="flex-1 overflow-y-auto px-6 py-6">
        <div v-if="cart.items.length === 0" class="flex flex-col items-start gap-5">
          <p class="font-grotesk text-xs uppercase tracking-[0.2em] text-white/40">
            Your bag is empty.
          </p>
          <router-link
            to="/collection/all"
            class="border border-white/20 px-5 py-2.5 font-grotesk text-[10px] uppercase tracking-[0.3em] text-white/70 transition-colors hover:border-silver/60 hover:text-silver"
            @click="closeCart"
          >
            Explore the archive
          </router-link>
        </div>

        <ul v-else class="flex flex-col gap-6">
          <li
            v-for="item in cart.items"
            :key="item.id"
            class="flex gap-4 border-b border-white/10 pb-6"
          >
            <img :src="item.image" :alt="item.name" class="h-24 w-20 flex-shrink-0 object-cover" />

            <div class="flex flex-1 flex-col justify-between">
              <div class="flex items-start justify-between gap-2">
                <router-link
                  :to="`/product/${item.id}`"
                  class="font-grotesk text-xs uppercase tracking-wider text-white transition-colors hover:text-silver"
                  @click="closeCart"
                >
                  {{ item.name }}
                </router-link>
                <button
                  type="button"
                  :aria-label="`Remove ${item.name} from bag`"
                  class="-m-2 p-2 font-grotesk text-xs text-white/40 transition-colors duration-300 hover:text-silver"
                  @click="removeFromCart(item.id, item.size)"
                >
                  &times;
                </button>
              </div>

              <p v-if="item.size" class="font-grotesk text-[10px] uppercase tracking-wider text-white/40">
                Size: {{ item.size }}
              </p>

              <p class="font-grotesk text-xs text-white/60">{{ formatPrice(item.price) }}</p>

              <div class="mt-2 flex items-center border border-white/20 font-grotesk text-xs">
                <button
                  type="button"
                  aria-label="Decrease quantity"
                  class="min-h-[36px] px-4 text-white/70 transition-colors duration-300 hover:bg-white/5 hover:text-white"
                  @click="updateQuantity(item.id, item.quantity - 1, item.size)"
                >
                  -
                </button>
                <span class="flex-1 border-x border-white/20 px-3 py-1.5 text-center tabular-nums">{{ item.quantity }}</span>
                <button
                  type="button"
                  aria-label="Increase quantity"
                  :disabled="item.maxStock != null && item.quantity >= item.maxStock"
                  class="min-h-[36px] px-4 text-white/70 transition-colors duration-300 hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:text-white/20 disabled:hover:bg-transparent disabled:hover:text-white/20"
                  @click="updateQuantity(item.id, item.quantity + 1, item.size)"
                >
                  +
                </button>
              </div>
            </div>
          </li>
        </ul>
      </div>

      <div class="border-t border-white/10 px-6 py-6">
        <div class="mb-2 flex items-center justify-between font-grotesk text-xs uppercase tracking-[0.2em]">
          <span class="text-white/60">Subtotal</span>
          <span class="tabular-nums text-silver">{{ formatPrice(cartTotal) }}</span>
        </div>
        <p class="mb-4 font-grotesk text-[9px] uppercase tracking-[0.25em] text-white/30">
          Free shipping &mdash; M&eacute;xico
        </p>

        <button
          type="button"
          class="w-full bg-white py-4 font-grotesk text-sm font-medium uppercase tracking-[0.2em] text-black transition-all duration-300 ease-out hover:bg-silver active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
          :disabled="cart.items.length === 0"
          @click="goToCheckout"
        >
          Proceed to Checkout
        </button>
      </div>
    </aside>
  </Transition>
</template>
