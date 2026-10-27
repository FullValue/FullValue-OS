// Filtres, tri et comparaison des fiches et boutiques.
// Une valeur indisponible ne passe pas un filtre numérique actif (elle n'est pas « 0 »),
// et finit toujours en bas du tri, quel que soit le sens.
import { numeric } from './metrics.js'

export const DEFAULT_FILTERS = {
  priceMin: '', priceMax: '', favMin: '', favMax: '', viewsMin: '', reviewsMin: '', ageMaxDays: '', ageMinDays: '',
  include: '', exclude: '', categories: [], type: 'all', shops: [], currency: '',
  keepUnavailable: false,
}

const num = v => (v === '' || v === null || v === undefined ? null : Number(v))
const words = s => String(s || '').toLowerCase().split(',').map(w => w.trim()).filter(Boolean)

function inRange(metric, min, max, keepUnavailable) {
  if (min === null && max === null) return true
  const v = numeric(metric)
  if (v === null) return keepUnavailable
  return (min === null || v >= min) && (max === null || v <= max)
}

export function applyFilters(listings, f = DEFAULT_FILTERS) {
  const inc = words(f.include)
  const exc = words(f.exclude)
  const keep = !!f.keepUnavailable
  return listings.filter(l => {
    const text = `${l.title} ${(l.tags || []).join(' ')} ${(l.materials || []).join(' ')}`.toLowerCase()
    if (inc.length && !inc.every(w => text.includes(w))) return false
    if (exc.some(w => text.includes(w))) return false
    if (f.categories?.length && !f.categories.includes(l.taxonomyId)) return false
    if (f.shops?.length && !f.shops.includes(l.shopId)) return false
    if (f.currency && l.currency !== f.currency) return false
    if (f.type === 'physical' && l.type !== 'physical' && l.type !== 'both') return false
    if (f.type === 'digital' && l.type !== 'download' && l.type !== 'both') return false
    if (!inRange(l.metrics.price, num(f.priceMin), num(f.priceMax), keep)) return false
    if (!inRange(l.metrics.favorites, num(f.favMin), num(f.favMax), keep)) return false
    if (!inRange(l.metrics.views, num(f.viewsMin), null, keep)) return false
    if (!inRange(l.metrics.reviews, num(f.reviewsMin), null, keep)) return false
    if (!inRange(l.metrics.ageDays, num(f.ageMinDays), num(f.ageMaxDays), keep)) return false
    return true
  })
}

// Clés de tri : soit un champ texte, soit une métrique.
export const SORT_KEYS = {
  title: l => l.title?.toLowerCase() ?? null,
  shop: (l, ctx) => ctx?.shopName?.(l.shopId)?.toLowerCase() ?? null,
  category: l => l.category?.toLowerCase() ?? null,
  price: l => numeric(l.metrics.price),
  favorites: l => numeric(l.metrics.favorites),
  reviews: l => numeric(l.metrics.reviews),
  ageDays: l => numeric(l.metrics.ageDays),
  views: l => numeric(l.metrics.views),
  viewsPerDay: l => numeric(l.metrics.viewsPerDay),
  favoritesPerDay: l => numeric(l.metrics.favoritesPerDay),
  favRate: l => numeric(l.metrics.favRate),
  shopSold: l => numeric(l.metrics.shopSold),
  viewsTrend: l => numeric(l.metrics.viewsTrend),
  allocSales: l => numeric(l.metrics.allocSales),
  favoritesTrend: l => numeric(l.metrics.favoritesTrend),
  estSales: l => numeric(l.metrics.estSales),
  estRevenue: l => numeric(l.metrics.estRevenue),
}

export function sortListings(listings, key, dir = 'desc', ctx) {
  const get = SORT_KEYS[key]
  if (!get) return listings
  const sign = dir === 'asc' ? 1 : -1
  return [...listings].sort((a, b) => {
    const va = get(a, ctx)
    const vb = get(b, ctx)
    if (va === null && vb === null) return 0
    if (va === null) return 1
    if (vb === null) return -1
    if (typeof va === 'string') return sign * va.localeCompare(vb, 'fr')
    return sign * (va - vb)
  })
}

// Le tri par prix n'a de sens que dans une seule devise.
export function mixedCurrencies(listings) {
  return [...new Set(listings.map(l => l.currency).filter(Boolean))]
}

// Comparaison côte à côte (2 à 5 éléments). Les montants de devises différentes ne sont jamais
// additionnés ni classés entre eux : la comparaison le signale.
export function buildComparison(items, rows) {
  if (items.length < 2 || items.length > 5) return { ok: false, reason: 'Sélectionne de 2 à 5 éléments.' }
  const currencies = [...new Set(items.map(i => i.currency).filter(Boolean))]
  const sameCurrency = currencies.length <= 1
  return {
    ok: true,
    currencies,
    sameCurrency,
    warning: sameCurrency ? null : `Devises différentes (${currencies.join(', ')}) : les montants ne sont pas comparés entre eux.`,
    rows: rows.map(row => {
      const cells = items.map(it => row.get(it))
      const values = cells.map(c => numeric(c))
      const comparable = row.monetary ? sameCurrency : true
      const known = values.filter(v => v !== null)
      const best = comparable && known.length >= 2 && row.better
        ? (row.better === 'high' ? Math.max(...known) : Math.min(...known))
        : null
      return { label: row.label, cells, best, comparable, monetary: !!row.monetary }
    }),
  }
}
