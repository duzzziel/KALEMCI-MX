import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import ProductDetailView from '../views/ProductDetailView.vue'
import { getAdminSession, signOut } from '../lib/adminAuth'

const router = createRouter({
  history: createWebHistory(),
  scrollBehavior(to, from) {
    if (to.hash) return { el: to.hash, behavior: 'smooth' }
    // Filtrar dentro de la home no reinicia el scroll: HomeView desplaza
    // suavemente hasta el catálogo para mostrar el resultado del filtro.
    if (to.path === '/' && from.path === '/' && (to.query.category || to.query.search)) return false
    return { top: 0 }
  },
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/product/:id',
      name: 'product-detail',
      component: ProductDetailView,
    },
    {
      path: '/collections',
      name: 'collections',
      component: () => import('../views/CollectionsView.vue'),
    },
    {
      path: '/collection/:category',
      name: 'collection',
      component: () => import('../views/CollectionView.vue'),
    },
    {
      path: '/checkout',
      name: 'checkout',
      component: () => import('../views/CheckoutView.vue'),
    },
    {
      path: '/order-success/:id',
      name: 'order-success',
      component: () => import('../views/OrderSuccessView.vue'),
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/LoginView.vue'),
    },
    {
      path: '/admin',
      name: 'admin',
      component: () => import('../views/AdminView.vue'),
      meta: { requiresAdmin: true },
    },
    {
      // Catch-all: sin esto, una URL desconocida renderiza una página en blanco.
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('../views/NotFoundView.vue'),
    },
  ],
})

router.beforeEach(async (to) => {
  if (!to.meta.requiresAdmin) return true

  // El estado real se consulta al cliente de Supabase en cada navegación —
  // nunca a flags booleanas locales, que cualquier atacante puede mutar
  // desde la consola del navegador.
  const session = await getAdminSession()
  if (session) return true

  // Sesión ausente, expirada, o de un usuario autenticado que NO está en la
  // lista blanca: se destruye la sesión local y se fuerza el paso por login.
  // Nota: aunque alguien parchee este guard en su navegador, la RLS del
  // servidor (003_secure_admin_rls.sql) rechaza cualquier escritura.
  await signOut()
  return { path: '/login', query: { redirect: to.fullPath } }
})

export default router
