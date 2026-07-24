<template>
  <router-view v-slot="{ Component }">
    <Transition name="page" mode="out-in">
      <component :is="Component" />
    </Transition>
  </router-view>
</template>

<style>
/* Transición de página: fundido breve — cambio de sala en una galería,
   no un efecto. Con reduced-motion se desactiva. */
.page-enter-active,
.page-leave-active {
  transition: opacity 220ms ease;
}

.page-enter-from,
.page-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .page-enter-active,
  .page-leave-active {
    transition: none;
  }
}
</style>
