<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import Navbar from '../components/Navbar.vue'
import Footer from '../components/Footer.vue'
import { supabase } from '../supabase'
import { getAdminSession } from '../lib/adminAuth'
import { PRIMARY_TAGS, SUBTAGS, ALLOWED_TAGS, tagLabel } from '../lib/categories'

const router = useRouter()

const ALLOWED_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'One Size']
const MAX_IMAGES = 6

const TAG_LABELS = {
  'new-arrival': 'New Arrival',
  men: 'Men',
  women: 'Women',
  accessories: 'Accessories',
}

// --- Formulario (crear / editar) ---
const name = ref('')
const price = ref('')
const description = ref('')
const selectedSizes = ref([])
const stockBySize = ref({})
const selectedTags = ref([])
const imageUrls = ref(['', ''])

const editingId = ref(null)
const editingName = ref('')
const submitting = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

// --- Catálogo existente ---
const catalog = ref([])
const catalogLoading = ref(true)
const confirmingDeleteId = ref(null)
const deletingId = ref(null)
const listError = ref('')
const listSuccess = ref('')

// --- Gestión de órdenes ---
const activeOrders = ref([])
const receivedOrders = ref([])
const ordersLoading = ref(true)
const ordersError = ref('')
const updatingOrderId = ref(null)

// Captura de guía al marcar Shipped + confirmación al marcar Received
const shippingCaptureId = ref(null)
const trackingNumber = ref('')
const trackingUrl = ref('')
const trackingError = ref('')
const confirmingReceiveId = ref(null)


function addImageField() {
  if (imageUrls.value.length < MAX_IMAGES) imageUrls.value.push('')
}

function removeImageField(index) {
  if (imageUrls.value.length > 1) imageUrls.value.splice(index, 1)
}

function toggleSize(size) {
  const index = selectedSizes.value.indexOf(size)
  if (index === -1) {
    selectedSizes.value.push(size)
    if (stockBySize.value[size] === undefined) stockBySize.value[size] = ''
  } else {
    selectedSizes.value.splice(index, 1)
    delete stockBySize.value[size]
  }
}

function toggleTag(tag) {
  const index = selectedTags.value.indexOf(tag)
  if (index === -1) selectedTags.value.push(tag)
  else selectedTags.value.splice(index, 1)
}

// Elimina caracteres de control (incluye null bytes y saltos crudos) que no
// tienen lugar en campos de texto de catálogo y son vehículo típico de
// payloads; colapsa espacios repetidos y recorta a la longitud máxima.
function sanitizeText(value, maxLength) {
  return value
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .slice(0, maxLength)
}

function sanitizeImageUrl(value) {
  const url = value.trim().slice(0, 500)
  if (!url) return null
  let parsed
  try {
    parsed = new URL(url)
  } catch {
    return undefined // inválida
  }
  // Solo https: bloquea javascript:, data:, http:// (contenido mixto) y
  // cualquier otro esquema que pudiera ejecutarse o degradar la página.
  if (parsed.protocol !== 'https:') return undefined
  return parsed.href
}

function buildPayload() {
  const cleanName = sanitizeText(name.value, 120)
  if (!cleanName) return { error: 'Name is required.' }

  const parsedPrice = Number(price.value)
  if (!Number.isFinite(parsedPrice) || parsedPrice <= 0 || parsedPrice > 1000000) {
    return { error: 'Price must be a positive number.' }
  }

  // Solo tallas del catálogo permitido — se ignora cualquier valor inyectado
  // manipulando el DOM o el estado del componente.
  const cleanSizes = selectedSizes.value.filter((size) => ALLOWED_SIZES.includes(size))
  if (cleanSizes.length === 0) return { error: 'Select at least one size.' }

  // Stock por talla: entero >= 0 obligatorio para cada talla seleccionada.
  // Number('') es 0, así que el vacío se rechaza explícitamente antes —
  // un campo olvidado no debe convertirse en "agotado" en silencio.
  const cleanStock = {}
  for (const size of cleanSizes) {
    const raw = stockBySize.value[size]
    if (raw === '' || raw === null || raw === undefined) {
      return { error: `Enter stock quantity for size ${size}.` }
    }
    const qty = Number(raw)
    if (!Number.isInteger(qty) || qty < 0 || qty > 99999) {
      return { error: `Stock for ${size} must be a whole number between 0 and 99999.` }
    }
    cleanStock[size] = qty
  }

  const cleanImages = []
  for (const raw of imageUrls.value) {
    const result = sanitizeImageUrl(raw)
    if (result === undefined) return { error: 'Image URLs must be valid https:// links.' }
    if (result) cleanImages.push(result)
  }
  if (cleanImages.length === 0) return { error: 'At least one image URL is required.' }

  // Tags: solo del vocabulario permitido (mismo CHECK que aplica la base).
  // Al menos un tag PRIMARIO es obligatorio; los subtags de prenda son opcionales.
  const cleanTags = selectedTags.value.filter((tag) => ALLOWED_TAGS.includes(tag))
  if (!cleanTags.some((tag) => PRIMARY_TAGS.includes(tag))) {
    return { error: 'Select at least one primary tag (New Arrival / Men / Women / Accessories).' }
  }

  return {
    payload: {
      name: cleanName,
      price: Math.round(parsedPrice * 100) / 100,
      description: sanitizeText(description.value, 2000) || null,
      sizes: cleanSizes,
      stock_by_size: cleanStock,
      tags: cleanTags,
      images: cleanImages.slice(0, MAX_IMAGES),
    },
  }
}

function resetForm() {
  name.value = ''
  price.value = ''
  description.value = ''
  selectedSizes.value = []
  stockBySize.value = {}
  selectedTags.value = []
  imageUrls.value = ['', '']
  editingId.value = null
  editingName.value = ''
}

async function fetchCatalog() {
  catalogLoading.value = true
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw error
    catalog.value = data ?? []
  } catch (error) {
    console.error('No se pudo cargar el catálogo:', error)
    listError.value = 'Could not load the catalog.'
  } finally {
    catalogLoading.value = false
  }
}

function startEdit(product) {
  editingId.value = product.id
  editingName.value = product.name
  name.value = product.name
  price.value = String(product.price)
  description.value = product.description ?? ''
  selectedSizes.value = (product.sizes ?? []).filter((size) => ALLOWED_SIZES.includes(size))

  // Precarga el stock existente; talla sin dato queda vacía para obligar
  // al admin a definirla explícitamente al guardar.
  const existingStock = product.stock_by_size ?? {}
  stockBySize.value = {}
  for (const size of selectedSizes.value) {
    const qty = Number(existingStock[size])
    stockBySize.value[size] = Number.isInteger(qty) && qty >= 0 ? String(qty) : ''
  }

  selectedTags.value = (product.tags ?? []).filter((tag) => ALLOWED_TAGS.includes(tag))
  imageUrls.value = product.images?.length ? [...product.images] : ['', '']
  errorMessage.value = ''
  successMessage.value = ''
  confirmingDeleteId.value = null
  document.getElementById('product-form')?.scrollIntoView({ behavior: 'smooth' })
}

function cancelEdit() {
  resetForm()
  errorMessage.value = ''
  successMessage.value = ''
}

async function handleSubmit() {
  if (submitting.value) return
  errorMessage.value = ''
  successMessage.value = ''

  // Revalidación de sesión en el momento de la acción (no solo al entrar a
  // la ruta): si la sesión expiró o fue revocada, se expulsa aquí mismo.
  // La autorización definitiva la aplica la RLS en el servidor de todos modos.
  const session = await getAdminSession()
  if (!session) {
    router.replace({ path: '/login', query: { redirect: '/admin' } })
    return
  }

  const { payload, error: validationError } = buildPayload()
  if (validationError) {
    errorMessage.value = validationError
    return
  }

  submitting.value = true
  try {
    const query = editingId.value
      ? supabase.from('products').update(payload).eq('id', editingId.value)
      : supabase.from('products').insert(payload)

    const { data, error } = await query.select().single()

    if (error) {
      // 42501 = violación de RLS: autenticado pero fuera de la lista blanca.
      errorMessage.value =
        error.code === '42501'
          ? 'Not authorized to modify the catalog.'
          : 'Could not save the product.'
      return
    }

    successMessage.value = editingId.value
      ? `“${data.name}” updated.`
      : `“${data.name}” added to the archive.`
    resetForm()
    fetchCatalog()
  } catch {
    errorMessage.value = 'Could not save the product.'
  } finally {
    submitting.value = false
  }
}

async function handleDelete(product) {
  listError.value = ''
  listSuccess.value = ''

  // Primer clic arma la confirmación; solo el segundo clic ejecuta.
  if (confirmingDeleteId.value !== product.id) {
    confirmingDeleteId.value = product.id
    return
  }

  const session = await getAdminSession()
  if (!session) {
    router.replace({ path: '/login', query: { redirect: '/admin' } })
    return
  }

  deletingId.value = product.id
  try {
    const { error } = await supabase.from('products').delete().eq('id', product.id)

    if (error) {
      listError.value =
        error.code === '42501' ? 'Not authorized to modify the catalog.' : 'Could not delete the product.'
      return
    }

    listSuccess.value = `“${product.name}” removed from the archive.`
    if (editingId.value === product.id) cancelEdit()
    fetchCatalog()
  } catch {
    listError.value = 'Could not delete the product.'
  } finally {
    deletingId.value = null
    confirmingDeleteId.value = null
  }
}

async function fetchOrders() {
  ordersLoading.value = true
  ordersError.value = ''
  try {
    // Activas: lo pendiente de trabajar, de la más antigua a la más nueva
    // (primero en entrar, primero en enviarse). Historial: últimas 100.
    const [active, received] = await Promise.all([
      supabase
        .from('orders')
        .select('*')
        .in('status', ['paid', 'shipped'])
        .order('created_at', { ascending: true }),
      supabase
        .from('orders')
        .select('*')
        .eq('status', 'received')
        .order('created_at', { ascending: false })
        .limit(100),
    ])
    if (active.error) throw active.error
    if (received.error) throw received.error
    activeOrders.value = active.data ?? []
    receivedOrders.value = received.data ?? []
  } catch (error) {
    console.error('No se pudieron cargar las órdenes:', error)
    ordersError.value = 'Could not load orders.'
  } finally {
    ordersLoading.value = false
  }
}

// Aplica el cambio de estado con payload extra opcional (tracking) y
// mueve la orden entre listas reactivamente.
async function applyOrderUpdate(order, next, extra = {}) {
  const session = await getAdminSession()
  if (!session) {
    router.replace({ path: '/login', query: { redirect: '/admin' } })
    return false
  }

  ordersError.value = ''
  updatingOrderId.value = order.id
  try {
    const { data, error } = await supabase
      .from('orders')
      .update({ status: next, ...extra })
      .eq('id', order.id)
      .select()
      .single()

    if (error) throw error

    // Reactividad inmediata sin refetch: 'received' sale de activas y entra
    // al frente del historial; 'shipped' solo actualiza su tarjeta.
    if (next === 'received') {
      activeOrders.value = activeOrders.value.filter((o) => o.id !== order.id)
      receivedOrders.value = [data, ...receivedOrders.value].slice(0, 100)
    } else {
      const index = activeOrders.value.findIndex((o) => o.id === order.id)
      if (index !== -1) activeOrders.value[index] = data
    }
    return true
  } catch (error) {
    console.error('No se pudo actualizar la orden:', error)
    ordersError.value = 'Could not update the order.'
    return false
  } finally {
    updatingOrderId.value = null
  }
}

// Paso 1 del envío: abre la captura de guía (no cambia nada aún).
function openShippingCapture(order) {
  shippingCaptureId.value = order.id
  trackingNumber.value = order.tracking_number ?? ''
  trackingUrl.value = order.tracking_url ?? ''
  trackingError.value = ''
  confirmingReceiveId.value = null
}

function cancelShippingCapture() {
  shippingCaptureId.value = null
  trackingError.value = ''
}

// Paso 2: valida guía (obligatoria) y link (opcional, http/https) y marca Shipped.
async function confirmShipment(order) {
  const guide = trackingNumber.value.trim().slice(0, 120)
  if (!guide) {
    trackingError.value = 'El número de guía es obligatorio.'
    return
  }

  let url = trackingUrl.value.trim().slice(0, 500)
  if (url && !/^https?:\/\//i.test(url)) {
    trackingError.value = 'El link de rastreo debe iniciar con http:// o https://'
    return
  }

  const ok = await applyOrderUpdate(order, 'shipped', {
    tracking_number: guide,
    tracking_url: url || null,
  })
  if (ok) cancelShippingCapture()
}

// Received: confirmación en dos pasos para prevenir clics accidentales.
async function handleReceive(order) {
  if (confirmingReceiveId.value !== order.id) {
    confirmingReceiveId.value = order.id
    shippingCaptureId.value = null
    return
  }
  const ok = await applyOrderUpdate(order, 'received')
  if (ok) confirmingReceiveId.value = null
}

function shortOrderId(id) {
  return String(id).slice(0, 8).toUpperCase()
}

function formatOrderDate(value) {
  return new Date(value).toLocaleString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatPrice(value) {
  return `$${Number(value).toFixed(2)}`
}

// Resumen "S:5 · M:8 · L:0" para la lista; sin dato de stock muestra solo tallas.
function stockLabel(product) {
  const sizes = product.sizes ?? []
  const stock = product.stock_by_size
  if (!stock || typeof stock !== 'object') return sizes.join(' / ')
  return sizes.map((size) => `${size}:${Number(stock[size]) || 0}`).join(' · ')
}

onMounted(() => {
  fetchCatalog()
  fetchOrders()
})
</script>

<template>
  <div class="flex min-h-screen flex-col bg-black text-white">
    <Navbar />

    <main class="mx-auto w-full max-w-2xl flex-1 px-6 py-14">
      <h1 class="font-display text-2xl font-semibold uppercase tracking-[0.25em]">Admin</h1>
      <p class="mt-2 font-grotesk text-[9px] uppercase tracking-[0.35em] text-white/35">
        Catalog management
      </p>

      <form id="product-form" class="mt-10 flex flex-col gap-8 scroll-mt-24" @submit.prevent="handleSubmit">
        <div class="flex items-baseline justify-between gap-4 border-b border-white/10 pb-3">
          <h2 class="font-grotesk text-[10px] uppercase tracking-[0.35em] text-white/60">
            {{ editingId ? `Editing — ${editingName}` : 'New product' }}
          </h2>
          <button
            v-if="editingId"
            type="button"
            class="font-grotesk text-[10px] uppercase tracking-[0.25em] text-white/40 transition-colors hover:text-white"
            @click="cancelEdit"
          >
            Cancel edit &times;
          </button>
        </div>

        <label class="block">
          <span class="mb-2 block font-grotesk text-[10px] uppercase tracking-[0.3em] text-white/40">Name</span>
          <input
            v-model="name"
            type="text"
            maxlength="120"
            class="w-full border-b border-white/20 bg-transparent pb-2 font-grotesk text-xs tracking-wider text-white transition-colors duration-300 placeholder:text-white/20 focus:border-silver/60 focus:outline-none"
            placeholder="Reaper Trench Coat"
          />
        </label>

        <label class="block">
          <span class="mb-2 block font-grotesk text-[10px] uppercase tracking-[0.3em] text-white/40">Price (MXN)</span>
          <input
            v-model="price"
            type="number"
            step="0.01"
            min="0.01"
            class="w-full border-b border-white/20 bg-transparent pb-2 font-grotesk text-xs tracking-wider text-white transition-colors duration-300 placeholder:text-white/20 focus:border-silver/60 focus:outline-none"
            placeholder="340.00"
          />
        </label>

        <div>
          <span class="mb-3 block font-grotesk text-[10px] uppercase tracking-[0.3em] text-white/40">
            Sizes &amp; Stock
          </span>
          <div class="flex flex-wrap gap-x-4 gap-y-3">
            <div v-for="size in ALLOWED_SIZES" :key="size" class="flex items-center gap-2">
              <button
                type="button"
                class="flex h-10 min-w-[2.5rem] items-center justify-center border px-2 font-grotesk text-[11px] uppercase tracking-wider transition-colors"
                :class="
                  selectedSizes.includes(size)
                    ? 'border-white bg-white text-black'
                    : 'border-white/20 text-white/70 hover:border-white'
                "
                @click="toggleSize(size)"
              >
                {{ size }}
              </button>
              <input
                v-if="selectedSizes.includes(size)"
                v-model="stockBySize[size]"
                type="number"
                min="0"
                max="99999"
                step="1"
                :aria-label="`Stock for size ${size}`"
                placeholder="qty"
                class="w-14 border-b border-white/20 bg-transparent pb-1 text-center font-grotesk text-[11px] tracking-wider text-white transition-colors duration-300 placeholder:text-white/20 focus:border-silver/60 focus:outline-none"
              />
            </div>
          </div>
          <p class="mt-3 font-grotesk text-[9px] uppercase tracking-[0.25em] text-white/30">
            Each selected size needs its stock quantity &mdash; 0 marks it sold out.
          </p>
        </div>

        <div>
          <span class="mb-3 block font-grotesk text-[10px] uppercase tracking-[0.3em] text-white/40">
            Tags &mdash; catalog filters
          </span>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="tag in PRIMARY_TAGS"
              :key="tag"
              type="button"
              class="border px-3 py-2 font-grotesk text-[10px] uppercase tracking-[0.2em] transition-colors duration-300"
              :class="
                selectedTags.includes(tag)
                  ? 'border-silver text-silver'
                  : 'border-white/20 text-white/60 hover:border-white/60'
              "
              @click="toggleTag(tag)"
            >
              {{ TAG_LABELS[tag] }}
            </button>
          </div>
          <p class="mt-3 font-grotesk text-[9px] uppercase tracking-[0.25em] text-white/30">
            Controls where the piece appears: navbar filters, collections and The First Drop.
          </p>
        </div>

        <div>
          <span class="mb-3 block font-grotesk text-[10px] uppercase tracking-[0.3em] text-white/40">
            Subtags &mdash; garment type
          </span>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="sub in SUBTAGS"
              :key="sub"
              type="button"
              class="border px-3 py-1.5 font-grotesk text-[10px] uppercase tracking-[0.2em] transition-colors duration-300"
              :class="
                selectedTags.includes(sub)
                  ? 'border-silver text-silver'
                  : 'border-white/15 text-white/45 hover:border-white/50'
              "
              @click="toggleTag(sub)"
            >
              {{ tagLabel(sub) }}
            </button>
          </div>
          <p class="mt-3 font-grotesk text-[9px] uppercase tracking-[0.25em] text-white/30">
            Optional. Feeds the Men / Women dropdown menus &mdash; a subtag only
            appears in the storefront when at least one piece carries it.
          </p>
        </div>

        <label class="block">
          <span class="mb-2 block font-grotesk text-[10px] uppercase tracking-[0.3em] text-white/40">Description</span>
          <textarea
            v-model="description"
            rows="4"
            maxlength="2000"
            class="w-full border border-white/20 bg-transparent p-3 font-grotesk text-xs leading-relaxed tracking-wider text-white transition-colors duration-300 placeholder:text-white/20 focus:border-silver/60 focus:outline-none"
            placeholder="Oversized matte-black trench with silver hardware..."
          ></textarea>
        </label>

        <div>
          <span class="mb-3 block font-grotesk text-[10px] uppercase tracking-[0.3em] text-white/40">
            Image URLs (https only)
          </span>
          <div class="flex flex-col gap-3">
            <div v-for="(url, index) in imageUrls" :key="index" class="flex items-center gap-3">
              <input
                v-model="imageUrls[index]"
                type="url"
                maxlength="500"
                class="w-full border-b border-white/20 bg-transparent pb-2 font-grotesk text-xs tracking-wider text-white transition-colors duration-300 placeholder:text-white/20 focus:border-silver/60 focus:outline-none"
                :placeholder="`https://cdn.kalemci.mx/product-${index + 1}.jpg`"
              />
              <button
                v-if="imageUrls.length > 1"
                type="button"
                :aria-label="`Remove image ${index + 1}`"
                class="font-grotesk text-xs text-white/40 transition-colors hover:text-white"
                @click="removeImageField(index)"
              >
                &times;
              </button>
            </div>
          </div>
          <button
            v-if="imageUrls.length < MAX_IMAGES"
            type="button"
            class="mt-3 font-grotesk text-[10px] uppercase tracking-[0.3em] text-white/50 transition-colors hover:text-white"
            @click="addImageField"
          >
            + Add image
          </button>
        </div>

        <p
          v-if="errorMessage"
          role="alert"
          class="font-grotesk text-[10px] uppercase tracking-[0.25em] text-red-400"
        >
          {{ errorMessage }}
        </p>
        <p
          v-if="successMessage"
          role="status"
          class="border border-white/15 px-4 py-3 font-grotesk text-[10px] uppercase tracking-[0.25em] text-white/70"
        >
          {{ successMessage }}
        </p>

        <button
          type="submit"
          :disabled="submitting"
          class="w-full bg-white py-4 font-grotesk text-xs font-semibold uppercase tracking-[0.35em] text-black transition-colors hover:bg-white/80 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {{ submitting ? 'Saving...' : editingId ? 'Save Changes' : 'Publish Product' }}
        </button>
      </form>

      <!-- Catálogo existente -->
      <section class="mt-16">
        <div class="flex items-baseline justify-between border-b border-white/10 pb-3">
          <h2 class="font-grotesk text-[10px] uppercase tracking-[0.35em] text-white/60">Archive</h2>
          <p v-if="!catalogLoading" class="font-grotesk text-[10px] uppercase tracking-[0.3em] text-white/35">
            {{ catalog.length }} {{ catalog.length === 1 ? 'piece' : 'pieces' }}
          </p>
        </div>

        <p
          v-if="listError"
          role="alert"
          class="mt-4 font-grotesk text-[10px] uppercase tracking-[0.25em] text-red-400"
        >
          {{ listError }}
        </p>
        <p
          v-if="listSuccess"
          role="status"
          class="mt-4 border border-white/15 px-4 py-3 font-grotesk text-[10px] uppercase tracking-[0.25em] text-white/70"
        >
          {{ listSuccess }}
        </p>

        <p
          v-if="catalogLoading"
          class="py-10 text-center font-grotesk text-xs uppercase tracking-[0.3em] text-white/40"
        >
          Loading catalog...
        </p>

        <p
          v-else-if="catalog.length === 0"
          class="py-10 text-center font-grotesk text-xs uppercase tracking-[0.3em] text-white/40"
        >
          The archive is empty.
        </p>

        <ul v-else class="divide-y divide-white/10">
          <li
            v-for="product in catalog"
            :key="product.id"
            class="flex items-center gap-4 py-4"
            :class="editingId === product.id ? 'opacity-100' : ''"
          >
            <img
              :src="product.images?.[0]"
              :alt="product.name"
              class="h-16 w-12 flex-shrink-0 object-cover"
            />

            <div class="min-w-0 flex-1">
              <p class="truncate font-grotesk text-xs uppercase tracking-wider text-white">
                {{ product.name }}
                <span
                  v-if="editingId === product.id"
                  class="ml-2 font-grotesk text-[9px] uppercase tracking-[0.25em] text-white/40"
                >
                  — editing
                </span>
              </p>
              <p class="mt-1 font-grotesk text-[10px] tracking-wider text-white/50">
                {{ formatPrice(product.price) }}
                <span class="text-white/30">&middot; {{ stockLabel(product) }}</span>
              </p>
              <p
                v-if="product.tags?.length"
                class="mt-1 font-grotesk text-[9px] uppercase tracking-[0.2em] text-silver/40"
              >
                {{ product.tags.join(' · ') }}
              </p>
            </div>

            <div class="flex flex-shrink-0 items-center gap-3">
              <template v-if="confirmingDeleteId === product.id">
                <span class="font-grotesk text-[9px] uppercase tracking-[0.2em] text-red-400">Sure?</span>
                <button
                  type="button"
                  :disabled="deletingId === product.id"
                  class="border border-red-400/60 px-3 py-1.5 font-grotesk text-[10px] uppercase tracking-[0.2em] text-red-400 transition-colors hover:bg-red-400 hover:text-black disabled:opacity-40"
                  @click="handleDelete(product)"
                >
                  {{ deletingId === product.id ? '...' : 'Confirm' }}
                </button>
                <button
                  type="button"
                  class="font-grotesk text-[10px] uppercase tracking-[0.2em] text-white/40 transition-colors hover:text-white"
                  @click="confirmingDeleteId = null"
                >
                  Cancel
                </button>
              </template>
              <template v-else>
                <button
                  type="button"
                  class="border border-white/20 px-3 py-1.5 font-grotesk text-[10px] uppercase tracking-[0.2em] text-white/70 transition-colors hover:border-white hover:text-white"
                  @click="startEdit(product)"
                >
                  Edit
                </button>
                <button
                  type="button"
                  class="border border-white/10 px-3 py-1.5 font-grotesk text-[10px] uppercase tracking-[0.2em] text-white/40 transition-colors hover:border-red-400/60 hover:text-red-400"
                  @click="handleDelete(product)"
                >
                  Delete
                </button>
              </template>
            </div>
          </li>
        </ul>
      </section>

      <!-- Gestión de órdenes -->
      <section class="mt-16">
        <div class="flex items-baseline justify-between border-b border-white/10 pb-3">
          <h2 class="font-grotesk text-[10px] uppercase tracking-[0.35em] text-white/60">
            Orders Management
          </h2>
          <p v-if="!ordersLoading" class="font-grotesk text-[10px] uppercase tracking-[0.3em] text-white/35">
            {{ activeOrders.length }} active
          </p>
        </div>

        <p
          v-if="ordersError"
          role="alert"
          class="mt-4 font-grotesk text-[10px] uppercase tracking-[0.25em] text-red-400"
        >
          {{ ordersError }}
        </p>

        <p
          v-if="ordersLoading"
          class="py-10 text-center font-grotesk text-xs uppercase tracking-[0.3em] text-white/40"
        >
          Loading orders...
        </p>

        <template v-else>
          <!-- Bloque 1: órdenes activas (paid / shipped) -->
          <p
            v-if="activeOrders.length === 0"
            class="py-10 text-center font-grotesk text-xs uppercase tracking-[0.3em] text-white/40"
          >
            No active orders.
          </p>

          <div v-else class="mt-6 flex flex-col gap-6">
            <article
              v-for="order in activeOrders"
              :key="order.id"
              class="border border-white/15 p-5"
            >
              <div class="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
                <div class="flex items-center gap-4">
                  <p class="font-grotesk text-xs uppercase tracking-[0.2em] text-white">
                    #{{ shortOrderId(order.id) }}
                  </p>
                  <span
                    class="border px-2 py-0.5 font-grotesk text-[9px] uppercase tracking-[0.25em]"
                    :class="
                      order.status === 'paid'
                        ? 'border-white/40 text-white/80'
                        : 'border-white bg-white text-black'
                    "
                  >
                    {{ order.status }}
                  </span>
                </div>
                <p class="font-grotesk text-[9px] uppercase tracking-[0.2em] text-white/35">
                  {{ formatOrderDate(order.created_at) }}
                </p>
              </div>

              <div class="mt-4 grid grid-cols-1 gap-6 md:grid-cols-2">
                <div class="flex flex-col gap-1 font-grotesk text-[11px] tracking-wider text-white/70">
                  <p class="mb-1 font-grotesk text-[9px] uppercase tracking-[0.3em] text-white/35">Contact</p>
                  <p class="text-white">{{ order.customer_email }}</p>
                  <p>Tel: {{ order.telefono }}</p>

                  <p class="mb-1 mt-4 font-grotesk text-[9px] uppercase tracking-[0.3em] text-white/35">Ship to</p>
                  <p>{{ order.calle }} {{ order.numero_ext_int }}</p>
                  <p>Col. {{ order.colonia }}, C.P. {{ order.codigo_postal }}</p>
                  <p>{{ order.localidad_ciudad }}, {{ order.estado }}</p>
                </div>

                <div>
                  <p class="mb-1 font-grotesk text-[9px] uppercase tracking-[0.3em] text-white/35">Items</p>
                  <ul class="flex flex-col gap-1">
                    <li
                      v-for="item in order.items"
                      :key="`${order.id}-${item.product_id}-${item.size}`"
                      class="font-grotesk text-[11px] tracking-wider text-white/70"
                    >
                      {{ item.name }} <span class="text-white/40">· {{ item.size }} · x{{ item.qty }}</span>
                    </li>
                  </ul>
                  <p class="mt-3 font-grotesk text-xs uppercase tracking-[0.2em] text-white">
                    Total: {{ formatPrice(order.total) }}
                  </p>
                </div>
              </div>

              <!-- Referencias siempre visibles para el repartidor -->
              <div class="mt-5 border-l-2 border-white/50 bg-white/[0.03] py-2 pl-4 pr-3">
                <p class="font-grotesk text-[9px] uppercase tracking-[0.3em] text-white/35">
                  Referencias de la vivienda
                </p>
                <p class="mt-1 font-grotesk text-[11px] leading-relaxed tracking-wide text-white/80">
                  {{ order.referencias_vivienda }}
                </p>
              </div>

              <!-- Guía de rastreo (visible una vez enviada) -->
              <div
                v-if="order.tracking_number"
                class="mt-4 flex flex-wrap items-baseline gap-x-4 gap-y-1 border border-white/10 px-4 py-2.5"
              >
                <p class="font-grotesk text-[9px] uppercase tracking-[0.3em] text-white/35">Guía</p>
                <p class="font-mono text-[11px] tracking-wider text-silver">{{ order.tracking_number }}</p>
                <a
                  v-if="order.tracking_url"
                  :href="order.tracking_url"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="font-grotesk text-[9px] uppercase tracking-[0.25em] text-white/50 underline underline-offset-4 transition-colors hover:text-silver"
                >
                  Track &rarr;
                </a>
              </div>

              <!-- PAID: capturar guía antes de marcar Shipped -->
              <template v-if="order.status === 'paid'">
                <div v-if="shippingCaptureId === order.id" class="mt-5 border border-silver/30 p-4">
                  <p class="font-grotesk text-[10px] uppercase tracking-[0.3em] text-silver">
                    Datos de env&iacute;o
                  </p>
                  <div class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <label class="block">
                      <span class="mb-2 block font-grotesk text-[9px] uppercase tracking-[0.25em] text-white/40">
                        N&uacute;mero de gu&iacute;a *
                      </span>
                      <input
                        v-model="trackingNumber"
                        type="text"
                        maxlength="120"
                        placeholder="EST-123456789-MX"
                        class="w-full border-b border-white/20 bg-transparent pb-2 font-mono text-xs tracking-wider text-white transition-colors duration-300 placeholder:text-white/20 focus:border-silver/60 focus:outline-none"
                      />
                    </label>
                    <label class="block">
                      <span class="mb-2 block font-grotesk text-[9px] uppercase tracking-[0.25em] text-white/40">
                        Link de rastreo (opcional)
                      </span>
                      <input
                        v-model="trackingUrl"
                        type="url"
                        maxlength="500"
                        placeholder="https://tracking.estafeta.com/..."
                        class="w-full border-b border-white/20 bg-transparent pb-2 font-mono text-xs tracking-wider text-white transition-colors duration-300 placeholder:text-white/20 focus:border-silver/60 focus:outline-none"
                      />
                    </label>
                  </div>
                  <p
                    v-if="trackingError"
                    role="alert"
                    class="mt-3 font-grotesk text-[10px] uppercase tracking-[0.2em] text-red-400"
                  >
                    {{ trackingError }}
                  </p>
                  <div class="mt-4 flex gap-3">
                    <button
                      type="button"
                      :disabled="updatingOrderId === order.id"
                      class="flex-1 border border-silver/50 py-2.5 font-grotesk text-[10px] uppercase tracking-[0.3em] text-silver transition-all duration-300 hover:bg-silver hover:text-black active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
                      @click="confirmShipment(order)"
                    >
                      {{ updatingOrderId === order.id ? 'Saving...' : 'Confirm shipment' }}
                    </button>
                    <button
                      type="button"
                      class="px-5 font-grotesk text-[10px] uppercase tracking-[0.25em] text-white/40 transition-colors hover:text-white"
                      @click="cancelShippingCapture"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
                <button
                  v-else
                  type="button"
                  :disabled="updatingOrderId === order.id"
                  class="mt-5 w-full border border-white/25 py-3 font-grotesk text-[10px] uppercase tracking-[0.35em] text-white/80 transition-all duration-300 hover:border-white hover:bg-white hover:text-black active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
                  @click="openShippingCapture(order)"
                >
                  Mark as Shipped
                </button>
              </template>

              <!-- SHIPPED: confirmación en dos pasos antes de Received -->
              <template v-else-if="order.status === 'shipped'">
                <div
                  v-if="confirmingReceiveId === order.id"
                  class="mt-5 flex flex-wrap items-center justify-between gap-3 border border-silver/30 px-4 py-3"
                >
                  <p class="font-grotesk text-[10px] uppercase tracking-[0.25em] text-silver">
                    &iquest;Confirmar que la orden fue entregada?
                  </p>
                  <div class="flex gap-3">
                    <button
                      type="button"
                      :disabled="updatingOrderId === order.id"
                      class="border border-silver/50 px-5 py-2 font-grotesk text-[10px] uppercase tracking-[0.25em] text-silver transition-all duration-300 hover:bg-silver hover:text-black disabled:opacity-40"
                      @click="handleReceive(order)"
                    >
                      {{ updatingOrderId === order.id ? '...' : 'Confirmar' }}
                    </button>
                    <button
                      type="button"
                      class="font-grotesk text-[10px] uppercase tracking-[0.25em] text-white/40 transition-colors hover:text-white"
                      @click="confirmingReceiveId = null"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
                <button
                  v-else
                  type="button"
                  :disabled="updatingOrderId === order.id"
                  class="mt-5 w-full border border-white/25 py-3 font-grotesk text-[10px] uppercase tracking-[0.35em] text-white/80 transition-all duration-300 hover:border-white hover:bg-white hover:text-black active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
                  @click="handleReceive(order)"
                >
                  Mark as Received
                </button>
              </template>
            </article>
          </div>

          <!-- Bloque 2: historial (received, últimas 100) -->
          <div class="mt-12 flex items-baseline justify-between border-b border-white/10 pb-3">
            <h3 class="font-grotesk text-[10px] uppercase tracking-[0.35em] text-white/60">
              Purchase History
            </h3>
            <p class="font-grotesk text-[9px] uppercase tracking-[0.25em] text-white/35">
              Last 100 &middot; {{ receivedOrders.length }} shown
            </p>
          </div>

          <p
            v-if="receivedOrders.length === 0"
            class="py-8 text-center font-grotesk text-xs uppercase tracking-[0.3em] text-white/40"
          >
            No completed orders yet.
          </p>

          <ul v-else class="divide-y divide-white/10">
            <li
              v-for="order in receivedOrders"
              :key="order.id"
              class="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-3"
            >
              <p class="font-grotesk text-[11px] uppercase tracking-[0.2em] text-white/70">
                #{{ shortOrderId(order.id) }}
                <span class="ml-2 normal-case text-white/40">{{ order.customer_email }}</span>
              </p>
              <p class="font-grotesk text-[10px] tracking-wider text-white/40">
                {{ formatOrderDate(order.created_at) }}
                <span class="ml-3 text-white/70">{{ formatPrice(order.total) }}</span>
              </p>
            </li>
          </ul>
        </template>
      </section>
    </main>

    <Footer />
  </div>
</template>
