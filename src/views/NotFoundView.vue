<template>
  <div class="flex min-h-screen flex-col bg-black text-white">
    <Navbar />

    <main class="flex flex-1 flex-col items-center justify-center px-6 py-20 text-center">
      <p class="font-grotesk text-[10px] uppercase tracking-[0.5em] text-silver/40">404</p>

      <h1 class="mt-6 font-display text-4xl font-medium uppercase tracking-[0.2em] sm:text-5xl">
        Lost in the dark
      </h1>

      <span
        class="mt-8 block h-px w-24"
        style="background: linear-gradient(90deg, transparent, rgba(201, 208, 214, 0.5), transparent)"
      ></span>

      <p class="mt-8 max-w-sm font-grotesk text-[11px] leading-relaxed tracking-wide text-white/45">
        The page you seek does not exist in the archive &mdash; or never did.
      </p>

      <router-link
        to="/"
        class="mt-12 border border-white/25 px-10 py-3.5 font-grotesk text-[10px] uppercase tracking-[0.35em] text-white/80 transition-colors hover:border-silver/80 hover:text-silver"
      >
        Return to the maison
      </router-link>
    </main>

    <Footer />
  </div>
</template>

<script setup>
import Navbar from '../components/Navbar.vue'
import Footer from '../components/Footer.vue'
</script>
