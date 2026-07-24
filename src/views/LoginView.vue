<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Navbar from '../components/Navbar.vue'
import Footer from '../components/Footer.vue'
import { supabase } from '../supabase'
import { getAdminSession } from '../lib/adminAuth'

const route = useRoute()
const router = useRouter()

const email = ref('')
const password = ref('')
const submitting = ref(false)
const errorMessage = ref('')

function redirectTarget() {
  const target = route.query.redirect
  // Solo rutas internas: un redirect arbitrario permitiría open-redirect
  // hacia un dominio externo tras un login exitoso.
  return typeof target === 'string' && target.startsWith('/') && !target.startsWith('//')
    ? target
    : '/admin'
}

onMounted(async () => {
  // Si ya hay sesión de admin válida, no tiene sentido mostrar el login.
  if (await getAdminSession()) router.replace(redirectTarget())
})

async function handleSubmit() {
  if (submitting.value) return
  errorMessage.value = ''

  if (!supabase) {
    errorMessage.value = 'Service unavailable.'
    return
  }

  const credentials = { email: email.value.trim(), password: password.value }

  // Los campos se limpian de inmediato: la contraseña no permanece en el
  // estado reactivo (ni en el DOM) mientras la petición está en vuelo.
  email.value = ''
  password.value = ''

  if (!credentials.email || !credentials.password) {
    errorMessage.value = 'Invalid credentials.'
    return
  }

  submitting.value = true
  try {
    const { error } = await supabase.auth.signInWithPassword(credentials)

    if (error) {
      // Mensaje genérico deliberado: no distinguimos "correo no existe" de
      // "contraseña incorrecta" para no facilitar enumeración de usuarios.
      errorMessage.value = 'Invalid credentials.'
      return
    }

    // El navigation guard revalida la sesión y la lista blanca al entrar a
    // /admin; si el usuario autenticado no es admin, lo expulsa y cierra
    // la sesión. Aquí no se decide nada de autorización.
    router.push(redirectTarget())
  } catch {
    errorMessage.value = 'Invalid credentials.'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="flex min-h-screen flex-col bg-black text-white">
    <Navbar />

    <main class="flex flex-1 items-center justify-center px-6 py-16">
      <div class="w-full max-w-sm">
        <h1 class="font-display text-2xl font-semibold uppercase tracking-[0.25em]">Access</h1>
        <p class="mt-2 font-grotesk text-[9px] uppercase tracking-[0.35em] text-white/35">
          Restricted area &mdash; Kalemci Archives
        </p>

        <form class="mt-10 flex flex-col gap-6" @submit.prevent="handleSubmit">
          <label class="block">
            <span class="mb-2 block font-grotesk text-[10px] uppercase tracking-[0.3em] text-white/40">Email</span>
            <input
              v-model="email"
              type="email"
              autocomplete="username"
              class="w-full border-b border-white/20 bg-transparent pb-2 font-grotesk text-xs tracking-wider text-white transition-colors duration-300 placeholder:text-white/20 focus:border-silver/60 focus:outline-none"
              placeholder="you@domain.com"
            />
          </label>

          <label class="block">
            <span class="mb-2 block font-grotesk text-[10px] uppercase tracking-[0.3em] text-white/40">Password</span>
            <input
              v-model="password"
              type="password"
              autocomplete="current-password"
              class="w-full border-b border-white/20 bg-transparent pb-2 font-grotesk text-xs tracking-wider text-white transition-colors duration-300 placeholder:text-white/20 focus:border-silver/60 focus:outline-none"
              placeholder="••••••••"
            />
          </label>

          <p
            v-if="errorMessage"
            role="alert"
            class="font-grotesk text-[10px] uppercase tracking-[0.25em] text-red-400"
          >
            {{ errorMessage }}
          </p>

          <button
            type="submit"
            :disabled="submitting"
            class="mt-2 w-full bg-white py-3.5 font-grotesk text-xs font-semibold uppercase tracking-[0.35em] text-black transition-all duration-300 ease-out hover:bg-silver active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {{ submitting ? 'Verifying...' : 'Sign In' }}
          </button>
        </form>
      </div>
    </main>

    <Footer />
  </div>
</template>
