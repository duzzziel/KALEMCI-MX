// Variantes ligeras de imagen para tarjetas de producto.
//
// Cada foto del catálogo vive en Supabase Storage como <slug>/<n>.jpg
// (~100-450KB, para la vista de detalle) y tiene un derivado
// <n>-card.webp de 640px (~15-100KB) para cuadrículas y carruseles.
// Si una URL no sigue la convención (imagen externa, producto nuevo sin
// derivado), se devuelve tal cual — y el <img> además trae un @error que
// regresa al original, así que nunca se rompe una tarjeta.
const STORAGE_PREFIX =
  'https://ffurplzqeldxzeheetgg.supabase.co/storage/v1/object/public/products/'

export function cardImage(url) {
  if (typeof url !== 'string' || !url.startsWith(STORAGE_PREFIX) || !url.endsWith('.jpg')) {
    return url
  }
  return `${url.slice(0, -4)}-card.webp`
}
