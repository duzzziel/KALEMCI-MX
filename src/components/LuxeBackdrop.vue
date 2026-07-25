<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'

// Aura interactiva: un resplandor plateado sigue al cursor con inercia
// pesada (el CSS transition hace el easing). Con prefers-reduced-motion
// no se anima nada. La apertura del Hero la llevan ahora las ramas de
// HeroEmbroidery.vue, no esta capa.
const reduceMotion =
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

const mouseGlow = ref(null)
let ticking = false

function onMouseMove(event) {
  if (ticking || !mouseGlow.value) return
  ticking = true
  requestAnimationFrame(() => {
    if (mouseGlow.value) {
      mouseGlow.value.style.transform = `translate(${event.clientX}px, ${event.clientY}px) translate(-50%, -50%)`
    }
    ticking = false
  })
}

onMounted(() => {
  if (!reduceMotion) window.addEventListener('mousemove', onMouseMove, { passive: true })
})

onBeforeUnmount(() => {
  window.removeEventListener('mousemove', onMouseMove)
})
</script>

<template>
  <div class="pointer-events-none absolute inset-0 overflow-hidden bg-black" aria-hidden="true">
    <!-- Aura plateada tras el logo: la "luz de vitrina" Ice Palace -->
    <div
      class="absolute left-1/2 top-1/2 h-[130vh] w-[130vh] -translate-x-1/2 -translate-y-1/2"
      style="background: radial-gradient(circle, rgba(201, 208, 214, 0.14) 0%, rgba(201, 208, 214, 0.05) 40%, transparent 66%)"
    ></div>

    <!-- Segundo halo azul desplazado: rompe la simetría y aporta el matiz
         Blue Depths sin tocar la zona del logo. Tamaño y tinte viven en la
         clase (no inline) para poder recortarlos en móvil, donde 90vh
         cubriría la pantalla entera y teñiría todo el hero de azul. -->
    <div class="luxe-glow absolute" style="top: -25%; right: -12%"></div>

    <!-- Residuo interactivo: aura tenue que persigue al cursor con retardo -->
    <div
      v-if="!reduceMotion"
      ref="mouseGlow"
      class="mouse-glow fixed left-0 top-0 h-[55vh] w-[55vh]"
      style="transform: translate(50vw, 50vh) translate(-50%, -50%)"
    ></div>

    <!-- Grano fino: mata el banding de los degradados y da textura de tela -->
    <svg class="absolute inset-0 h-full w-full opacity-[0.05]">
      <filter id="luxe-grain">
        <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" stitchTiles="stitch" />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="100%" height="100%" filter="url(#luxe-grain)" />
    </svg>

    <!-- Viñeta inferior para que los CTA recorten siempre -->
    <div class="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black via-black/60 to-transparent"></div>
  </div>
</template>

<style scoped>
.luxe-glow {
  width: 90vh;
  height: 90vh;
  background: radial-gradient(circle, rgba(38, 48, 86, 0.5) 0%, transparent 62%);
  animation: luxe-breathe 9s ease-in-out infinite alternate;
}

/* Móvil: el halo azul se encoge y atenúa — acento de esquina, no tinte
   de pantalla completa (en iOS el gamut amplio lo saturaba aún más) */
@media (max-width: 767px) {
  .luxe-glow {
    width: 55vh;
    height: 55vh;
    background: radial-gradient(circle, rgba(38, 48, 86, 0.24) 0%, transparent 55%);
  }
}

/* Respiración casi imperceptible del halo — vida sin distracción */
@keyframes luxe-breathe {
  from {
    opacity: 0.65;
    transform: scale(1);
  }
  to {
    opacity: 1;
    transform: scale(1.06);
  }
}

/* Aura que sigue al cursor: el transition de 1.4s le da la inercia etérea */
.mouse-glow {
  background: radial-gradient(circle, rgba(201, 208, 214, 0.06) 0%, transparent 60%);
  transition: transform 1.4s cubic-bezier(0.16, 1, 0.3, 1);
  will-change: transform;
}

@media (prefers-reduced-motion: reduce) {
  .luxe-glow,
  .mouse-glow {
    animation: none;
    transition: none;
  }
}
</style>
