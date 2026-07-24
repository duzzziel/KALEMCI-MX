<script setup>
const props = defineProps({
  product: {
    type: Object,
    required: true,
  },
})

function formatPrice(value) {
  return `$${value.toFixed(2)}`
}
</script>

<template>
  <article class="group">
    <router-link :to="`/product/${product.id}`" class="block">
      <div class="relative aspect-[3/4] w-full overflow-hidden bg-white/5">
        <img
          :src="product.image"
          :alt="product.name"
          loading="lazy"
          decoding="async"
          class="absolute inset-0 h-full w-full object-cover transition-all duration-700 ease-out group-hover:scale-[1.04]"
        />
        <img
          :src="product.hoverImage"
          :alt="product.name"
          loading="lazy"
          decoding="async"
          class="absolute inset-0 h-full w-full object-cover opacity-0 transition-all duration-700 ease-out group-hover:scale-[1.04] group-hover:opacity-100"
        />
      </div>

      <div class="mt-3 flex items-baseline justify-between gap-2 font-grotesk text-[11px] uppercase tracking-wider text-white">
        <span class="transition-colors group-hover:text-silver">{{ product.name }}</span>
        <span class="whitespace-nowrap text-silver/60">{{ formatPrice(product.price) }}</span>
      </div>
    </router-link>
  </article>
</template>
