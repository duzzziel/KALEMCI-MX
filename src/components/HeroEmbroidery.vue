<script setup>
// Ornamento de "bordado en vivo" en tres actos:
//
//   1. NACIMIENTO — bajo el bloque central del Hero (justo donde la
//      hairline crece), un pulso de luz siembra dos zarcillos.
//   2. RECORRIDO — cada zarcillo viaja como un cometa de hilo plateado
//      hacia su esquina (top-left / bottom-right) bordeando los márgenes,
//      sin cruzar jamás el wordmark, tagline ni botones. Es un dash corto
//      viajando sobre el path (misma técnica pathLength=1), no una línea
//      persistente: al llegar se desvanece por completo.
//   3. FLORACIÓN — al aterrizar el zarcillo, el bordado de esa esquina
//      crece desde su base (stroke-dashoffset), remata con un destello
//      y se asienta ESTÁTICO en ~38% de opacidad. Después de eso, nada
//      vuelve a moverse y el centro queda limpio.
//
// Todo es stroke-dashoffset / transform / opacity — cero layout, CLS 0.
defineProps({
  revealed: {
    type: Boolean,
    default: false,
  },
})
</script>

<template>
  <div class="embroidery pointer-events-none absolute inset-0" :class="{ 'is-revealed': revealed }" aria-hidden="true">
    <!-- Acto 1 y 2: semilla + zarcillos viajeros. viewBox normalizado a
         porcentaje (0-1000) con preserveAspectRatio="none": las rutas se
         adaptan a cualquier proporción de pantalla. Los trazos usan
         vector-effect para mantener su grosor real. -->
    <svg class="runner" viewBox="0 0 1000 1000" preserveAspectRatio="none" fill="none">
      <circle class="seed" cx="500" cy="690" r="3" />
      <!-- Sin vector-effect: con preserveAspectRatio="none" el non-scaling-
           stroke calcula los dashes en espacio de pantalla y rompe la
           normalización de pathLength (aparecen segmentos repetidos). El
           grosor va en unidades del viewBox y escala con la pantalla. -->
      <path
        class="runner-path runner-tl"
        pathLength="1"
        d="M500,690 C380,720 240,715 160,640 C90,560 45,300 25,35"
      />
      <path
        class="runner-path runner-br"
        pathLength="1"
        d="M500,690 C600,730 720,720 810,750 C890,780 935,845 960,895"
      />
    </svg>

    <!-- Acto 3: los bordados de esquina (florecen cuando llega el zarcillo) -->
    <div class="vine-slot vine-slot-tl">
      <svg class="vine" viewBox="0 0 200 260" fill="none">
        <g class="vine-group">
          <path
            class="vine-path vine-stem"
            pathLength="1"
            d="M6,6 C34,-4 62,6 66,32 C70,58 46,74 26,66 C12,60 10,46 22,42 C30,39 36,45 34,52 C62,46 92,62 100,90 C108,116 90,140 66,146 C50,150 36,144 36,132 C44,124 54,128 54,138 C78,140 100,158 106,184 C112,208 98,230 76,238"
          />
          <path
            class="vine-path vine-leaf vine-leaf-a"
            pathLength="1"
            d="M64,22 C74,10 86,2 100,2 C90,16 78,24 64,22 Z"
          />
          <path
            class="vine-path vine-leaf vine-leaf-b"
            pathLength="1"
            d="M98,94 C110,80 124,74 138,76 C126,90 112,98 98,94 Z"
          />
          <path
            class="vine-path vine-leaf vine-leaf-c"
            pathLength="1"
            d="M68,148 C56,160 42,168 28,166 C40,154 54,146 68,148 Z"
          />
          <path
            class="vine-path vine-leaf vine-leaf-corner"
            pathLength="1"
            d="M10,8 C4,-2 -6,-6 -14,0 C-6,10 4,14 10,8 Z"
          />
          <path
            class="vine-path vine-tendril"
            pathLength="1"
            d="M108,26 C118,20 120,8 110,4 C102,0 94,6 96,14"
          />
        </g>
      </svg>
    </div>

    <div class="vine-slot vine-slot-br">
      <svg class="vine" viewBox="0 0 200 260" fill="none">
        <g class="vine-group">
          <path
            class="vine-path vine-stem"
            pathLength="1"
            d="M6,6 C34,-4 62,6 66,32 C70,58 46,74 26,66 C12,60 10,46 22,42 C30,39 36,45 34,52 C62,46 92,62 100,90 C108,116 90,140 66,146 C50,150 36,144 36,132 C44,124 54,128 54,138 C78,140 100,158 106,184 C112,208 98,230 76,238"
          />
          <path
            class="vine-path vine-leaf vine-leaf-a"
            pathLength="1"
            d="M64,22 C74,10 86,2 100,2 C90,16 78,24 64,22 Z"
          />
          <path
            class="vine-path vine-leaf vine-leaf-b"
            pathLength="1"
            d="M98,94 C110,80 124,74 138,76 C126,90 112,98 98,94 Z"
          />
          <path
            class="vine-path vine-leaf vine-leaf-c"
            pathLength="1"
            d="M68,148 C56,160 42,168 28,166 C40,154 54,146 68,148 Z"
          />
          <path
            class="vine-path vine-leaf vine-leaf-corner"
            pathLength="1"
            d="M10,8 C4,-2 -6,-6 -14,0 C-6,10 4,14 10,8 Z"
          />
          <path
            class="vine-path vine-tendril"
            pathLength="1"
            d="M108,26 C118,20 120,8 110,4 C102,0 94,6 96,14"
          />
        </g>
      </svg>
    </div>
  </div>
</template>

<style scoped>
.embroidery {
  overflow: hidden;
  /* stroke-dashoffset repinta por naturaleza (es la técnica del trazo);
     contain confina esa invalidación a esta capa — el resto del hero
     (texto, backdrop) no participa en los repintados del bordado. */
  contain: strict;
}

/* ============ Acto 1: la semilla ============ */
.runner {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.seed {
  fill: rgba(220, 228, 235, 0.9);
  opacity: 0;
  transform-box: fill-box;
  transform-origin: center;
}

.is-revealed .seed {
  animation: seed-pulse 0.75s ease-out 750ms forwards;
}

@keyframes seed-pulse {
  0% {
    opacity: 0;
    transform: scale(0.4);
  }
  35% {
    opacity: 0.9;
  }
  100% {
    opacity: 0;
    transform: scale(3.2);
  }
}

/* ============ Acto 2: zarcillos viajeros ============ */
/* Cometa: un dash corto (8.5% del recorrido) que viaja del centro a la
   esquina desplazando el dashoffset. La opacidad lo enciende al partir
   y lo disuelve al aterrizar — nunca queda línea residual. */
/* El gap (1.2) excede la longitud normalizada del path (1): así jamás
   aparece una repetición del dash dentro del tramo visible, ni las tapas
   redondeadas asoman como puntos sueltos en los extremos. */
.runner-path {
  stroke: rgba(214, 222, 229, 0.9);
  stroke-width: 1.3;
  stroke-linecap: round;
  stroke-dasharray: 0.085 1.2;
  stroke-dashoffset: 0.085;
  opacity: 0;
  filter: drop-shadow(0 0 3px rgba(201, 208, 214, 0.6));
}

.is-revealed .runner-tl {
  animation:
    runner-travel 1.15s cubic-bezier(0.45, 0.05, 0.55, 0.95) 850ms forwards,
    runner-fade 1.5s linear 850ms forwards;
}

.is-revealed .runner-br {
  animation:
    runner-travel 1.15s cubic-bezier(0.45, 0.05, 0.55, 0.95) 970ms forwards,
    runner-fade 1.5s linear 970ms forwards;
}

@keyframes runner-travel {
  from {
    stroke-dashoffset: 0.085;
  }
  to {
    stroke-dashoffset: -0.915;
  }
}

@keyframes runner-fade {
  0% {
    opacity: 0;
  }
  10% {
    opacity: 1;
  }
  76% {
    opacity: 1;
  }
  100% {
    opacity: 0;
  }
}

/* ============ Acto 3: floración de esquina ============ */
.vine-slot {
  position: absolute;
  width: clamp(120px, 15vw, 210px);
  aspect-ratio: 200 / 260;
}

.vine-slot-tl {
  top: 0;
  left: 0;
}

.vine-slot-br {
  bottom: 0;
  right: 0;
  transform: rotate(180deg);
}

.vine {
  display: block;
  width: 100%;
  height: 100%;
}

/* Mismo criterio anti-puntos: gap 1.2 > 1 y offset inicial 1.1 dejan las
   tapas redondeadas 10% fuera del tramo visible mientras está oculto. */
.vine-path {
  fill: none;
  stroke: rgba(201, 208, 214, 0.75);
  stroke-width: 1.3;
  stroke-linecap: round;
  stroke-linejoin: round;
  vector-effect: non-scaling-stroke;
  stroke-dasharray: 1 1.2;
  stroke-dashoffset: 1.1;
}

.vine-group {
  opacity: 1;
}

/* Crecimiento: arranca cuando el zarcillo aterriza en la esquina
   (~2000ms tras el reveal). Tallo primero, hojas y filigrana en cascada,
   curva líquida. "forwards" deja todo fijo — estático de ahí en más. */
.is-revealed .vine-stem {
  animation: vine-draw 1.8s cubic-bezier(0.16, 1, 0.3, 1) 1950ms forwards;
}

.is-revealed .vine-leaf-a {
  animation: vine-draw 0.45s cubic-bezier(0.16, 1, 0.3, 1) 2500ms forwards;
}

.is-revealed .vine-leaf-b {
  animation: vine-draw 0.45s cubic-bezier(0.16, 1, 0.3, 1) 2750ms forwards;
}

.is-revealed .vine-leaf-c {
  animation: vine-draw 0.45s cubic-bezier(0.16, 1, 0.3, 1) 3000ms forwards;
}

.is-revealed .vine-leaf-corner {
  animation: vine-draw 0.4s cubic-bezier(0.16, 1, 0.3, 1) 3200ms forwards;
}

.is-revealed .vine-tendril {
  animation: vine-draw 0.4s cubic-bezier(0.16, 1, 0.3, 1) 3350ms forwards;
}

@keyframes vine-draw {
  to {
    stroke-dashoffset: 0;
  }
}

/* Destello final + asentado en ~38%: el punto final del relato.
   Ninguna animación corre después de esto. */
.is-revealed .vine-group {
  animation: vine-settle 0.7s ease-out 3800ms forwards;
}

@keyframes vine-settle {
  0% {
    opacity: 1;
    filter: brightness(1) drop-shadow(0 0 0 rgba(201, 208, 214, 0));
  }
  45% {
    opacity: 1;
    filter: brightness(1.9) drop-shadow(0 0 7px rgba(201, 208, 214, 0.75));
  }
  100% {
    opacity: 0.38;
    filter: brightness(1) drop-shadow(0 0 0 rgba(201, 208, 214, 0));
  }
}

/* Móvil: menos trazos y líneas más finas — sin saturar el encuadre */
@media (max-width: 767px) {
  .vine-slot {
    width: clamp(80px, 26vw, 130px);
  }

  .vine-path {
    stroke-width: 1;
  }

  .runner-path {
    stroke-width: 1.1;
  }

  .vine-tendril,
  .vine-leaf-corner {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .vine-path {
    stroke-dashoffset: 0;
  }

  .vine-group {
    opacity: 0.38;
  }

  .seed,
  .runner-path {
    opacity: 0;
  }

  .is-revealed .seed,
  .is-revealed .runner-tl,
  .is-revealed .runner-br,
  .is-revealed .vine-stem,
  .is-revealed .vine-leaf-a,
  .is-revealed .vine-leaf-b,
  .is-revealed .vine-leaf-c,
  .is-revealed .vine-leaf-corner,
  .is-revealed .vine-tendril,
  .is-revealed .vine-group {
    animation: none;
  }
}
</style>
