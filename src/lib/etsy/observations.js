// Observations datées des compteurs d'une boutique (ventes cumulées, favoris, avis 12 mois).
// Uniquement si la conservation est autorisée. Conservation limitée et purge à chaque ajout.
// Une différence entre deux lectures est une « variation du compteur entre deux observations »,
// pas un nombre exact de commandes sur une période. Une baisse = correction du compteur.

export const DEFAULT_RETENTION_DAYS = 90
export const DEFAULT_MAX_PER_SHOP = 200
const DAY = 86400000

export const COUNTERS = {
  soldCount: 'Ventes cumulées (compteur boutique)',
  favorites: 'Favoris de la boutique',
  reviewCount: 'Avis (12 derniers mois)',
}

// Ajoute la lecture actuelle d'une boutique, puis purge l'ancien et l'excédent.
export function recordObservation(list = [], shop, { now = Date.now(), retentionDays = DEFAULT_RETENTION_DAYS, maxPerShop = DEFAULT_MAX_PER_SHOP } = {}) {
  const at = shop.fetchedAt || new Date(now).toISOString()
  const values = {}
  for (const key of Object.keys(COUNTERS)) {
    const m = shop.metrics?.[key]
    values[key] = m && m.status !== 'unavailable' && typeof m.value === 'number' ? m.value : null
  }
  const next = [...list.filter(o => !(o.shopId === shop.id && o.at === at)), { shopId: shop.id, at, source: shop.source, values }]
  return purgeObservations(next, { now, retentionDays, maxPerShop })
}

export function purgeObservations(list = [], { now = Date.now(), retentionDays = DEFAULT_RETENTION_DAYS, maxPerShop = DEFAULT_MAX_PER_SHOP } = {}) {
  const minTime = now - retentionDays * DAY
  const kept = list.filter(o => Date.parse(o.at) >= minTime)
  const byShop = new Map()
  for (const o of kept) byShop.set(o.shopId, [...(byShop.get(o.shopId) || []), o])
  return [...byShop.values()].flatMap(arr => arr.sort((a, b) => a.at.localeCompare(b.at)).slice(-maxPerShop))
}

// Segments entre observations successives pour un compteur.
// kind : 'increase' | 'flat' | 'correction' (le compteur a baissé) | 'missing' (une des deux lectures n'a pas la valeur)
export function counterVariations(list = [], shopId, key = 'soldCount', { gapDays = 7 } = {}) {
  const obs = list.filter(o => o.shopId === shopId).sort((a, b) => a.at.localeCompare(b.at))
  const segments = []
  for (let i = 1; i < obs.length; i++) {
    const a = obs[i - 1]
    const b = obs[i]
    const days = (Date.parse(b.at) - Date.parse(a.at)) / DAY
    const va = a.values?.[key]
    const vb = b.values?.[key]
    const base = { from: a.at, to: b.at, days, longGap: days > gapDays }
    if (typeof va !== 'number' || typeof vb !== 'number') {
      segments.push({ ...base, kind: 'missing', delta: null })
    } else if (vb < va) {
      segments.push({ ...base, kind: 'correction', delta: null, previous: va, current: vb })
    } else {
      segments.push({ ...base, kind: vb === va ? 'flat' : 'increase', delta: vb - va, previous: va, current: vb })
    }
  }
  return segments
}

// Résumé lisible : variation totale entre la première et la dernière lecture exploitables,
// seulement s'il n'y a eu ni correction ni lecture manquante entre les deux.
export function summarizeVariation(segments) {
  if (!segments.length) return { available: false, reason: 'Au moins deux observations sont nécessaires.' }
  const blocked = segments.find(s => s.kind === 'missing' || s.kind === 'correction')
  if (blocked) {
    return {
      available: false,
      reason: blocked.kind === 'correction'
        ? 'Le compteur a été corrigé (baisse) entre deux lectures : pas de variation cumulée fiable sur cet intervalle.'
        : 'Une observation n’a pas la valeur : la variation cumulée n’est pas calculée.',
    }
  }
  const delta = segments.reduce((s, x) => s + x.delta, 0)
  return {
    available: true,
    delta,
    from: segments[0].from,
    to: segments.at(-1).to,
    days: segments.reduce((s, x) => s + x.days, 0),
    longGap: segments.some(s => s.longGap),
    label: 'Variation du compteur entre deux observations',
  }
}

// Deux variations ne se comparent que sur des durées proches et sans trou.
export function comparableVariations(a, b, { tolerance = 0.15 } = {}) {
  if (!a?.available || !b?.available) return { ok: false, reason: 'Une des deux variations est indisponible.' }
  if (a.longGap || b.longGap) return { ok: false, reason: 'Une des périodes contient un trou d’observation trop long.' }
  const ratio = Math.abs(a.days - b.days) / Math.max(a.days, b.days)
  if (ratio > tolerance) return { ok: false, reason: `Périodes de durées différentes (${a.days.toFixed(1)} j contre ${b.days.toFixed(1)} j).` }
  return { ok: true }
}

// ── Relevés serveur quotidiens (table etsy_snapshots) ─────────────────────────

// Relevés de boutiques → format d'observation ci-dessus (pour counterVariations).
export function shopObservationsFromRows(rows = []) {
  return rows.filter(r => r.kind === 'shop').map(r => ({
    shopId: Number(r.entity_id), at: r.at, source: 'etsy',
    values: { soldCount: r.vals?.soldCount ?? null, favorites: r.vals?.favorites ?? null, reviewCount: r.vals?.reviewCount ?? null },
  }))
}

// Variation des vues et favoris d'une fiche entre le dernier relevé et celui d'il y a ~`days` jours
// (le plus ancien disponible si l'historique est plus court, au moins 1 jour d'écart).
// Une baisse du compteur = correction : la variation n'est pas calculée.
export function listingTrends(rows = [], { days = 7 } = {}) {
  const byId = new Map()
  for (const r of rows) if (r.kind === 'listing') byId.set(Number(r.entity_id), [...(byId.get(Number(r.entity_id)) || []), r])
  const out = new Map()
  for (const [id, list] of byId) {
    list.sort((a, b) => a.at.localeCompare(b.at))
    const last = list.at(-1)
    const target = Date.parse(last.at) - days * DAY
    const base = [...list].reverse().find(r => Date.parse(r.at) <= target) || list[0]
    const span = (Date.parse(last.at) - Date.parse(base.at)) / DAY
    if (base === last || span < 0.9) { out.set(id, { span: 0, snapshots: list.length }); continue }
    const delta = k => {
      const a = base.vals?.[k]
      const b = last.vals?.[k]
      return typeof a === 'number' && typeof b === 'number' && b >= a ? b - a : null
    }
    out.set(id, { span: Math.round(span * 10) / 10, from: base.at, to: last.at, views: delta('views'), favorites: delta('favorites'), snapshots: list.length })
  }
  return out
}

// Ventes réelles par jour d'une boutique : écart du compteur de ventes entre relevés successifs.
// Un écart sur plusieurs jours est rapporté au jour du relevé, avec sa durée ; une baisse = correction (null).
export function shopDailySales(rows = []) {
  const byShop = new Map()
  for (const r of rows) if (r.kind === 'shop') byShop.set(Number(r.entity_id), [...(byShop.get(Number(r.entity_id)) || []), r])
  const out = new Map()
  for (const [id, list] of byShop) {
    list.sort((a, b) => a.at.localeCompare(b.at))
    const days = []
    for (let i = 1; i < list.length; i++) {
      const a = list[i - 1].vals?.soldCount
      const b = list[i].vals?.soldCount
      const span = Math.max(1, Math.round((Date.parse(list[i].at) - Date.parse(list[i - 1].at)) / DAY))
      days.push({ day: list[i].day, span, sales: typeof a === 'number' && typeof b === 'number' && b >= a ? b - a : null })
    }
    out.set(id, days)
  }
  return out
}

// Répartition des ventes réelles d'une boutique entre ses fiches, au prorata des vues gagnées
// (favoris gagnés à défaut) sur la même fenêtre. C'est une estimation : Etsy ne publie pas les ventes par fiche.
export function allocateListingSales(rows = [], { days = 7 } = {}) {
  const shops = new Map()
  for (const r of rows) if (r.kind === 'shop') shops.set(Number(r.entity_id), [...(shops.get(Number(r.entity_id)) || []), r])
  const listings = new Map()
  for (const r of rows) if (r.kind === 'listing' && r.shop_id) {
    const key = Number(r.shop_id)
    if (!listings.has(key)) listings.set(key, new Map())
    const m = listings.get(key)
    m.set(Number(r.entity_id), [...(m.get(Number(r.entity_id)) || []), r])
  }
  const out = new Map()
  for (const [shopId, list] of shops) {
    list.sort((a, b) => a.at.localeCompare(b.at))
    const last = list.at(-1)
    const base = [...list].reverse().find(r => Date.parse(r.at) <= Date.parse(last.at) - days * DAY) || list[0]
    if (base === last) continue
    const a = base.vals?.soldCount
    const b = last.vals?.soldCount
    if (typeof a !== 'number' || typeof b !== 'number' || b < a) continue
    const shopSales = b - a
    const span = Math.round(((Date.parse(last.at) - Date.parse(base.at)) / DAY) * 10) / 10
    const gains = []
    for (const [lid, snaps] of listings.get(shopId) || []) {
      const at = k => snaps.find(s => s.day === k)
      const s0 = at(base.day)
      const s1 = at(last.day)
      if (!s0 || !s1) continue
      const d = k => (typeof s0.vals?.[k] === 'number' && typeof s1.vals?.[k] === 'number' && s1.vals[k] >= s0.vals[k] ? s1.vals[k] - s0.vals[k] : 0)
      gains.push({ lid, views: d('views'), favorites: d('favorites') })
    }
    const key = gains.some(g => g.views > 0) ? 'views' : gains.some(g => g.favorites > 0) ? 'favorites' : null
    const total = key ? gains.reduce((s, g) => s + g[key], 0) : 0
    for (const g of gains) {
      out.set(g.lid, {
        sales: key ? Math.round((shopSales * g[key] / total) * 10) / 10 : null,
        share: key ? Math.round((g[key] / total) * 1000) / 10 : null,
        basis: key, shopSales, span, from: base.at, to: last.at,
      })
    }
  }
  return out
}
