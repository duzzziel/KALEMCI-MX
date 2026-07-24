import { createApp } from 'vue'
import './assets/main.css'
import App from './App.vue'
import router from './router'

// Directiva v-reveal: la sección aparece con un fade-up sutil al entrar al
// viewport. Con prefers-reduced-motion activo no anima nada.
const prefersReducedMotion =
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

const revealObserver =
  typeof IntersectionObserver !== 'undefined'
    ? new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              entry.target.classList.add('reveal-visible')
              revealObserver.unobserve(entry.target)
            }
          }
        },
        { threshold: 0.12 },
      )
    : null

const reveal = {
  mounted(el) {
    if (prefersReducedMotion || !revealObserver) return
    el.classList.add('reveal-hidden')
    revealObserver.observe(el)
  },
  unmounted(el) {
    revealObserver?.unobserve(el)
  },
}

createApp(App).use(router).directive('reveal', reveal).mount('#app')
