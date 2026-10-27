// Opérations Etsy partagées par /api/etsy (onglet Sourcing) et le serveur MCP.
// Optimisées pour le quota (5 req/s, 5 000/jour) : 100 éléments par appel, images ET boutique
// récupérées en un seul appel batch pour 100 fiches, catégories en cache par instance.
import { createEtsyClient, flattenTaxonomy, EtsyApiError } from './client.js'
import { normalizeShop, normalizeListing, normalizeReview, attachReviews, parseShopQuery } from '../../src/lib/etsy/normalize.js'

const cache = new Map() // partagé entre requêtes d'une même instance, borné par le client
let taxonomyCache = null

export function etsyStatus() {
  return {
    live: process.env.ETSY_LIVE_ENABLED === 'true',
    configured: !!(process.env.ETSY_API_KEY && process.env.ETSY_SHARED_SECRET),
    trackingAllowed: process.env.ETSY_TRACKING_ALLOWED === 'true',
  }
}

export function liveClient() {
  const st = etsyStatus()
  if (!st.live || !st.configured) throw new EtsyApiError('Connecteur Etsy désactivé ou non configuré.', { status: 503, code: 'disabled' })
  return createEtsyClient({ apiKey: process.env.ETSY_API_KEY, sharedSecret: process.env.ETSY_SHARED_SECRET, cache })
}

async function taxonomy(client) {
  if (!taxonomyCache) taxonomyCache = flattenTaxonomy(await client.getTaxonomy())
  return taxonomyCache
}

export async function loadShop(client, query) {
  const parsed = parseShopQuery(query)
  if (!parsed) throw new EtsyApiError('Indique un nom, un identifiant ou une URL de boutique.', { status: 400 })
  let shopRaw
  if (parsed.kind === 'shopId') shopRaw = await client.getShop(parsed.value)
  else if (parsed.kind === 'listingId') shopRaw = await client.getShop((await client.getListing(parsed.value)).shop_id)
  else {
    const found = await client.findShops(parsed.value)
    const exact = found.results.find(s => s.shop_name?.toLowerCase() === String(parsed.value).toLowerCase()) || found.results[0]
    if (!exact) throw new EtsyApiError('Aucune boutique trouvée.', { status: 404, code: 'not_found' })
    shopRaw = await client.getShop(exact.shop_id)
  }
  const fetchedAt = new Date().toISOString()
  const tax = await taxonomy(client)
  const shop = normalizeShop(shopRaw, { fetchedAt })
  const active = await client.getActiveListings(shop.id, { maxItems: 300 })
  const withImages = await client.getListingsWithImages(active.results.map(l => l.listing_id))
  const byId = new Map(withImages.map(l => [l.listing_id, l]))
  let listings = active.results.map(l => normalizeListing({ ...(byId.get(l.listing_id) || l), shop: shopRaw }, { fetchedAt, taxonomy: tax }))
  const minCreated = Math.floor(Date.now() / 1000) - 365 * 86400
  const rv = await client.getShopReviews(shop.id, { minCreated, maxItems: 500 })
  const reviews = rv.results.map(normalizeReview)
  listings = attachReviews(listings, reviews, { complete: rv.complete, from: new Date(minCreated * 1000).toISOString(), to: fetchedAt, fetched: reviews.length, total: rv.total }, fetchedAt)
  return { shop, listings, catalog: { fetched: listings.length, total: active.total, complete: active.complete } }
}

// Recherche produit : fiches actives de tout Etsy par mots-clés, enrichies (images + boutique) par lots de 100.
// Coût : 2 appels par tranche de 100 fiches (+1 pour les catégories au premier appel).
export async function searchProducts(client, { keywords, taxonomyId, minPrice, maxPrice, sortOn = 'score', sortOrder = 'desc', maxItems = 200 } = {}) {
  if (!keywords?.trim()) throw new EtsyApiError('Indique des mots-clés.', { status: 400 })
  const fetchedAt = new Date().toISOString()
  const tax = await taxonomy(client)
  const found = await client.searchListings({ keywords: keywords.trim(), taxonomyId, minPrice, maxPrice, sortOn, sortOrder, maxItems })
  const full = await client.getListingsWithImages(found.results.map(l => l.listing_id), 'Images,Shop')
  const byId = new Map(full.map(l => [l.listing_id, l]))
  const shops = new Map()
  const listings = []
  for (const base of found.results) {
    const raw = byId.get(base.listing_id) || base
    try {
      listings.push(normalizeListing(raw, { fetchedAt, taxonomy: tax }))
      if (raw.shop && !shops.has(raw.shop.shop_id)) shops.set(raw.shop.shop_id, normalizeShop(raw.shop, { fetchedAt }))
    } catch { /* fiche invalide ignorée, comptée dans skipped */ }
  }
  return {
    keywords: keywords.trim(), fetchedAt, listings, shops: [...shops.values()],
    total: found.total, fetched: listings.length, skipped: found.results.length - listings.length,
    note: 'Classement Etsy « pertinence » ; vues et favoris sont cumulés depuis la création de chaque fiche.',
  }
}
