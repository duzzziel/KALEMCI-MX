<script setup>
import { ref, onMounted } from 'vue'
import Navbar from '../components/Navbar.vue'
import CartDrawer from '../components/CartDrawer.vue'
import Footer from '../components/Footer.vue'
import { supabase } from '../supabase'
import { productMatchesCategory } from '../lib/categories'

// Piezas de REEBLOM para la tira de preview (máx. 4)
const previewProducts = ref([])
const pieceCount = ref(null)

onMounted(async () => {
  if (!supabase) return
  try {
    const { data, error } = await supabase.from('products').select('id,name,images,tags')
    if (error) throw error
    const reeblom = (data ?? []).filter((p) => productMatchesCategory(p, 'new-arrival'))
    pieceCount.value = reeblom.length
    previewProducts.value = reeblom.slice(0, 4)
  } catch (error) {
    console.error('No se pudo cargar el preview de la colección:', error)
  }
})
</script>

<template>
  <div class="flex min-h-screen flex-col bg-black text-white">
    <Navbar />
    <CartDrawer />

    <main class="flex-1">
      <header class="px-6 pb-6 pt-14 text-center">
        <p class="font-grotesk text-[9px] uppercase tracking-[0.5em] text-silver/50">
          Kalemci Archives
        </p>
        <h1 class="mt-4 font-display text-[clamp(2.25rem,5vw,3.5rem)] font-medium uppercase tracking-[0.22em]">
          Collections
        </h1>
      </header>

      <!-- Collection I — REEBLOM (abierta) -->
      <section v-reveal class="border-y border-white/5 bg-depths/15 px-6 py-16">
        <div class="mx-auto flex max-w-4xl flex-col items-center text-center">
          <p class="font-grotesk text-[9px] uppercase tracking-[0.5em] text-silver/60">
            Collection I &mdash; MMXXVI
            <span v-if="pieceCount !== null" class="text-white/30">
              &middot; {{ pieceCount }} {{ pieceCount === 1 ? 'piece' : 'pieces' }}
            </span>
          </p>

          <h2 class="mt-5 font-display text-[clamp(2.75rem,6vw,4.25rem)] font-medium uppercase leading-none tracking-[0.26em]">
            Reeblom
          </h2>

          <p class="mt-6 max-w-xl font-grotesk text-[11px] leading-relaxed tracking-wide text-white/50">
            What withers in the light blooms again in the dark. A first offering
            of night-cut silhouettes &mdash; austere, precise, unrepeatable.
          </p>

          <!-- Tira de preview: las prendas como viñetas de archivo -->
          <div
            v-if="previewProducts.length"
            class="mt-10 grid w-full max-w-2xl grid-cols-4 gap-px bg-white/10"
          >
            <router-link
              v-for="product in previewProducts"
              :key="product.id"
              :to="`/product/${product.id}`"
              class="group relative aspect-[3/4] overflow-hidden bg-black"
            >
              <img
                :src="product.images?.[0]"
                :alt="product.name"
                class="h-full w-full object-cover opacity-60 contrast-125 transition-all duration-500 group-hover:scale-105 group-hover:opacity-90"
              />
            </router-link>
          </div>

          <router-link
            to="/collection/new-arrival"
            class="mt-10 border border-silver/40 px-10 py-3.5 font-grotesk text-[10px] uppercase tracking-[0.35em] text-silver transition-colors hover:bg-silver hover:text-black"
          >
            Enter the collection
          </router-link>
        </div>
      </section>

      <!-- Collection II — sellada -->
      <section v-reveal class="px-6 py-16">
        <div class="mx-auto flex max-w-4xl flex-col items-center text-center opacity-70">
          <p class="font-grotesk text-[9px] uppercase tracking-[0.5em] text-white/30">
            Collection II &mdash; Sealed
          </p>

          <h2
            class="mt-5 select-none font-display text-4xl font-medium uppercase tracking-[0.26em] text-white/20 blur-[2px] sm:text-5xl"
            aria-hidden="true"
          >
            &#9679;&#9679;&#9679;&#9679;&#9679;&#9679;
          </h2>

          <p class="mt-6 font-grotesk text-[10px] uppercase tracking-[0.3em] text-white/30">
            In the dark, something blooms.
          </p>
        </div>
      </section>
    </main>

    <Footer />
  </div>
</template>
