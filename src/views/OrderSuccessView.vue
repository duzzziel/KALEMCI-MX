<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import Navbar from '../components/Navbar.vue'
import Footer from '../components/Footer.vue'
import { getLastOrder } from '../lib/lastOrder'

const route = useRoute()

const orderId = computed(() => String(route.params.id || ''))
const order = computed(() => getLastOrder(orderId.value))
const shortId = computed(() => orderId.value.slice(0, 8).toUpperCase())

function formatPrice(value) {
  return `$${Number(value).toFixed(2)}`
}
</script>

<template>
  <div class="flex min-h-screen flex-col bg-black text-white">
    <Navbar />

    <main class="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-6 py-16 text-center">
      <span class="font-display text-3xl text-silver/70">&#10022;</span>
      <span
        class="mt-6 block h-px w-24"
        style="background: linear-gradient(90deg, transparent, rgba(201, 208, 214, 0.5), transparent)"
      ></span>

      <h1 class="mt-8 font-display text-xl font-semibold uppercase tracking-[0.25em]">
        Order Confirmed
      </h1>
      <p class="mt-3 font-grotesk text-[9px] uppercase tracking-[0.45em] text-white/40">
        Welcome to the archive
      </p>

      <p class="mt-8 border border-silver/30 px-6 py-3 font-grotesk text-[10px] uppercase tracking-[0.3em] text-silver">
        Order #{{ shortId }}
      </p>
      <p class="mt-2 font-mono text-[8px] tracking-[0.2em] text-white/25">{{ orderId }}</p>

      <template v-if="order">
        <ul class="mt-10 w-full divide-y divide-white/10 border-y border-white/10 text-left">
          <li
            v-for="item in order.items"
            :key="`${item.product_id}-${item.size}`"
            class="flex items-baseline justify-between gap-3 py-3"
          >
            <p class="min-w-0 truncate font-grotesk text-[10px] uppercase tracking-wider text-white/80">
              {{ item.name }}
              <span class="text-white/40">&middot; {{ item.size }} &middot; x{{ item.qty }}</span>
            </p>
            <p class="whitespace-nowrap font-grotesk text-[10px] tracking-wider text-white/60">
              {{ formatPrice(item.unit_price * item.qty) }}
            </p>
          </li>
        </ul>

        <div class="mt-4 flex w-full items-center justify-between font-grotesk text-xs uppercase tracking-[0.25em]">
          <span class="text-white/50">Total</span>
          <span class="text-silver">{{ formatPrice(order.total) }}</span>
        </div>

        <p class="mt-6 font-grotesk text-[9px] uppercase tracking-[0.25em] leading-relaxed text-white/35">
          A confirmation was sent to {{ order.customer_email }}.<br />
          Shipping to {{ order.estado }}, México.
        </p>
      </template>

      <router-link
        to="/"
        class="mt-12 w-full border border-white/25 py-3.5 font-grotesk text-[10px] uppercase tracking-[0.35em] text-white/80 transition-colors hover:border-white/80 hover:text-white"
      >
        Return to Home
      </router-link>
    </main>

    <Footer />
  </div>
</template>
