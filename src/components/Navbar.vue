<script setup>
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { cartCount, toggleCart } from '../store/cart'
import { supabase } from '../supabase'
import { isAdminEmail, getAdminSession, signOut } from '../lib/adminAuth'
import { SUBTAGS, tagLabel } from '../lib/categories'

const route = useRoute()
const router = useRouter()

const primaryLinks = [
  { label: 'New Arrival', to: '/collection/new-arrival' },
  { label: 'All Products', to: '/collection/all' },
  { label: 'Men', to: '/collection/men', gender: 'men' },
  { label: 'Women', to: '/collection/women', gender: 'women' },
  { label: 'Collections', to: '/collections' },
  { label: 'Tailoring & Accessories', to: '/collection/accessories' },
]

function isActive(link) {
  return typeof link.to === 'string' && route.path === link.to
}

// --- Subtags dinámicos ---
// El menú de MEN/WOMEN solo lista subtags con al menos una prenda real que
// combine ese género + subtag en la base. Sin inventario, la entrada se oculta.
const subtagAvailability = ref({ men: [], women: [] })

async function loadSubtagAvailability() {
  if (!supabase) return
  try {
    const { data, error } = await supabase.from('products').select('tags')
    if (error) throw error

    const found = { men: new Set(), women: new Set() }
    for (const row of data ?? []) {
      const tags = row.tags ?? []
      for (const gender of ['men', 'women']) {
        if (!tags.includes(gender)) continue
        for (const tag of tags) {
          if (SUBTAGS.includes(tag)) found[gender].add(tag)
        }
      }
    }
    // Orden estable según el vocabulario, no según la base
    subtagAvailability.value = {
      men: SUBTAGS.filter((s) => found.men.has(s)),
      women: SUBTAGS.filter((s) => found.women.has(s)),
    }
  } catch (error) {
    console.error('No se pudo cargar la disponibilidad de subtags:', error)
  }
}

function subtagsFor(link) {
  return link.gender ? subtagAvailability.value[link.gender] : []
}

// --- Menú móvil ---
const menuOpen = ref(false)

function closeMenu() {
  menuOpen.value = false
}

watch(
  () => route.fullPath,
  () => {
    menuOpen.value = false
  },
)

watch(menuOpen, (open) => {
  document.body.style.overflow = open ? 'hidden' : ''
})

// --- Búsqueda ---
const searchOpen = ref(false)
const searchQuery = ref('')
const searchInput = ref(null)

async function toggleSearch() {
  searchOpen.value = !searchOpen.value
  if (searchOpen.value) {
    await nextTick()
    searchInput.value?.focus()
  }
}

function submitSearch() {
  const q = searchQuery.value.trim()
  if (!q) return
  searchOpen.value = false
  router.push({ path: '/', query: { search: q } })
}

function onKeydown(event) {
  if (event.key === 'Escape') {
    searchOpen.value = false
    menuOpen.value = false
  }
}

// --- Estado de administrador ---
// El email se toma siempre de la sesión que reporta el propio cliente de
// Supabase (evento onAuthStateChange), nunca de un flag local persistido.
// Esto solo controla si se PINTA la UI de admin; la autorización real vive
// en la RLS del servidor.
const adminEmail = ref(null)
const isAdmin = computed(() => isAdminEmail(adminEmail.value))
let authSubscription = null

async function handleLogout() {
  await signOut()
  adminEmail.value = null
  router.push('/')
}

// Botón de perfil: si hay sesión de admin válida va directo al panel;
// si no, al login. La sesión se consulta al momento del clic, no se cachea.
async function goToAccount() {
  menuOpen.value = false
  const session = await getAdminSession()
  router.push(session ? '/admin' : '/login')
}

onMounted(async () => {
  window.addEventListener('keydown', onKeydown)
  loadSubtagAvailability()

  if (supabase) {
    const { data } = await supabase.auth.getSession()
    adminEmail.value = data?.session?.user?.email ?? null

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      adminEmail.value = session?.user?.email ?? null
    })
    authSubscription = listener?.subscription ?? null
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  document.body.style.overflow = ''
  authSubscription?.unsubscribe()
})
</script>

<template>
  <header class="sticky top-0 z-40 border-b border-white/10 bg-black">
    <!-- Tres columnas reales: [1fr | auto | 1fr]. El logo vive en su propia
         pista de grid — las pistas no se solapan, así que matemáticamente
         nunca puede chocar con los laterales, a ninguna resolución. -->
    <nav class="grid grid-cols-[1fr_auto_1fr] items-center gap-4 px-6 py-5">
      <div class="flex min-w-0 items-center">
        <!-- Hamburguesa: por debajo de xl los links viven en el drawer -->
        <!-- Barras de 2px con color sólido: las hairlines de 1px se pierden
             al redondear subpíxeles en WebKit (iOS/Brave) con alta densidad -->
        <button
          type="button"
          aria-label="Menu"
          :aria-expanded="menuOpen"
          class="relative z-10 -m-2 flex h-9 w-10 flex-col items-start justify-center gap-[5px] p-2 xl:hidden"
          @click="menuOpen = true"
        >
          <span class="block h-[2px] w-full rounded-full bg-white"></span>
          <span class="block h-[2px] w-2/3 rounded-full bg-white"></span>
          <span class="block h-[2px] w-full rounded-full bg-white"></span>
        </button>

        <div class="hidden items-center gap-4 font-grotesk text-[10px] uppercase tracking-[0.15em] xl:flex 2xl:gap-5">
          <!-- Micro-interacción: subrayado que crece desde la izquierda.
               MEN/WOMEN despliegan panel de subtags si hay inventario. -->
          <div v-for="link in primaryLinks" :key="link.label" class="group/nav relative">
            <router-link
              :to="link.to"
              class="relative inline-block whitespace-nowrap py-1 transition-colors duration-300 ease-out hover:text-white after:absolute after:bottom-0 after:left-0 after:h-px after:w-full after:origin-left after:scale-x-0 after:bg-silver/70 after:transition-transform after:duration-300 after:ease-out hover:after:scale-x-100"
              :class="isActive(link) ? 'text-silver after:scale-x-100' : 'text-white/60'"
            >
              {{ link.label }}
            </router-link>

            <div
              v-if="subtagsFor(link).length"
              class="invisible absolute left-1/2 top-full z-50 -translate-x-1/2 pt-4 opacity-0 transition-all duration-200 ease-out group-hover/nav:visible group-hover/nav:opacity-100"
            >
              <div class="flex min-w-[10rem] flex-col gap-2.5 border border-white/10 bg-black px-5 py-4">
                <router-link
                  v-for="sub in subtagsFor(link)"
                  :key="sub"
                  :to="{ path: link.to, query: { sub } }"
                  class="whitespace-nowrap font-grotesk text-[10px] uppercase tracking-[0.2em] text-white/50 transition-colors duration-300 hover:text-silver"
                >
                  {{ tagLabel(sub) }}
                </router-link>
              </div>
            </div>
          </div>
        </div>
      </div>

      <router-link
        id="navbar-logo"
        to="/"
        class="whitespace-nowrap px-2 font-grotesk text-lg font-normal uppercase leading-none tracking-[0.08em] text-white sm:text-2xl"
      >
        Kalemci<span class="relative -top-1 ml-1 align-top text-[0.4em] font-normal text-white/70">&reg;</span>
      </router-link>

      <div class="flex min-w-0 items-center justify-end gap-3 sm:gap-4 2xl:gap-5">
        <template v-if="isAdmin">
          <router-link
            to="/admin"
            class="hidden whitespace-nowrap font-grotesk text-[10px] uppercase tracking-[0.25em] text-white/60 transition-colors hover:text-white xl:block"
          >
            /Admin
          </router-link>
          <button
            type="button"
            class="hidden whitespace-nowrap font-grotesk text-[10px] uppercase tracking-[0.25em] text-white/60 transition-colors hover:text-white xl:block"
            @click="handleLogout"
          >
            Logout
          </button>
        </template>

        <button
          type="button"
          aria-label="Search"
          :aria-expanded="searchOpen"
          class="hidden transition-colors hover:text-white sm:block"
          :class="searchOpen ? 'text-white' : 'text-white/60'"
          @click="toggleSearch"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            class="h-[18px] w-[18px]"
          >
            <circle cx="11" cy="11" r="7" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </button>

        <button
          type="button"
          aria-label="Profile"
          class="hidden text-white/60 transition-colors hover:text-white sm:block"
          @click="goToAccount"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            class="h-[18px] w-[18px]"
          >
            <circle cx="12" cy="8" r="4" />
            <path d="M4 20c0-4.4 3.6-7 8-7s8 2.6 8 7" />
          </svg>
        </button>

        <button
          type="button"
          class="flex items-center gap-2 border border-white/20 px-3 py-1.5 font-grotesk text-xs uppercase tracking-[0.2em] text-white transition-all duration-300 ease-out hover:border-silver/70 active:scale-[0.97] sm:px-4 sm:py-2"
          @click="toggleCart"
        >
          Cart
          <span
            class="border px-1.5 leading-tight transition-colors"
            :class="cartCount > 0 ? 'border-silver bg-silver text-black' : 'border-white/40'"
          >
            {{ cartCount }}
          </span>
        </button>
      </div>
    </nav>

    <!-- Barra de búsqueda -->
    <Transition
      enter-active-class="transition-all duration-200 ease-out"
      enter-from-class="-translate-y-2 opacity-0"
      enter-to-class="translate-y-0 opacity-100"
      leave-active-class="transition-all duration-150 ease-in"
      leave-from-class="translate-y-0 opacity-100"
      leave-to-class="-translate-y-2 opacity-0"
    >
      <form
        v-if="searchOpen"
        class="absolute inset-x-0 top-full border-b border-white/10 bg-black px-6 py-4"
        @submit.prevent="submitSearch"
      >
        <div class="flex items-center gap-4">
          <input
            ref="searchInput"
            v-model="searchQuery"
            type="text"
            aria-label="Search the archive"
            placeholder="Search the archive..."
            class="w-full border-b border-white/20 bg-transparent pb-2 font-grotesk text-xs uppercase tracking-[0.25em] text-white transition-colors duration-300 placeholder:text-white/25 focus:border-silver/60 focus:outline-none"
          />
          <button
            type="submit"
            class="whitespace-nowrap font-grotesk text-[10px] uppercase tracking-[0.3em] text-white/50 transition-colors hover:text-white"
          >
            Search
          </button>
        </div>
      </form>
    </Transition>
  </header>

  <!-- Menú móvil -->
  <Teleport to="body">
    <Transition
      enter-active-class="transition-opacity duration-300"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-300"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="menuOpen" class="fixed inset-0 z-50 bg-black/70" @click="closeMenu"></div>
    </Transition>

    <Transition
      enter-active-class="transition-transform duration-300 ease-out"
      enter-from-class="-translate-x-full"
      enter-to-class="translate-x-0"
      leave-active-class="transition-transform duration-300 ease-in"
      leave-from-class="translate-x-0"
      leave-to-class="-translate-x-full"
    >
      <aside
        v-if="menuOpen"
        class="fixed left-0 top-0 z-50 flex h-full w-72 flex-col border-r border-white/10 bg-black text-white"
      >
        <div class="flex items-center justify-between border-b border-white/10 px-6 py-5">
          <span class="font-display text-xl font-semibold uppercase tracking-widest">Menu</span>
          <button
            type="button"
            class="font-grotesk text-xs uppercase tracking-[0.2em] text-white/60 transition-colors hover:text-white"
            @click="closeMenu"
          >
            Close
          </button>
        </div>

        <nav class="flex flex-1 flex-col gap-6 overflow-y-auto px-6 py-8">
          <div v-for="link in primaryLinks" :key="link.label" class="flex flex-col gap-3">
            <router-link
              :to="link.to"
              class="font-grotesk text-[11px] uppercase tracking-[0.3em] transition-colors hover:text-white"
              :class="isActive(link) ? 'text-silver' : 'text-white/60'"
            >
              {{ link.label }}
            </router-link>
            <router-link
              v-for="sub in subtagsFor(link)"
              :key="sub"
              :to="{ path: link.to, query: { sub } }"
              class="ml-4 border-l border-white/10 pl-3 font-grotesk text-[10px] uppercase tracking-[0.25em] text-white/40 transition-colors hover:text-silver"
            >
              {{ tagLabel(sub) }}
            </router-link>
          </div>

          <span class="mt-4 block h-px w-8 bg-white/15"></span>

          <button
            type="button"
            class="text-left font-grotesk text-[11px] uppercase tracking-[0.3em] text-white/60 transition-colors hover:text-white"
            @click="goToAccount"
          >
            Account
          </button>

          <template v-if="isAdmin">
            <router-link
              to="/admin"
              class="font-grotesk text-[11px] uppercase tracking-[0.3em] text-white/60 transition-colors hover:text-white"
            >
              /Admin
            </router-link>
            <button
              type="button"
              class="text-left font-grotesk text-[11px] uppercase tracking-[0.3em] text-white/60 transition-colors hover:text-white"
              @click="handleLogout"
            >
              Logout
            </button>
          </template>
        </nav>

        <p class="border-t border-white/10 px-6 py-5 font-grotesk text-[9px] uppercase tracking-[0.3em] text-white/30">
          Kalemci Archives
        </p>
      </aside>
    </Transition>
  </Teleport>
</template>
