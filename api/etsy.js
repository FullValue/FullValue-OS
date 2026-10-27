// Connecteur Etsy (onglet Sourcing & comparatif). DÉSACTIVÉ tant que ETSY_LIVE_ENABLED !== 'true'.
// À n'activer qu'après : application Etsy approuvée ET autorisation écrite d'Etsy pour l'usage analytics.
//   GET /api/etsy?action=status                → état du connecteur (sans aucun secret)
//   GET /api/etsy?action=shop&q=<nom|id|url>   → boutique + catalogue actif + avis récents (normalisés)
//   GET /api/etsy?action=search&q=<nom>        → boutiques correspondant au nom
//   GET /api/etsy?action=history               → relevés quotidiens (90 j) des boutiques et fiches suivies
//   GET /api/etsy?action=snapshot              → relevé immédiat de tout ce qui est suivi
//   GET /api/etsy?action=products&q=<mots-clés>[&min_price&max_price&sort_on&taxonomy_id] → recherche produit
// Accès : session Supabase valide + email présent dans ETSY_ALLOWED_EMAILS.
// Aucune donnée Etsy n'est stockée côté serveur (seul un cache mémoire de courte durée).
import { createClient } from '@supabase/supabase-js'
import { EtsyApiError } from '../server/etsy/client.js'
import { EtsyValidationError } from '../src/lib/etsy/normalize.js'
import { etsyStatus, liveClient, loadShop, searchProducts } from '../server/etsy/service.js'
import { serviceClient } from '../server/mcp/auth.js'
import { saveRows, shopRow, listingRow, snapshotUser } from '../server/etsy/tracking.js'

const status = etsyStatus

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

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()
  const action = String(req.query.action || 'status')
  if (action === 'status') {
    const st = status()
    if (!st.live || !st.configured) return res.status(200).json(st)
    // Quota lu par un ping (1 appel), pour la jauge de l'onglet.
    try {
      const client = liveClient()
      await client.ping()
      return res.status(200).json({ ...st, quota: client.quota() })
    } catch {
      return res.status(200).json(st)
    }
  }
  const st = status()
  if (!st.live) return res.status(503).json({ error: 'Connecteur Etsy désactivé : en attente de l’approbation de l’application et de l’autorisation écrite d’Etsy.', disabled: true })
  if (!st.configured) return res.status(503).json({ error: 'Connecteur Etsy non configuré.', disabled: true })
  const auth = await authorize(req)
  if (auth.error) return res.status(auth.status).json({ error: auth.error })
  try {
    const client = liveClient()
    if (action === 'search') {
      const found = await client.findShops(String(req.query.q || '').slice(0, 80))
      return res.status(200).json({ shops: found.results.map(s => ({ id: s.shop_id, name: s.shop_name, url: s.url ?? null })), quota: client.quota() })
    }
    if (action === 'products') {
      const q = req.query
      const data = await searchProducts(client, {
        keywords: String(q.q || '').slice(0, 200), taxonomyId: q.taxonomy_id, minPrice: q.min_price, maxPrice: q.max_price,
        sortOn: ['score', 'created', 'price', 'updated'].includes(q.sort_on) ? q.sort_on : 'score', sortOrder: q.sort_order === 'asc' ? 'asc' : 'desc',
        maxItems: Math.min(300, Number(q.max) || 200),
      })
      return res.status(200).json({ ...data, quota: client.quota() })
    }
    if (action === 'history') {
      const since = new Date(Date.now() - 90 * 86400e3).toISOString().slice(0, 10)
      const { data, error } = await serviceClient().from('etsy_snapshots').select('kind, entity_id, shop_id, day, at, vals')
        .eq('user_id', auth.user.id).gte('day', since).order('day').limit(50000)
      if (error) return res.status(500).json({ error: `Historique indisponible (migration 009 appliquée ?) : ${error.message}` })
      return res.status(200).json({ rows: data, trackingAllowed: st.trackingAllowed })
    }
    if (action === 'snapshot') {
      if (!st.trackingAllowed) return res.status(403).json({ error: 'Suivi non autorisé.' })
      const db = serviceClient()
      const { data: row } = await db.from('user_state').select('state').eq('user_id', auth.user.id).maybeSingle()
      return res.status(200).json({ ...(await snapshotUser(db, client, auth.user.id, row?.state)), quota: client.quota() })
    }
    if (action === 'shop') {
      const data = await loadShop(client, String(req.query.q || '').slice(0, 300))
      // Premier relevé immédiat de la boutique ajoutée (aucun appel Etsy en plus).
      if (st.trackingAllowed) {
        const at = data.shop.fetchedAt
        await saveRows(serviceClient(), [
          shopRow(auth.user.id, data.raw.shop, at),
          ...data.raw.listings.map(l => listingRow(auth.user.id, l, at)),
        ]).catch(() => {})
      }
      delete data.raw
      return res.status(200).json({ ...data, quota: client.quota(), trackingAllowed: st.trackingAllowed })
    }
    return res.status(400).json({ error: 'Action inconnue.' })
  } catch (err) {
    if (err instanceof EtsyValidationError) return res.status(502).json({ error: err.message })
    if (err instanceof EtsyApiError) return res.status(err.status || 502).json({ error: err.message, code: err.code, retryAfter: err.retryAfter, quota: err.quota })
    return res.status(500).json({ error: 'Erreur interne du connecteur Etsy.' })
  }
}
