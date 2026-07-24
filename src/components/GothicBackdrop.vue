<script setup>
// Cuervos posicionados sobre la zona de las agujas de la fotografía
// (tercio superior). Duraciones/retrasos distintos para que no se muevan
// en sincronía.
const crows = [
  { top: '9%', left: '28%', scale: 1, duration: '12s', delay: '0s' },
  { top: '6%', left: '52%', scale: 0.7, duration: '15s', delay: '-4s' },
  { top: '16%', left: '40%', scale: 0.85, duration: '10s', delay: '-7s' },
  { top: '12%', left: '66%', scale: 1.15, duration: '13s', delay: '-2s' },
  { top: '20%', left: '75%', scale: 0.6, duration: '16s', delay: '-9s' },
  { top: '25%', left: '18%', scale: 0.75, duration: '14s', delay: '-11s' },
]
</script>

<template>
  <div class="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
    <!-- Catedral gótica (autohospedada en /public — sin dependencia externa).
         Foto: Klim Musalimov, Unsplash (licencia libre). -->
    <img
      src="/hero-cathedral.jpg"
      alt=""
      class="absolute inset-0 h-full w-full object-cover grayscale contrast-125 brightness-[0.6]"
      style="object-position: center 18%"
    />

    <!-- Velo: más denso en el centro-inferior para que el logo y los botones
         blancos siempre recorten sobre la piedra. -->
    <div class="absolute inset-0 bg-gradient-to-b from-black/45 via-black/40 to-black/85"></div>

    <!-- Cuervos alrededor de las agujas -->
    <svg
      v-for="(crow, index) in crows"
      :key="index"
      class="crow absolute"
      :style="{
        top: crow.top,
        left: crow.left,
        width: `${16 * crow.scale}px`,
        animationDuration: crow.duration,
        animationDelay: crow.delay,
      }"
      viewBox="0 0 16 6"
      fill="#0b0b0b"
    >
      <path d="M0 3 C3 -1 6 -1 8 2 C10 -1 13 -1 16 3 C13 1 10 1 8 4 C6 1 3 1 0 3 Z" />
    </svg>
  </div>
</template>

<style scoped>
.crow {
  animation-name: crow-drift;
  animation-timing-function: ease-in-out;
  animation-iteration-count: infinite;
  animation-direction: alternate;
}

/* Deriva sutil: planean sin llamar demasiado la atención */
@keyframes crow-drift {
  0% {
    translate: 0 0;
  }
  25% {
    translate: 22px -12px;
  }
  50% {
    translate: 46px 5px;
  }
  75% {
    translate: 24px 15px;
  }
  100% {
    translate: -8px -8px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .crow {
    animation: none;
  }
}
</style>
