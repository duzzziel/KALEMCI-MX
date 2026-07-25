<script setup>
import { cardImage } from '../lib/images'

const props = defineProps({
  product: {
    type: Object,
    required: true,
  },
})

function formatPrice(value) {
  return `$${value.toFixed(2)}`
}

// Si la variante -card.webp no existe (producto nuevo sin derivado),
// se regresa al JPG original — la tarjeta jamás queda rota.
function fallback(event, original) {
  if (original && event.target.src !== original) event.target.src = original
}
</script>

<template>
  <article class="group">
    <router-link :to="`/product/${product.id}`" class="block">
      <!-- aspect-ratio rígido + object-top: el encuadre nunca "salta" en
           móvil y la prenda/modelo siempre entra desde arriba, sin
           recortes caprichosos por abajo-centro -->
      <div class="relative aspect-[3/4] w-full overflow-hidden bg-white/5">
        <img
          :src="cardImage(product.image)"
          :alt="product.name"
          loading="lazy"
          decoding="async"
          class="absolute inset-0 h-full w-full object-cover object-top transition-all duration-700 ease-out group-hover:scale-[1.04]"
          @error="fallback($event, product.image)"
        />
        <img
          :src="cardImage(product.hoverImage)"
          :alt="product.name"
          loading="lazy"
          decoding="async"
          class="absolute inset-0 h-full w-full object-cover object-top opacity-0 transition-all duration-700 ease-out group-hover:scale-[1.04] group-hover:opacity-100"
          @error="fallback($event, product.hoverImage)"
        />
      </div>

      <div class="mt-3 flex items-baseline justify-between gap-2 font-grotesk text-[11px] uppercase tracking-wider text-white">
        <span class="transition-colors group-hover:text-silver">{{ product.name }}</span>
        <span class="whitespace-nowrap text-silver/60">{{ formatPrice(product.price) }}</span>
      </div>
    </router-link>
  </article>
</template>
