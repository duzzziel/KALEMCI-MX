<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import Navbar from '../components/Navbar.vue'
import CartDrawer from '../components/CartDrawer.vue'
import Footer from '../components/Footer.vue'
import LuxeBackdrop from '../components/LuxeBackdrop.vue'
import HeroEmbroidery from '../components/HeroEmbroidery.vue'
import ProductCard from '../components/ProductCard.vue'
import { supabase } from '../supabase'
import { productMatchesCategory } from '../lib/categories'

const route = useRoute()

const mockProducts = [
  {
    id: 'opium-cargo-pants',
    name: 'Opium Cargo Pants',
    price: 128,
    image: 'https://picsum.photos/seed/noir-alley-1/600/800?grayscale',
    hoverImage: 'https://picsum.photos/seed/noir-alley-1-alt/600/800?grayscale',
  },
  {
    id: 'cyber-gothic-hoodie',
    name: 'Cyber Gothic Hoodie',
    price: 156,
    image: 'https://picsum.photos/seed/gothic-arch-2/600/800?grayscale',
    hoverImage: 'https://picsum.photos/seed/gothic-arch-2-alt/600/800?grayscale',
  },
  {
    id: 'nocturne-bomber',
    name: 'Nocturne Bomber',
    price: 214,
    image: 'https://picsum.photos/seed/dark-facade-3/600/800?grayscale',
    hoverImage: 'https://picsum.photos/seed/dark-facade-3-alt/600/800?grayscale',
  },
  {
    id: 'wraith-graphic-tee',
    name: 'Wraith Graphic Tee',
    price: 68,
    image: 'https://picsum.photos/seed/shadow-district-4/600/800?grayscale',
    hoverImage: 'https://picsum.photos/seed/shadow-district-4-alt/600/800?grayscale',
  },
]

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

const products = ref([])
const loading = ref(true)

const activeCategory = computed(() => route.query.category || null)
const activeSearch = computed(() => (route.query.search || '').toString().trim())
const hasFilter = computed(() => Boolean(activeCategory.value || activeSearch.value))

const filteredProducts = computed(() => {
  let result = products.value
  if (activeCategory.value) {
    result = result.filter((product) => productMatchesCategory(product, activeCategory.value))
  }
  if (activeSearch.value) {
    const q = activeSearch.value.toLowerCase()
    result = result.filter((product) => product.name.toLowerCase().includes(q))
  }
  return result
})

// El carrusel "The First Drop" muestra lo etiquetado como new-arrival;
// si nada lo está (catálogo sin tags aún), muestra todo.
const firstDropProducts = computed(() => {
  const tagged = products.value.filter((product) => productMatchesCategory(product, 'new-arrival'))
  return tagged.length > 0 ? tagged : products.value
})

const catalogTitle = computed(() => {
  if (activeSearch.value) return `Results — “${activeSearch.value}”`
  if (activeCategory.value) return activeCategory.value.replace('-', ' ')
  return 'All Products'
})

function scrollToCatalog() {
  document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' })
}

watch([activeCategory, activeSearch], async () => {
  if (!hasFilter.value) return
  await nextTick()
  scrollToCatalog()
})

onMounted(async () => {
  if (!supabase) {
    products.value = mockProducts
    loading.value = false
    return
  }

  try {
    const { data, error } = await supabase.from('products').select('*')
    if (error) throw error

    products.value = data && data.length > 0 ? data.map(mapSupabaseProduct) : mockProducts
  } catch (error) {
    console.error('No se pudieron obtener productos de Supabase, usando datos de ejemplo:', error)
    products.value = mockProducts
  } finally {
    loading.value = false
    // Si se llega con un filtro activo (link directo o navegación desde otra
    // vista), mostrar el resultado en lugar de dejar al usuario en el hero.
    if (hasFilter.value) {
      await nextTick()
      scrollToCatalog()
    }
  }
})

// --- THE MONOLITH MASK: coreografía cinemática de apertura ---
//
// Timeline (visita fresca):
//   0ms     overlay negro con "KALEMCI" como ventana SVG al backdrop vivo;
//           el wordmark respira (scale 0.94→1, tracking se abre) ~1s.
//   1000ms  disolución: las letras-ventana se expanden (scale→14) y la
//           cámara "enfoca" el fondo (scale 1.08→1, velo se levanta).
//   1250ms  split-text: las letras reales emergen desde abajo con stagger
//           y convergencia lateral transform-only; tagline abre su tracking.
//   2100ms  overlay desmontado, scroll liberado.
//
// Reglas duras: solo transform/opacity en el título (CLS 0); letter-spacing
// animado únicamente en el tagline (subpixel). Una vez por sesión; con
// prefers-reduced-motion no hay intro y todo pinta en estado final.
const MONOLITH_SEEN_KEY = 'kalemci-monolith-seen'
const prefersReducedMotion =
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

const heroLetters = 'KALEMCI'.split('')
const maskVisible = ref(false)
const dissolving = ref(false)
const settled = ref(false)
const revealed = ref(false)

// Convergencia inicial de cada letra hacia el centro (se separa al revelar)
// + stagger milimétrico por índice. Todo transform — cero reflow.
function letterStyle(index) {
  const mid = (heroLetters.length - 1) / 2
  return {
    '--cx': `${((mid - index) * 0.35).toFixed(3)}em`,
    animationDelay: `${90 + index * 45}ms`,
  }
}

const taglineFragments = ['Curated scarcity', '· Anonymous craft', '· Disruption as form']

let introTimers = []

onMounted(() => {
  const seen = sessionStorage.getItem(MONOLITH_SEEN_KEY) === '1'

  if (prefersReducedMotion) {
    // Sin teatro: estado final inmediato, sin transiciones que correr.
    settled.value = true
    revealed.value = true
    return
  }

  if (seen) {
    // Visitas repetidas en la sesión: sin preloader, solo el stagger corto.
    settled.value = true
    requestAnimationFrame(() => {
      revealed.value = true
    })
    return
  }

  maskVisible.value = true
  document.body.style.overflow = 'hidden'

  introTimers = [
    setTimeout(() => {
      dissolving.value = true
      settled.value = true
    }, 1000),
    setTimeout(() => {
      revealed.value = true
    }, 1250),
    setTimeout(() => {
      maskVisible.value = false
      document.body.style.overflow = ''
      try {
        sessionStorage.setItem(MONOLITH_SEEN_KEY, '1')
      } catch {
        /* modo incógnito estricto: la intro simplemente se repetirá */
      }
    }, 2100),
  ]
})

onBeforeUnmount(() => {
  for (const t of introTimers) clearTimeout(t)
  if (maskVisible.value) document.body.style.overflow = ''
})
</script>

<template>
  <div class="min-h-screen bg-black text-white">
    <Navbar />
    <CartDrawer />

    <!-- THE MONOLITH MASK: overlay negro donde el wordmark es una ventana
         SVG real al backdrop vivo (el SVG inline comparte las fuentes del
         documento). Al disolverse, las letras-ventana devoran la placa. -->
    <Transition
      leave-active-class="transition-opacity duration-300 ease-out"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="maskVisible" class="fixed inset-0 z-[70]" aria-hidden="true">
        <svg class="h-full w-full" :class="{ 'monolith-dissolving': dissolving }">
          <defs>
            <mask id="monolith-mask">
              <rect width="100%" height="100%" fill="#ffffff" />
              <text
                x="50%"
                y="50%"
                text-anchor="middle"
                dominant-baseline="central"
                fill="#000000"
                class="monolith-text"
              >
                KALEMCI
              </text>
            </mask>
          </defs>
          <rect width="100%" height="100%" fill="#000000" mask="url(#monolith-mask)" class="monolith-plate" />
        </svg>
      </div>
    </Transition>

    <section class="relative h-screen w-full overflow-hidden bg-black">
      <!-- Cámara analógica: el backdrop entra a scale(1.08) bajo un velo
           oscuro y "enfoca" al ritmo en que muere la máscara. -->
      <div class="cine-focus absolute inset-0" :class="{ 'cine-settled': settled }">
        <LuxeBackdrop />
        <div class="cine-veil pointer-events-none absolute inset-0 bg-black"></div>
      </div>

      <!-- Bordado en vivo: vides/hojas trazadas en las esquinas opuestas,
           coordinadas con el mismo estado `revealed` del split-text. -->
      <HeroEmbroidery :revealed="revealed" />

      <div
        class="hero-content absolute inset-0 flex flex-col items-center justify-center gap-8 px-6"
        :class="{ revealed }"
      >
        <h1
          class="select-none whitespace-nowrap text-center font-grotesk text-[clamp(3.25rem,10.5vw,10rem)] font-normal uppercase leading-none tracking-[0.04em] text-white"
        >
          <span class="sr-only">KALEMCI&reg;</span>
          <!-- Split-text: cada letra emerge de un pozo overflow-hidden,
               convergida hacia el centro (--cx) y se abre a su sitio.
               Solo transform + opacity: cero layout shift. El ® vive fuera
               del pozo (para no ser recortado), con su propio margen de
               respiro — superíndice real, sin pisar la última letra. -->
          <span aria-hidden="true" class="inline-flex align-bottom">
            <span class="inline-flex overflow-hidden pb-[0.08em]">
              <span
                v-for="(letter, index) in heroLetters"
                :key="index"
                class="hero-letter inline-block"
                :style="letterStyle(index)"
              >
                {{ letter }}
              </span>
            </span>
            <span aria-hidden="true" class="hero-reg ml-1 align-top text-[0.3em] font-normal text-white/60"
              >&reg;</span
            >
          </span>
        </h1>

        <!-- Tagline: fragmentos con stagger + apertura real de tracking -->
        <p
          class="hero-tagline flex flex-wrap justify-center gap-x-3 gap-y-1 font-grotesk text-[9px] uppercase text-silver/50"
        >
          <span
            v-for="(fragment, index) in taglineFragments"
            :key="index"
            class="inline-flex overflow-hidden"
          >
            <span class="hero-fragment inline-block" :style="{ animationDelay: `${380 + index * 90}ms` }">
              {{ fragment }}
            </span>
          </span>
        </p>

        <div class="flex w-full max-w-md flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <router-link
            to="/collection/men"
            class="hero-cta w-48 border border-white/25 py-2.5 text-center font-grotesk text-[10px] uppercase tracking-[0.35em] text-white/80 transition-all duration-300 ease-out hover:border-silver/80 hover:text-silver active:scale-[0.98]"
            :style="{ '--d': '640ms' }"
          >
            For Men
          </router-link>
          <router-link
            to="/collection/women"
            class="hero-cta w-48 border border-white/25 py-2.5 text-center font-grotesk text-[10px] uppercase tracking-[0.35em] text-white/80 transition-all duration-300 ease-out hover:border-silver/80 hover:text-silver active:scale-[0.98]"
            :style="{ '--d': '730ms' }"
          >
            For Women
          </router-link>
        </div>

        <!-- Hairline en flujo: crece desde el centro al final del reveal -->
        <span
          class="hero-hairline mt-2 block h-px w-2/3 max-w-xl"
          style="background: linear-gradient(90deg, transparent, rgba(201, 208, 214, 0.35) 50%, transparent)"
        ></span>
      </div>

      <div
        class="hero-scrollhint absolute inset-x-0 bottom-7 flex flex-col items-center gap-2"
        :class="{ revealed }"
      >
        <span class="font-grotesk text-[8px] uppercase tracking-[0.5em] text-silver/40">Scroll</span>
        <span class="scroll-line block h-9 w-px bg-silver/30"></span>
      </div>
    </section>

    <!-- REEBLOM — Collection I: banda editorial de la primera colección -->
    <section v-reveal class="relative border-y border-white/5 bg-depths/15 px-6 py-20">
      <div class="mx-auto flex max-w-4xl flex-col items-center text-center">
        <p class="font-grotesk text-[9px] uppercase tracking-[0.5em] text-silver/60">
          Collection I &mdash; MMXXVI
        </p>

        <span
          class="mt-6 block h-px w-24"
          style="background: linear-gradient(90deg, transparent, rgba(201, 208, 214, 0.5), transparent)"
        ></span>

        <h2 class="mt-6 font-display text-[clamp(2.75rem,7vw,4.75rem)] font-medium uppercase leading-none tracking-[0.28em] text-white">
          Reeblom
        </h2>

        <span
          class="mt-6 block h-px w-24"
          style="background: linear-gradient(90deg, transparent, rgba(201, 208, 214, 0.5), transparent)"
        ></span>

        <p class="mt-8 max-w-xl font-grotesk text-[11px] leading-relaxed tracking-wide text-white/50">
          What withers in the light blooms again in the dark. A first offering
          of night-cut silhouettes &mdash; austere, precise, unrepeatable.
        </p>
      </div>

      <div class="mx-auto mt-14 max-w-7xl">
        <div class="mb-8 flex items-baseline justify-between">
          <h3 class="font-display text-[clamp(1.5rem,2.6vw,2rem)] font-medium uppercase tracking-[0.2em] text-white">
            The First Drop
          </h3>
          <router-link
            to="/collection/new-arrival"
            class="font-grotesk text-[10px] uppercase tracking-[0.3em] text-silver/60 transition-colors hover:text-silver"
          >
            Explore the collection &rarr;
          </router-link>
        </div>

        <div class="flex gap-6 overflow-x-auto pb-4 no-scrollbar snap-x snap-mandatory">
          <div
            v-for="product in firstDropProducts"
            :key="`new-${product.id}`"
            class="w-52 flex-shrink-0 snap-start sm:w-64"
          >
            <ProductCard :product="product" />
          </div>
        </div>
      </div>
    </section>

    <!-- The KALEMCI Grid: retícula flotante asimétrica a escala completa.
         Micro-padding exterior + micro-gap idéntico: las fotos nunca tocan
         los bordes del navegador ni se tocan entre sí — una fina línea negra
         las enmarca. Panorámico / dupla 50-50 / panorámico. -->
    <section id="categories" class="scroll-mt-20 p-1.5 sm:p-2">
      <div class="flex flex-col gap-1.5 sm:gap-2">
        <!-- Bloque 1 — NEW ARRIVAL: banner cinematográfico de entrada -->
        <router-link
          v-reveal
          to="/collection/new-arrival"
          class="group relative block h-[60vh] overflow-hidden bg-black transition-transform duration-300 ease-out active:scale-[0.995] md:h-[82vh]"
        >
          <img
            src="https://ffurplzqeldxzeheetgg.supabase.co/storage/v1/object/public/products/covers/new-arrival-2.jpg"
            alt="New Arrival"
            loading="eager"
            fetchpriority="high"
            decoding="async"
            class="absolute inset-0 h-full w-full object-cover opacity-50 contrast-125 brightness-[0.6] transition-all duration-700 ease-out group-hover:scale-[1.03] group-hover:opacity-70"
          />
          <div class="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/25"></div>
          <div class="absolute bottom-6 left-6 sm:bottom-9 sm:left-9">
            <p class="font-grotesk text-xs uppercase tracking-[0.45em] text-white/80 sm:text-sm">
              New Arrival
            </p>
            <p class="mt-2 font-grotesk text-[9px] uppercase tracking-[0.35em] text-white/40 transition-colors duration-300 group-hover:text-silver">
              Reeblom &middot; Collection I &mdash; Shop now &rarr;
            </p>
          </div>
        </router-link>

        <!-- Bloque 2 — MEN | WOMEN: dupla split 50/50 -->
        <div class="grid grid-cols-1 gap-1.5 sm:gap-2 md:grid-cols-2">
          <router-link
            v-reveal
            to="/collection/men"
            class="group relative block h-[55vh] overflow-hidden bg-black transition-transform duration-300 ease-out active:scale-[0.995] md:h-[78vh]"
          >
            <img
              src="https://ffurplzqeldxzeheetgg.supabase.co/storage/v1/object/public/products/covers/men.jpg"
              alt="Men"
              loading="lazy"
              decoding="async"
              class="absolute inset-0 h-full w-full object-cover opacity-50 contrast-125 brightness-[0.6] transition-all duration-700 ease-out group-hover:scale-[1.03] group-hover:opacity-70"
            />
            <div class="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/20"></div>
            <div class="absolute bottom-6 left-6 sm:bottom-9 sm:left-9">
              <p class="font-grotesk text-xs uppercase tracking-[0.45em] text-white/80 sm:text-sm">Men</p>
              <p class="mt-2 font-grotesk text-[9px] uppercase tracking-[0.35em] text-white/40 transition-colors duration-300 group-hover:text-silver">
                Night-cut silhouettes &mdash; Shop now &rarr;
              </p>
            </div>
          </router-link>

          <router-link
            v-reveal
            to="/collection/women"
            class="group relative block h-[55vh] overflow-hidden bg-black transition-transform duration-300 ease-out active:scale-[0.995] md:h-[78vh]"
          >
            <img
              src="https://ffurplzqeldxzeheetgg.supabase.co/storage/v1/object/public/products/covers/women.jpg"
              alt="Women"
              loading="lazy"
              decoding="async"
              class="absolute inset-0 h-full w-full object-cover opacity-50 contrast-125 brightness-[0.6] transition-all duration-700 ease-out group-hover:scale-[1.03] group-hover:opacity-70"
            />
            <div class="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/20"></div>
            <div class="absolute bottom-6 right-6 text-right sm:bottom-9 sm:right-9">
              <p class="font-grotesk text-xs uppercase tracking-[0.45em] text-white/80 sm:text-sm">Women</p>
              <p class="mt-2 font-grotesk text-[9px] uppercase tracking-[0.35em] text-white/40 transition-colors duration-300 group-hover:text-silver">
                Silhouettes of the dark &mdash; Shop now &rarr;
              </p>
            </div>
          </router-link>
        </div>

        <!-- Bloque 3 — TAILORING & ACCESSORIES: panorámico de cierre -->
        <router-link
          v-reveal
          to="/collection/accessories"
          class="group relative block h-[60vh] overflow-hidden bg-black transition-transform duration-300 ease-out active:scale-[0.995] md:h-[82vh]"
        >
          <img
            src="https://ffurplzqeldxzeheetgg.supabase.co/storage/v1/object/public/products/covers/tailoring.jpg"
            alt="Tailoring & Accessories"
            loading="lazy"
            decoding="async"
            class="absolute inset-0 h-full w-full object-cover opacity-50 contrast-125 brightness-[0.6] transition-all duration-700 ease-out group-hover:scale-[1.03] group-hover:opacity-70"
          />
          <div class="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/25"></div>
          <div class="absolute bottom-6 right-6 text-right sm:bottom-9 sm:right-9">
            <p class="font-grotesk text-xs uppercase tracking-[0.45em] text-white/80 sm:text-sm">
              Tailoring &amp; Accessories
            </p>
            <p class="mt-2 font-grotesk text-[9px] uppercase tracking-[0.35em] text-white/40 transition-colors duration-300 group-hover:text-silver">
              The final layer &mdash; Shop now &rarr;
            </p>
          </div>
        </router-link>
      </div>
    </section>

    <main id="catalog" class="mx-auto w-full max-w-[1680px] scroll-mt-20 px-6 py-16 2xl:px-10">
      <div class="mb-8 flex items-center justify-between">
        <h2 class="font-display text-[clamp(1.5rem,2.6vw,2rem)] font-medium uppercase tracking-[0.2em] capitalize">
          {{ catalogTitle }}
        </h2>
        <router-link
          v-if="hasFilter"
          to="/"
          class="font-grotesk text-xs uppercase tracking-widest text-white/50 transition-colors hover:text-white"
        >
          Clear filter &times;
        </router-link>
      </div>

      <p
        v-if="loading"
        class="text-center font-grotesk text-xs uppercase tracking-[0.3em] text-white/40"
      >
        Loading products...
      </p>

      <div v-else-if="filteredProducts.length === 0" class="py-10 text-center">
        <p class="font-grotesk text-xs uppercase tracking-[0.3em] text-white/40">
          Nothing found in the archive.
        </p>
        <router-link
          to="/"
          class="mt-5 inline-block border border-white/25 px-6 py-2.5 font-grotesk text-[10px] uppercase tracking-[0.3em] text-white/70 transition-colors hover:border-white/70 hover:text-white"
        >
          View all products
        </router-link>
      </div>

      <section v-else class="grid grid-cols-2 gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
        <ProductCard v-for="product in filteredProducts" :key="product.id" :product="product" />
      </section>
    </main>

    <Footer />
  </div>
</template>

<style scoped>
/* ==========================================================================
   THE MONOLITH MASK — coreografía cinemática del hero
   Curva de la casa: cubic-bezier(0.25, 1, 0.5, 1). Solo transform/opacity
   en piezas grandes; letter-spacing únicamente en tagline y máscara.
   ========================================================================== */

/* --- 1. Overlay: el wordmark como ventana --- */
.monolith-text {
  font-family: 'Alte Haas Grotesk', 'Helvetica Neue', Helvetica, Arial, sans-serif;
  font-weight: 400;
  font-size: clamp(3.25rem, 10.5vw, 10rem);
  letter-spacing: 0.01em;
  transform-box: fill-box;
  transform-origin: center;
  animation: monolith-breathe 1s cubic-bezier(0.25, 1, 0.5, 1) forwards;
}

/* Respiración de apertura: entra levemente contraída y abre su tracking */
@keyframes monolith-breathe {
  from {
    transform: scale(0.94);
    letter-spacing: 0.01em;
  }
  to {
    transform: scale(1);
    letter-spacing: 0.1em;
  }
}

/* Disolución: las letras-ventana devoran la placa (zoom a través de la K) */
.monolith-dissolving .monolith-text {
  animation: none;
  transform: scale(14);
  letter-spacing: 0.02em;
  transition:
    transform 1s cubic-bezier(0.7, 0, 0.3, 1),
    letter-spacing 1s cubic-bezier(0.7, 0, 0.3, 1);
}

.monolith-plate {
  opacity: 1;
}

.monolith-dissolving .monolith-plate {
  opacity: 0;
  transition: opacity 0.55s ease-out 0.5s;
}

/* --- 2. Cámara analógica sobre el backdrop --- */
.cine-focus {
  transform: scale(1.08);
  will-change: transform;
  transition: transform 1.9s cubic-bezier(0.25, 1, 0.5, 1);
}

.cine-focus.cine-settled {
  transform: scale(1);
}

.cine-veil {
  opacity: 0.45;
  transition: opacity 1.9s cubic-bezier(0.25, 1, 0.5, 1);
}

.cine-settled .cine-veil {
  opacity: 0;
}

/* --- 3. Split-text con inercia --- */
/* Letras: nacen bajo el pozo, convergidas al centro (--cx), y se abren.
   Keyframes (no transition) para que los delays de entrada jamás
   contaminen los hovers posteriores. */
.hero-content .hero-letter {
  transform: translate3d(var(--cx), 120%, 0);
}

.hero-content.revealed .hero-letter {
  animation: letter-rise 0.9s cubic-bezier(0.25, 1, 0.5, 1) both;
}

@keyframes letter-rise {
  from {
    transform: translate3d(var(--cx), 120%, 0);
  }
  to {
    transform: translate3d(0, 0, 0);
  }
}

.hero-content .hero-reg {
  opacity: 0;
}

.hero-content.revealed .hero-reg {
  animation: soft-in 0.7s cubic-bezier(0.25, 1, 0.5, 1) 0.62s both;
}

/* Tagline: fragmentos que emergen + tracking que se abre elegantemente */
.hero-tagline {
  letter-spacing: 0.18em;
  transition: letter-spacing 1.5s cubic-bezier(0.25, 1, 0.5, 1) 0.38s;
}

.hero-content.revealed .hero-tagline {
  letter-spacing: 0.45em;
}

.hero-content .hero-fragment {
  transform: translate3d(0, 115%, 0);
}

.hero-content.revealed .hero-fragment {
  animation: fragment-rise 0.85s cubic-bezier(0.25, 1, 0.5, 1) both;
}

@keyframes fragment-rise {
  from {
    transform: translate3d(0, 115%, 0);
  }
  to {
    transform: translate3d(0, 0, 0);
  }
}

/* CTAs y hairline: cierre de la secuencia */
.hero-content .hero-cta {
  opacity: 0;
}

.hero-content.revealed .hero-cta {
  animation: cta-rise 0.8s cubic-bezier(0.25, 1, 0.5, 1) var(--d, 640ms) both;
}

@keyframes cta-rise {
  from {
    opacity: 0;
    transform: translate3d(0, 16px, 0);
  }
  to {
    opacity: 1;
    transform: translate3d(0, 0, 0);
  }
}

.hero-content .hero-hairline {
  transform: scaleX(0);
}

.hero-content.revealed .hero-hairline {
  animation: hairline-grow 1s cubic-bezier(0.25, 1, 0.5, 1) 0.82s both;
}

@keyframes hairline-grow {
  from {
    transform: scaleX(0);
  }
  to {
    transform: scaleX(1);
  }
}

.hero-scrollhint {
  opacity: 0;
  transition: opacity 0.9s ease-out 1.2s;
}

.hero-scrollhint.revealed {
  opacity: 1;
}

@keyframes soft-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

/* --- 4. Reduced motion: estado final, cero teatro --- */
@media (prefers-reduced-motion: reduce) {
  .monolith-text,
  .hero-content .hero-letter,
  .hero-content.revealed .hero-letter,
  .hero-content.revealed .hero-fragment,
  .hero-content.revealed .hero-cta,
  .hero-content.revealed .hero-reg,
  .hero-content.revealed .hero-hairline {
    animation: none;
    transform: none;
    opacity: 1;
  }

  .hero-content .hero-fragment,
  .hero-content .hero-cta,
  .hero-content .hero-reg,
  .hero-content .hero-hairline {
    transform: none;
    opacity: 1;
  }

  .cine-focus,
  .cine-veil,
  .hero-tagline,
  .hero-scrollhint {
    transition: none;
  }

  .cine-focus {
    transform: none;
  }

  .cine-veil {
    opacity: 0;
  }

  .hero-tagline {
    letter-spacing: 0.45em;
  }

  .hero-scrollhint {
    opacity: 1;
  }
}
</style>
