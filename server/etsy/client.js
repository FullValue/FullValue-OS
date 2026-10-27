// Client Etsy Open API v3, côté serveur uniquement.
// - en-tête x-api-key « keystring:shared_secret » (jamais renvoyé ni journalisé)
// - pagination (limit ≤ 100 + offset), plafonnée
// - quotas : lecture des en-têtes x-limit-* / x-remaining-*, 429 + retry-after avec backoff borné
// - validation des réponses (src/lib/etsy/normalize.js)
// - cache mémoire court : fiches 6 h, autres contenus 24 h (règles de fraîcheur Etsy), taille bornée
import { validateList, EtsyValidationError } from '../../src/lib/etsy/normalize.js'

export const ETSY_BASE = 'https://openapi.etsy.com/v3/application'
export const PAGE_LIMIT = 100
const TTL = { listings: 6 * 3600e3, default: 24 * 3600e3 }
const MAX_CACHE = 500
const MAX_RETRY_AFTER_S = 30

export class EtsyApiError extends Error {
  constructor(message, { status, code, retryAfter, quota } = {}) {
    super(message)
    this.name = 'EtsyApiError'
    this.status = status
    this.code = code
    this.retryAfter = retryAfter ?? null
    this.quota = quota ?? null
  }
}

export function readQuota(headers) {
  const h = k => {
    const v = headers?.get?.(k)
    return v === null || v === undefined || v === '' ? null : Number(v)
  }
  return {
    limitPerSecond: h('x-limit-per-second'),
    remainingThisSecond: h('x-remaining-this-second'),
    limitPerDay: h('x-limit-per-day'),
    remainingToday: h('x-remaining-today'),
  }
}

export function createEtsyClient({ apiKey, sharedSecret, fetchImpl = globalThis.fetch, sleep = ms => new Promise(r => setTimeout(r, ms)), maxRetries = 3, now = () => Date.now(), cache = new Map() } = {}) {
  if (!apiKey || !sharedSecret) throw new EtsyApiError('Connecteur Etsy non configuré.', { code: 'not_configured' })
  let lastQuota = null

  function cacheGet(key) {
    const hit = cache.get(key)
    if (!hit) return undefined
    if (hit.expires <= now()) { cache.delete(key); return undefined }
    return hit.data
  }
  function cacheSet(key, data, kind) {
    cache.set(key, { data, expires: now() + (TTL[kind] || TTL.default) })
    while (cache.size > MAX_CACHE) cache.delete(cache.keys().next().value)
  }

  async function request(path, params = {}, { kind = 'default', useCache = true } = {}) {
    const url = new URL(`${ETSY_BASE}${path}`)
    for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v))
    const key = url.toString()
    if (useCache) {
      const cached = cacheGet(key)
      if (cached !== undefined) return cached
    }
    for (let attempt = 0; ; attempt++) {
      let res
      try {
        res = await fetchImpl(key, { headers: { 'x-api-key': `${apiKey}:${sharedSecret}`, accept: 'application/json' } })
      } catch {
        if (attempt >= maxRetries) throw new EtsyApiError('Etsy injoignable (réseau).', { code: 'network' })
        await sleep(Math.min(8000, 1000 * 2 ** attempt))
        continue
      }
      lastQuota = readQuota(res.headers)
      if (res.status === 429) {
        const ra = Number(res.headers?.get?.('retry-after'))
        const wait = Number.isFinite(ra) && ra >= 0 ? ra : 2 ** attempt
        // Quota journalier épuisé ou attente trop longue : on s'arrête et on le dit.
        if (attempt >= maxRetries || wait > MAX_RETRY_AFTER_S || lastQuota.remainingToday === 0) {
          throw new EtsyApiError(lastQuota.remainingToday === 0 ? 'Quota journalier Etsy épuisé.' : 'Limite de débit Etsy atteinte.', { status: 429, code: 'rate_limited', retryAfter: wait, quota: lastQuota })
        }
        await sleep(wait * 1000 + Math.min(4000, 250 * 2 ** attempt))
        continue
      }
      if (res.status >= 500) {
        if (attempt >= maxRetries) throw new EtsyApiError(`Erreur Etsy ${res.status}.`, { status: res.status, code: 'server' })
        await sleep(Math.min(8000, 1000 * 2 ** attempt))
        continue
      }
      const body = await res.json().catch(() => null)
      if (res.status === 401 || res.status === 403) throw new EtsyApiError('Accès Etsy refusé (clé, application non approuvée ou permission manquante).', { status: res.status, code: 'forbidden' })
      if (res.status === 404) throw new EtsyApiError('Introuvable sur Etsy.', { status: 404, code: 'not_found' })
      if (!res.ok) throw new EtsyApiError(body?.error || `Erreur Etsy ${res.status}.`, { status: res.status, code: 'bad_request' })
      if (body === null || typeof body !== 'object') throw new EtsyValidationError('corps JSON attendu', path)
      if (useCache) cacheSet(key, body, kind)
      return body
    }
  }

  // Parcourt toutes les pages jusqu'à maxItems. `complete` indique si tout a été lu.
  async function paginate(path, params = {}, { maxItems = 500, kind } = {}) {
    const results = []
    let total = null
    for (let offset = 0; results.length < maxItems; offset += PAGE_LIMIT) {
      const page = validateList(await request(path, { ...params, limit: PAGE_LIMIT, offset }, { kind }), path)
      total = page.count ?? total
      results.push(...page.results)
      if (page.results.length < PAGE_LIMIT || (total !== null && results.length >= total)) break
    }
    const sliced = results.slice(0, maxItems)
    return { results: sliced, total, complete: total !== null ? sliced.length >= total : sliced.length < maxItems }
  }

  return {
    quota: () => lastQuota,
    // Appel minimal (non mis en cache) pour lire le quota restant.
    ping: () => request('/openapi-ping', {}, { useCache: false }),
    findShops: name => request('/shops', { shop_name: name, limit: 25 }).then(b => validateList(b, 'findShops')),
    getShop: id => request(`/shops/${Number(id)}`),
    // findAllActiveListingsByShop n'accepte pas « includes » : les images passent par le batch.
    getActiveListings: (id, opts) => paginate(`/shops/${Number(id)}/listings/active`, {}, { ...opts, kind: 'listings' }),
    // Recherche par mots-clés sur toutes les fiches actives d'Etsy (findAllListingsActive), paginée.
    searchListings: ({ keywords, taxonomyId, minPrice, maxPrice, sortOn = 'score', sortOrder = 'desc', maxItems = 200 } = {}) =>
      paginate('/listings/active', { keywords, taxonomy_id: taxonomyId, min_price: minPrice, max_price: maxPrice, sort_on: sortOn, sort_order: sortOrder }, { maxItems, kind: 'listings' }),
    // getListingsByListingIds par lots de 100 : images et, si demandé, la boutique de chaque fiche (1 appel pour 100 fiches).
    async getListingsWithImages(ids = [], includes = 'Images') {
      const out = []
      for (let i = 0; i < ids.length; i += PAGE_LIMIT) {
        const chunk = ids.slice(i, i + PAGE_LIMIT).map(Number).join(',')
        out.push(...validateList(await request('/listings/batch', { listing_ids: chunk, includes }, { kind: 'listings' }), 'getListingsByListingIds').results)
      }
      return out
    },
    getShopReviews: (id, opts = {}) => paginate(`/shops/${Number(id)}/reviews`, { min_created: opts.minCreated }, { maxItems: opts.maxItems ?? 500 }),
    getListing: id => request(`/listings/${Number(id)}`, { includes: 'Images' }, { kind: 'listings' }),
    getTaxonomy: () => request('/seller-taxonomy/nodes'),
  }
}

// Arbre de catégories Etsy → { taxonomy_id: « Parent › Enfant » }.
export function flattenTaxonomy(body) {
  const out = {}
  const walk = (nodes, path) => {
    for (const n of nodes || []) {
      if (!Number.isInteger(n?.id)) continue
      const label = [...path, n.name].filter(Boolean).join(' › ')
      out[n.id] = label
      walk(n.children, [...path, n.name])
    }
  }
  walk(validateList(body, 'taxonomy').results, [])
  return out
}
