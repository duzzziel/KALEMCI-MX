<script setup>
import { ref } from 'vue'

const serviceLinks = ['Shipping & Returns', 'Privacy Policy', 'Contact']

const email = ref('')
const subscribed = ref(false)

function subscribe() {
  if (!email.value.trim()) return
  subscribed.value = true
}
</script>

<template>
  <footer class="border-t border-silver/25 bg-black">
    <div class="grid grid-cols-1 gap-10 px-6 py-14 font-grotesk text-[11px] uppercase tracking-[0.15em] text-white/60 md:grid-cols-3 md:gap-8">
      <div>
        <p class="mb-4 text-white/60">Newsletter</p>
        <form v-if="!subscribed" class="flex" @submit.prevent="subscribe">
          <input
            v-model="email"
            type="email"
            required
            placeholder="Enter your email..."
            class="w-full border border-white/20 bg-transparent px-3 py-3 text-white transition-colors duration-300 placeholder:text-white/30 focus:border-silver/60 focus:outline-none"
          />
          <button
            type="submit"
            class="flex-shrink-0 border border-l-0 border-white/20 px-4 py-3 text-white transition-all duration-300 ease-out hover:bg-silver hover:text-black active:scale-95"
          >
            &rarr;
          </button>
        </form>
        <p v-else class="border border-white/15 px-3 py-3 text-white/70">
          Subscribed &mdash; welcome to the archive.
        </p>
      </div>

      <div class="flex flex-col gap-3">
        <a
          v-for="link in serviceLinks"
          :key="link"
          href="#"
          class="w-fit transition-colors hover:text-silver"
        >
          {{ link }}
        </a>
      </div>

      <div class="flex flex-col justify-between gap-3 md:items-end md:text-right">
        <p class="text-white/60">&copy; 2026 Kalemci Archives</p>
        <p class="text-white/60">All Rights Reserved</p>
      </div>
    </div>
  </footer>
</template>
