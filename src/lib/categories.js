// Vocabulario de filtros del catálogo — debe coincidir con el CHECK
// products_tags_allowed de 008_subtags.sql.
export const PRIMARY_TAGS = ['new-arrival', 'men', 'women', 'accessories']

// Subtags de tipo de prenda (dirección de arte, sprint 1).
export const SUBTAGS = [
  'top',
  'bottom',
  'jackets',
  'underwear',
  'denim',
  'tracksuits',
  'skirts',
  'dresses',
  'bodysuits',
  'corsets',
  'leather',
  'pants',
]

export const ALLOWED_TAGS = [...PRIMARY_TAGS, ...SUBTAGS]

export function tagLabel(tag) {
  return tag.replace(/-/g, ' ')
}

// Mapeo legado por nombre: era el filtrado original antes de la columna
// `tags` (007). Se conserva solo como fallback para productos sin tags
// (p. ej. si la migración aún no corre) — el admin ya no depende de esto.
const LEGACY_CATEGORY_BY_NAME = {
  'Reaper Trench Coat': 'men',
  'Blackout Cargo Joggers': 'men',
  'Neon Cross Longsleeve': 'women',
  'Static Noise Balaclava': 'accessories',
}

export function productMatchesCategory(product, category) {
  if (!category || category === 'all') return true

  if (Array.isArray(product.tags) && product.tags.length > 0) {
    return product.tags.includes(category)
  }

  // Fallback legado: por nombre, y lo no mapeado cuenta como new-arrival.
  return (LEGACY_CATEGORY_BY_NAME[product.name] ?? 'new-arrival') === category
}

// Nota: los tiles de categoría de la home viven ahora como bloques editoriales
// explícitos en HomeView.vue ("The KALEMCI Grid") — panorámico / split / panorámico.
