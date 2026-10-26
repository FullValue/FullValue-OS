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
