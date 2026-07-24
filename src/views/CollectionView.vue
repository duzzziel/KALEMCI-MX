<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import Navbar from '../components/Navbar.vue'
import CartDrawer from '../components/CartDrawer.vue'
import Footer from '../components/Footer.vue'
import ProductCard from '../components/ProductCard.vue'
import { supabase } from '../supabase'
import { productMatchesCategory, SUBTAGS, tagLabel } from '../lib/categories'

const route = useRoute()

const CATEGORY_LABELS = {
  all: 'All Products',
  'new-arrival': 'New Arrival',
  men: 'Men',
  women: 'Women',
  accessories: 'Tailoring & Accessories',
}
// Los subtags también son colecciones navegables directas (/collection/denim)
for (const sub of SUBTAGS) {
  CATEGORY_LABELS[sub] = tagLabel(sub).replace(/\b\w/g, (c) => c.toUpperCase())
}

const products = ref([])
const loading = ref(true)

const category = computed(() => String(route.params.category || ''))
const isKnownCategory = computed(() => category.value in CATEGORY_LABELS)

// Subtag activo vía query (?sub=denim): intersección género + tipo de prenda,
// como en los menús desplegables de MEN/WOMEN.
const activeSub = computed(() => {
  const sub = String(route.query.sub || '')
  return SUBTAGS.includes(sub) ? sub : null
})

const title = computed(() => {
  const base = CATEGORY_LABELS[category.value] ?? 'Unknown Collection'
  if (!activeSub.value) return base
  return `${base} — ${CATEGORY_LABELS[activeSub.value]}`
})

// El componente se reutiliza entre /collection/men y /collection/women:
// los datos ya están cargados y este computed re-filtra solo.
const filteredProducts = computed(() => {
  if (!isKnownCategory.value) return []
  return products.value.filter((product) => {
    if (!productMatchesCategory(product, category.value)) return false
    if (activeSub.value) return (product.tags ?? []).includes(activeSub.value)
    return true
  })
})

function mapSupabaseProduct(product) {
  return {
    id: product.id,
    name: product.name,
    price: product.price,
    tags: product.tags ?? null,
    image: product.images?.[0] ?? '',
    hoverImage: product.images?.[1] ?? product.images?.[0] ?? '',
  }
}

onMounted(async () => {
  if (!supabase) {
    loading.value = false
    return
  }

  try {
    const { data, error } = await supabase.from('products').select('*')
    if (error) throw error
    products.value = (data ?? []).map(mapSupabaseProduct)
  } catch (error) {
    console.error('No se pudieron obtener productos de Supabase:', error)
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="flex min-h-screen flex-col bg-black text-white">
    <Navbar />
    <CartDrawer />

    <main class="mx-auto w-full max-w-[1680px] flex-1 px-6 py-12 2xl:px-10">
      <router-link
        to="/"
        class="font-grotesk text-[9px] uppercase tracking-[0.35em] text-white/35 transition-colors hover:text-white"
      >
        &larr; Home
      </router-link>

      <div class="mb-10 mt-4 flex items-baseline justify-between gap-4">
        <div class="flex items-baseline gap-4">
          <h1 class="font-display text-[clamp(1.75rem,3vw,2.5rem)] font-semibold uppercase tracking-widest">
            {{ title }}
          </h1>
          <router-link
            v-if="activeSub"
            :to="{ path: route.path }"
            class="whitespace-nowrap font-grotesk text-[10px] uppercase tracking-[0.25em] text-white/40 transition-colors hover:text-silver"
          >
            Clear &times;
          </router-link>
        </div>
        <p
          v-if="!loading && isKnownCategory"
          class="whitespace-nowrap font-grotesk text-[10px] uppercase tracking-[0.3em] text-white/40"
        >
          {{ filteredProducts.length }} {{ filteredProducts.length === 1 ? 'piece' : 'pieces' }}
        </p>
      </div>

      <p
        v-if="loading"
        class="py-16 text-center font-grotesk text-xs uppercase tracking-[0.3em] text-white/40"
      >
        Loading products...
      </p>

      <div v-else-if="filteredProducts.length === 0" class="py-16 text-center">
        <p class="font-grotesk text-xs uppercase tracking-[0.3em] text-white/40">
          Nothing here yet.
        </p>
        <router-link
          to="/collection/all"
          class="mt-5 inline-block border border-white/25 px-6 py-2.5 font-grotesk text-[10px] uppercase tracking-[0.3em] text-white/70 transition-colors hover:border-white/70 hover:text-white"
        >
          View all products
        </router-link>
      </div>

      <section v-else class="grid grid-cols-2 gap-x-6 gap-y-12 lg:grid-cols-4">
        <ProductCard v-for="product in filteredProducts" :key="product.id" :product="product" />
      </section>
    </main>

    <Footer />
  </div>
</template>
