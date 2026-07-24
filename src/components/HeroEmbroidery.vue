<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'

// Ornamento de "bordado en vivo": vides/hojas trazadas a mano en dos
// esquinas opuestas del Hero (top-left + bottom-right, la misma pieza
// rotada 180° para simetría diagonal exacta). Se dibujan con
// stroke-dashoffset sobre pathLength="1" — normaliza la longitud del
// trazo a 1, así que no hace falta medir cada curva en JS; el navegador
// hace la interpolación. Tallo primero, luego hojas y florituras en
// stagger, y un brillo final que asienta la opacidad en reposo (~35%)
// para no competir con las fotos de producto.
//
// Idle state (tras el trazo inicial): un destello recorre el tallo en
// loop (misma técnica pathLength, dash corto viajando), el grupo
// respira con un translateY/rotate ínfimo, y el conjunto reacciona al
// cursor con un paralaje sutil — todo vía transform/opacity para no
// tocar layout.
defineProps({
  revealed: {
    type: Boolean,
    default: false,
  },
})

const reduceMotion =
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

const vineTL = ref(null)
const vineBR = ref(null)
let ticking = false

// Paralaje: desplazamiento minúsculo (±7px) proporcional a la posición
// del cursor respecto al centro de la ventana. rAF-throttled como en
// LuxeBackdrop — un solo listener pasivo, nunca más de un cálculo por frame.
function onMouseMove(event) {
  if (ticking) return
  ticking = true
  requestAnimationFrame(() => {
    const nx = event.clientX / window.innerWidth - 0.5
    const ny = event.clientY / window.innerHeight - 0.5
    const translate = `translate(${(nx * 14).toFixed(2)}px, ${(ny * 14).toFixed(2)}px)`
    if (vineTL.value) vineTL.value.style.transform = translate
    if (vineBR.value) vineBR.value.style.transform = translate
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
  <div class="embroidery pointer-events-none absolute inset-0" :class="{ 'is-revealed': revealed }" aria-hidden="true">
    <div class="vine-slot vine-slot-tl">
      <div class="vine-arrive">
      <svg ref="vineTL" class="vine" viewBox="0 0 200 260" fill="none">
        <g class="vine-group">
          <path
            class="vine-path vine-stem"
            path-length="1"
            d="M6,6 C34,-4 62,6 66,32 C70,58 46,74 26,66 C12,60 10,46 22,42 C30,39 36,45 34,52 C62,46 92,62 100,90 C108,116 90,140 66,146 C50,150 36,144 36,132 C44,124 54,128 54,138 C78,140 100,158 106,184 C112,208 98,230 76,238"
          />
          <path
            class="vine-path vine-leaf"
            path-length="1"
            d="M64,22 C74,10 86,2 100,2 C90,16 78,24 64,22 Z"
          />
          <path
            class="vine-path vine-leaf"
            path-length="1"
            d="M98,94 C110,80 124,74 138,76 C126,90 112,98 98,94 Z"
          />
          <path
            class="vine-path vine-leaf"
            path-length="1"
            d="M68,148 C56,160 42,168 28,166 C40,154 54,146 68,148 Z"
          />
          <path
            class="vine-path vine-leaf vine-leaf-corner"
            path-length="1"
            d="M10,8 C4,-2 -6,-6 -14,0 C-6,10 4,14 10,8 Z"
          />
          <path
            class="vine-path vine-tendril"
            path-length="1"
            d="M108,26 C118,20 120,8 110,4 C102,0 94,6 96,14"
          />
          <!-- Idle shimmer: un dash corto recorre el tallo en loop una vez
               que el trazo inicial terminó — misma técnica pathLength. -->
          <path
            class="vine-path vine-shimmer"
            path-length="1"
            d="M6,6 C34,-4 62,6 66,32 C70,58 46,74 26,66 C12,60 10,46 22,42 C30,39 36,45 34,52 C62,46 92,62 100,90 C108,116 90,140 66,146 C50,150 36,144 36,132 C44,124 54,128 54,138 C78,140 100,158 106,184 C112,208 98,230 76,238"
          />
        </g>
      </svg>
      </div>
    </div>

    <div class="vine-slot vine-slot-br">
      <div class="vine-arrive">
      <svg ref="vineBR" class="vine" viewBox="0 0 200 260" fill="none">
        <g class="vine-group">
          <path
            class="vine-path vine-stem"
            path-length="1"
            d="M6,6 C34,-4 62,6 66,32 C70,58 46,74 26,66 C12,60 10,46 22,42 C30,39 36,45 34,52 C62,46 92,62 100,90 C108,116 90,140 66,146 C50,150 36,144 36,132 C44,124 54,128 54,138 C78,140 100,158 106,184 C112,208 98,230 76,238"
          />
          <path
            class="vine-path vine-leaf"
            path-length="1"
            d="M64,22 C74,10 86,2 100,2 C90,16 78,24 64,22 Z"
          />
          <path
            class="vine-path vine-leaf"
            path-length="1"
            d="M98,94 C110,80 124,74 138,76 C126,90 112,98 98,94 Z"
          />
          <path
            class="vine-path vine-leaf"
            path-length="1"
            d="M68,148 C56,160 42,168 28,166 C40,154 54,146 68,148 Z"
          />
          <path
            class="vine-path vine-leaf vine-leaf-corner"
            path-length="1"
            d="M10,8 C4,-2 -6,-6 -14,0 C-6,10 4,14 10,8 Z"
          />
          <path
            class="vine-path vine-tendril"
            path-length="1"
            d="M108,26 C118,20 120,8 110,4 C102,0 94,6 96,14"
          />
          <path
            class="vine-path vine-shimmer"
            path-length="1"
            d="M6,6 C34,-4 62,6 66,32 C70,58 46,74 26,66 C12,60 10,46 22,42 C30,39 36,45 34,52 C62,46 92,62 100,90 C108,116 90,140 66,146 C50,150 36,144 36,132 C44,124 54,128 54,138 C78,140 100,158 106,184 C112,208 98,230 76,238"
          />
        </g>
      </svg>
      </div>
    </div>
  </div>
</template>

<style scoped>
.embroidery {
  overflow: hidden;
}

/* Slot: posición fija en la esquina + (en BR) la rotación 180° estática.
   Separado del <svg> para que el paralaje JS (transform inline sobre el
   svg) nunca choque con esta transform de CSS. */
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

/* Llegada: la rama recorre un par de puntos del Hero antes de acomodarse
   en su posición final (0,0 = donde ya la deja el slot). Vive en su
   propio wrapper para no chocar con el paralaje (transform inline, JS)
   ni con la rotación estática del slot BR — cada capa mueve una sola cosa. */
.vine-arrive {
  width: 100%;
  height: 100%;
  opacity: 0;
  transform: translate(55%, 45%) scale(0.82);
  will-change: transform, opacity;
}

.is-revealed .vine-arrive {
  animation: vine-arrive 1.6s cubic-bezier(0.25, 1, 0.5, 1) 0ms forwards;
}

@keyframes vine-arrive {
  0% {
    transform: translate(55%, 45%) scale(0.82);
    opacity: 0.35;
  }
  35% {
    transform: translate(20%, 70%) scale(0.9);
    opacity: 0.7;
  }
  65% {
    transform: translate(60%, 15%) scale(0.95);
    opacity: 0.85;
  }
  100% {
    transform: translate(0%, 0%) scale(1);
    opacity: 1;
  }
}

.vine {
  display: block;
  width: 100%;
  height: 100%;
  transition: transform 0.9s cubic-bezier(0.16, 1, 0.3, 1);
  will-change: transform;
}

.vine-path {
  fill: none;
  stroke: rgba(201, 208, 214, 0.75);
  stroke-width: 1.3;
  stroke-linecap: round;
  stroke-linejoin: round;
  vector-effect: non-scaling-stroke;
  stroke-dasharray: 1;
  stroke-dashoffset: 1;
}

.vine-group {
  opacity: 1;
  transform-box: fill-box;
  transform-origin: center;
}

/* Destello de plata: dash corto que recorre el tallo en loop continuo,
   solo tras terminar el trazo inicial + el brillo de asentado. */
.vine-shimmer {
  stroke: rgba(255, 255, 255, 0.95);
  stroke-width: 1.5;
  stroke-dasharray: 0.05 1;
  filter: drop-shadow(0 0 2px rgba(255, 255, 255, 0.55));
}

/* --- Bordado en vivo: tallo primero, luego hojas y florituras --- */
.is-revealed .vine-stem {
  animation: vine-draw 1.6s cubic-bezier(0.25, 1, 0.5, 1) 0ms forwards;
}

.is-revealed .vine-leaf:nth-of-type(2) {
  animation: vine-draw 0.55s cubic-bezier(0.25, 1, 0.5, 1) 500ms forwards;
}

.is-revealed .vine-leaf:nth-of-type(3) {
  animation: vine-draw 0.55s cubic-bezier(0.25, 1, 0.5, 1) 750ms forwards;
}

.is-revealed .vine-leaf:nth-of-type(4) {
  animation: vine-draw 0.55s cubic-bezier(0.25, 1, 0.5, 1) 1000ms forwards;
}

.is-revealed .vine-leaf-corner {
  animation: vine-draw 0.5s cubic-bezier(0.25, 1, 0.5, 1) 1150ms forwards;
}

.is-revealed .vine-tendril {
  animation: vine-draw 0.5s cubic-bezier(0.25, 1, 0.5, 1) 1300ms forwards;
}

@keyframes vine-draw {
  to {
    stroke-dashoffset: 0;
  }
}

/* Brillo final: la puntada completa destella y luego la pieza entera se
   asienta en ~35% de opacidad para quedar como acento, no protagonista.
   Se combina con la respiración continua (transform) — propiedades
   distintas, cero conflicto entre ambas animaciones. */
.is-revealed .vine-group {
  animation:
    vine-settle 0.85s ease-out 1750ms forwards,
    vine-breathe 9s ease-in-out 2600ms infinite;
}

@keyframes vine-breathe {
  0%,
  100% {
    transform: translateY(0) rotate(0deg);
  }
  50% {
    transform: translateY(-3px) rotate(0.4deg);
  }
}

/* Idle shimmer: arranca justo cuando termina el destello de asentado */
.is-revealed .vine-shimmer {
  animation: vine-shimmer-travel 7s linear 2700ms infinite;
}

@keyframes vine-shimmer-travel {
  from {
    stroke-dashoffset: 1;
  }
  to {
    stroke-dashoffset: -1.05;
  }
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

/* Móvil: menos trazos, línea más fina, sin destello continuo — evita
   saturar el encuadre y ahorra batería en pantallas chicas. */
@media (max-width: 767px) {
  .vine-slot {
    width: clamp(80px, 26vw, 130px);
  }

  .vine-path {
    stroke-width: 1;
  }

  .vine-tendril,
  .vine-leaf-corner,
  .vine-shimmer {
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

  .vine-shimmer {
    opacity: 0;
  }

  .vine {
    transition: none;
  }

  .vine-arrive {
    opacity: 1;
    transform: none;
  }

  .is-revealed .vine-stem,
  .is-revealed .vine-leaf:nth-of-type(2),
  .is-revealed .vine-leaf:nth-of-type(3),
  .is-revealed .vine-leaf:nth-of-type(4),
  .is-revealed .vine-leaf-corner,
  .is-revealed .vine-tendril,
  .is-revealed .vine-shimmer,
  .is-revealed .vine-group,
  .is-revealed .vine-arrive {
    animation: none;
  }
}
</style>
