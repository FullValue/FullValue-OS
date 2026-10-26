// Connecteur Etsy (onglet Sourcing & comparatif). DÉSACTIVÉ tant que ETSY_LIVE_ENABLED !== 'true'.
// À n'activer qu'après : application Etsy approuvée ET autorisation écrite d'Etsy pour l'usage analytics.
//   GET /api/etsy?action=status                → état du connecteur (sans aucun secret)
//   GET /api/etsy?action=shop&q=<nom|id|url>   → boutique + catalogue actif + avis récents (normalisés)
//   GET /api/etsy?action=search&q=<nom>        → boutiques correspondant au nom
// Accès : session Supabase valide + email présent dans ETSY_ALLOWED_EMAILS.
// Aucune donnée Etsy n'est stockée côté serveur (seul un cache mémoire de courte durée).
import { createClient } from '@supabase/supabase-js'
import { createEtsyClient, flattenTaxonomy, EtsyApiError } from '../server/etsy/client.js'
import { normalizeShop, normalizeListing, normalizeReview, attachReviews, parseShopQuery, EtsyValidationError } from '../src/lib/etsy/normalize.js'

const cache = new Map() // partagé entre requêtes d'une même instance, borné par le client
let taxonomyCache = null

function status() {
  return {
    live: process.env.ETSY_LIVE_ENABLED === 'true',
    configured: !!(process.env.ETSY_API_KEY && process.env.ETSY_SHARED_SECRET),
    trackingAllowed: process.env.ETSY_TRACKING_ALLOWED === 'true',
  }
}

async function authorize(req) {
  const token = /^Bearer\s+(\S+)$/i.exec(req.headers.authorization || '')?.[1]
  if (!token) return { status: 401, error: 'Connexion requise.' }
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const anon = process.env.VITE_SUPABASE_ANON_KEY
  if (!url || !anon) return { status: 500, error: 'Supabase non configuré sur le serveur.' }
  const { data: { user } = {}, error } = await createClient(url, anon, { auth: { persistSession: false } }).auth.getUser(token)
  if (error || !user) return { status: 401, error: 'Session invalide : reconnecte-toi.' }
  const allowed = (process.env.ETSY_ALLOWED_EMAILS || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
  if (!allowed.includes((user.email || '').toLowerCase())) return { status: 403, error: 'Compte non autorisé pour le connecteur Etsy.' }
  return { user }
}

async function loadShop(client, query) {
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
  if (!taxonomyCache) taxonomyCache = flattenTaxonomy(await client.getTaxonomy())
  const shop = normalizeShop(shopRaw, { fetchedAt })
  const active = await client.getActiveListings(shop.id, { maxItems: 300 })
  const withImages = await client.getListingsWithImages(active.results.map(l => l.listing_id))
  const byId = new Map(withImages.map(l => [l.listing_id, l]))
  let listings = active.results.map(l => normalizeListing(byId.get(l.listing_id) || l, { fetchedAt, taxonomy: taxonomyCache }))
  const minCreated = Math.floor(Date.now() / 1000) - 365 * 86400
  const rv = await client.getShopReviews(shop.id, { minCreated, maxItems: 500 })
  const reviews = rv.results.map(normalizeReview)
  listings = attachReviews(listings, reviews, { complete: rv.complete, from: new Date(minCreated * 1000).toISOString(), to: fetchedAt, fetched: reviews.length, total: rv.total }, fetchedAt)
  return { shop, listings, catalog: { fetched: listings.length, total: active.total, complete: active.complete } }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()
  const action = String(req.query.action || 'status')
  if (action === 'status') return res.status(200).json(status())
  const st = status()
  if (!st.live) return res.status(503).json({ error: 'Connecteur Etsy désactivé : en attente de l’approbation de l’application et de l’autorisation écrite d’Etsy.', disabled: true })
  if (!st.configured) return res.status(503).json({ error: 'Connecteur Etsy non configuré.', disabled: true })
  const auth = await authorize(req)
  if (auth.error) return res.status(auth.status).json({ error: auth.error })
  try {
    const client = createEtsyClient({ apiKey: process.env.ETSY_API_KEY, sharedSecret: process.env.ETSY_SHARED_SECRET, cache })
    if (action === 'search') {
      const found = await client.findShops(String(req.query.q || '').slice(0, 80))
      return res.status(200).json({ shops: found.results.map(s => ({ id: s.shop_id, name: s.shop_name, url: s.url ?? null })), quota: client.quota() })
    }
    if (action === 'shop') {
      const data = await loadShop(client, String(req.query.q || '').slice(0, 300))
      return res.status(200).json({ ...data, quota: client.quota(), trackingAllowed: st.trackingAllowed })
    }
    return res.status(400).json({ error: 'Action inconnue.' })
  } catch (err) {
    if (err instanceof EtsyValidationError) return res.status(502).json({ error: err.message })
    if (err instanceof EtsyApiError) return res.status(err.status || 502).json({ error: err.message, code: err.code, retryAfter: err.retryAfter, quota: err.quota })
    return res.status(500).json({ error: 'Erreur interne du connecteur Etsy.' })
  }
}
