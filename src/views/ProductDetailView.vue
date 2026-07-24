<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import Navbar from '../components/Navbar.vue'
import CartDrawer from '../components/CartDrawer.vue'
import Footer from '../components/Footer.vue'
import { supabase } from '../supabase'
import { addToCart, openCart } from '../store/cart'

const route = useRoute()

const product = ref(null)
const loading = ref(true)
const notFound = ref(false)

const activeImageIndex = ref(0)
const selectedSize = ref(null)
const sizeWarning = ref(false)

const mainImage = computed(() => product.value?.images?.[activeImageIndex.value] ?? '')

// --- Stock por talla ---
// Si la columna stock_by_size aún no existe en la base (migración 004 sin
// ejecutar), no se limita nada: la tienda no se "agota" por un dato ausente.
const hasStockData = computed(
  () =>
    product.value?.stock_by_size != null && typeof product.value.stock_by_size === 'object',
)

function stockFor(size) {
  if (!hasStockData.value) return null
  const qty = Number(product.value.stock_by_size[size])
  return Number.isFinite(qty) && qty > 0 ? Math.floor(qty) : 0
}

function isAvailable(size) {
  const stock = stockFor(size)
  return stock === null || stock > 0
}

const isSoldOut = computed(() => {
  if (!hasStockData.value) return false
  const sizes = product.value?.sizes ?? []
  return sizes.length > 0 && sizes.every((size) => stockFor(size) === 0)
})

function formatPrice(value) {
  return `$${Number(value).toFixed(2)}`
}

function selectImage(index) {
  activeImageIndex.value = index
}

function selectSize(size) {
  if (!isAvailable(size)) return
  selectedSize.value = size
  sizeWarning.value = false
}

function handleAddToCart() {
  if (isSoldOut.value) return

  if (product.value.sizes?.length && !selectedSize.value) {
    sizeWarning.value = true
    return
  }

  addToCart({
    id: product.value.id,
    name: product.value.name,
    price: product.value.price,
    image: mainImage.value,
    size: selectedSize.value,
    maxStock: selectedSize.value ? stockFor(selectedSize.value) : null,
  })

  openCart()
}

async function fetchProduct() {
  loading.value = true
  notFound.value = false
  product.value = null
  activeImageIndex.value = 0
  selectedSize.value = null
  sizeWarning.value = false

  if (!supabase) {
    notFound.value = true
    loading.value = false
    return
  }

  try {
    const { data, error } = await supabase
      .from('products')
      .select()
      .eq('id', route.params.id)
      .single()

    if (error) throw error

    product.value = data
  } catch (error) {
    console.error('No se pudo obtener el producto de Supabase:', error)
    notFound.value = true
  } finally {
    loading.value = false
  }
}

onMounted(fetchProduct)

// vue-router reutiliza esta instancia cuando solo cambia :id — sin este
// watcher, navegar de un producto a otro dejaría el producto anterior.
watch(
  () => route.params.id,
  (id, prev) => {
    if (id && id !== prev) fetchProduct()
  },
)
</script>

<template>
  <div class="min-h-screen bg-black text-white">
    <Navbar />
    <CartDrawer />

    <p
      v-if="loading"
      class="px-6 py-24 text-center font-grotesk text-xs uppercase tracking-[0.3em] text-white/40"
    >
      Loading product...
    </p>

    <div v-else-if="notFound || !product" class="px-6 py-24 text-center">
      <p class="font-grotesk text-xs uppercase tracking-[0.3em] text-white/40">Product not found</p>
      <router-link
        to="/"
        class="mt-6 inline-block border border-white/20 px-6 py-3 font-grotesk text-xs uppercase tracking-[0.2em] text-white/70 transition-colors hover:border-white hover:text-white"
      >
        Back to catalog
      </router-link>
    </div>

    <main v-else class="grid grid-cols-1 gap-x-10 gap-y-6 px-6 py-10 lg:grid-cols-[13fr_7fr] lg:py-12">
      <div>
        <div class="relative aspect-[3/4] w-full overflow-hidden bg-white/5 lg:aspect-auto lg:h-[85vh]">
          <img
            :src="mainImage"
            :alt="product.name"
            class="absolute inset-0 h-full w-full object-cover"
          />
        </div>

        <div v-if="product.images?.length > 1" class="mt-3 flex gap-3">
          <button
            v-for="(image, index) in product.images"
            :key="image + index"
            type="button"
            class="h-20 w-16 flex-shrink-0 overflow-hidden border transition-colors duration-300"
            :class="index === activeImageIndex ? 'border-white' : 'border-white/10 hover:border-white/40'"
            @click="selectImage(index)"
          >
            <img :src="image" :alt="`${product.name} ${index + 1}`" class="h-full w-full object-cover" />
          </button>
        </div>
      </div>

      <div class="flex flex-col gap-5 lg:sticky lg:top-28 lg:self-start">
        <router-link
          to="/"
          class="w-fit font-grotesk text-[9px] uppercase tracking-[0.35em] text-white/35 transition-colors hover:text-white"
        >
          &larr; Archive
        </router-link>

        <div>
          <h1 class="font-display text-xl font-semibold uppercase tracking-[0.2em] text-white">
            {{ product.name }}
          </h1>
          <p class="mt-2 font-grotesk text-xs tracking-wider text-silver/70">{{ formatPrice(product.price) }}</p>

          <div v-if="product.tags?.length" class="mt-3 flex flex-wrap gap-2">
            <router-link
              v-for="tag in product.tags"
              :key="tag"
              :to="`/collection/${tag}`"
              class="border border-white/15 px-2.5 py-1 font-grotesk text-[9px] uppercase tracking-[0.25em] text-white/45 transition-colors hover:border-silver/50 hover:text-silver"
            >
              {{ tag.replace('-', ' ') }}
            </router-link>
          </div>
        </div>

        <p v-if="product.description" class="font-grotesk text-[11px] leading-relaxed tracking-wide text-white/60">
          {{ product.description }}
        </p>

        <div v-if="product.sizes?.length">
          <p class="font-grotesk text-[10px] uppercase tracking-[0.3em] text-white/40">Select Size</p>
          <div class="mt-3 flex flex-wrap gap-2">
            <button
              v-for="size in product.sizes"
              :key="size"
              type="button"
              :disabled="!isAvailable(size)"
              class="relative flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden border font-grotesk text-[11px] uppercase tracking-wider transition-all duration-300 ease-out active:scale-95 disabled:active:scale-100"
              :class="
                !isAvailable(size)
                  ? 'cursor-not-allowed border-white/10 text-white/20'
                  : selectedSize === size
                    ? 'border-silver text-silver'
                    : 'border-white/20 text-white/70 hover:border-silver/60'
              "
              @click="selectSize(size)"
            >
              {{ size }}
              <span
                v-if="!isAvailable(size)"
                class="absolute left-1/2 top-1/2 h-px w-[130%] -translate-x-1/2 -translate-y-1/2 rotate-45 bg-white/25"
              ></span>
            </button>
          </div>
          <p v-if="sizeWarning" class="mt-2 font-grotesk text-[10px] uppercase tracking-wider text-red-400">
            Please select a size
          </p>
          <!-- Señal de escasez: solo cuando quedan muy pocas piezas de la talla elegida -->
          <p
            v-else-if="selectedSize && stockFor(selectedSize) !== null && stockFor(selectedSize) <= 3"
            class="mt-2 font-grotesk text-[10px] uppercase tracking-[0.25em] text-silver/70"
          >
            Only {{ stockFor(selectedSize) }} left
          </p>
        </div>

        <button
          type="button"
          :disabled="isSoldOut"
          class="w-full py-4 font-grotesk text-xs font-semibold uppercase tracking-[0.35em] transition-all duration-300 ease-out active:scale-[0.99] disabled:active:scale-100"
          :class="
            isSoldOut
              ? 'cursor-not-allowed border border-white/15 bg-transparent text-white/30'
              : 'bg-white text-black hover:bg-silver'
          "
          @click="handleAddToCart"
        >
          {{ isSoldOut ? 'Out of Stock' : 'Add to Cart' }}
        </button>
      </div>
    </main>

    <Footer />
  </div>
</template>
