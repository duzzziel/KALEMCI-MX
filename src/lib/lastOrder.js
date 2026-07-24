// La RLS de `orders` impide que los anónimos hagan SELECT (correcto), así que
// la página de confirmación no puede leer la orden de la base: el resumen
// viaja en sessionStorage — sobrevive al refresh pero muere con la pestaña.
const STORAGE_KEY = 'kalemci-last-order'

export function saveLastOrder(order) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(order))
  } catch {
    /* sin sessionStorage la confirmación mostrará solo el ID */
  }
}

export function getLastOrder(orderId) {
  try {
    const stored = JSON.parse(sessionStorage.getItem(STORAGE_KEY))
    return stored?.order_id === orderId ? stored : null
  } catch {
    return null
  }
}
