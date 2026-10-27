// Validation et normalisation des réponses Etsy Open API v3 (schémas Shop, ShopListing, ListingReview
// de la spécification officielle) vers le modèle interne, avec des métriques traçables.
// Utilisé par le connecteur serveur et par le mode démonstration (mêmes formats d'entrée).
import { observed, computed, estimated, unavailable, moneyToNumber } from './metrics.js'

export class EtsyValidationError extends Error {
  constructor(message, path) {
    super(`Réponse Etsy invalide : ${message}${path ? ` (${path})` : ''}`)
    this.name = 'EtsyValidationError'
    this.path = path
  }
}

const isObj = v => v && typeof v === 'object' && !Array.isArray(v)
const optNum = v => (typeof v === 'number' && Number.isFinite(v) ? v : null)
const optStr = v => (typeof v === 'string' && v.trim() ? v : null)
const strList = v => (Array.isArray(v) ? v.filter(x => typeof x === 'string' && x.trim()) : [])
const DAY = 86400000

function requireId(obj, key, path) {
  const v = obj?.[key]
  if (!Number.isInteger(v) || v <= 0) throw new EtsyValidationError(`« ${key} » manquant ou invalide`, path)
  return v
}

// Enveloppe de liste Etsy : { count, results: [...] }.
export function validateList(body, path = 'liste') {
  if (!isObj(body) || !Array.isArray(body.results)) throw new EtsyValidationError('« results » attendu', path)
  return { count: optNum(body.count), results: body.results }
}

const daysSince = (epochSec, now) => (optNum(epochSec) ? Math.floor((now - epochSec * 1000) / DAY) : null)

export function normalizeShop(raw, { source = 'etsy', fetchedAt = new Date().toISOString(), now = Date.now() } = {}) {
  if (!isObj(raw)) throw new EtsyValidationError('boutique attendue', 'shop')
  const id = requireId(raw, 'shop_id', 'shop')
  const name = optStr(raw.shop_name)
  if (!name) throw new EtsyValidationError('« shop_name » manquant', 'shop')
  const meta = { source: source === 'demo' ? 'Démonstration (synthétique)' : 'Etsy · getShop', observedAt: fetchedAt }
  const created = optNum(raw.create_date) ?? optNum(raw.created_timestamp)
  return {
    id, name, source, fetchedAt,
    title: optStr(raw.title),
    url: optStr(raw.url),
    iconUrl: optStr(raw.icon_url_fullxfull),
    currency: optStr(raw.currency_code),
    country: optStr(raw.shop_location_country_iso),
    isVacation: raw.is_vacation === true,
    createdAt: created ? new Date(created * 1000).toISOString() : null,
    metrics: {
      // Cumul de toute la vie de la boutique : jamais réparti entre les produits.
      soldCount: observed(optNum(raw.transaction_sold_count), { ...meta, period: 'Cumul depuis l’ouverture de la boutique', note: 'Ventes totales de la boutique (toutes fiches confondues)' }),
      favorites: observed(optNum(raw.num_favorers), { ...meta, period: 'Valeur actuelle' }),
      reviewCount: observed(optNum(raw.review_count), { ...meta, period: '12 derniers mois' }),
      reviewAverage: observed(optNum(raw.review_average), { ...meta, period: '12 derniers mois' }),
      activeListings: observed(optNum(raw.listing_active_count), { ...meta, period: 'Valeur actuelle' }),
      digitalListings: observed(optNum(raw.digital_listing_count), { ...meta, period: 'Valeur actuelle' }),
      ageDays: computed(daysSince(created, now), { source: meta.source, observedAt: fetchedAt, note: 'Depuis la date de création de la boutique' }),
    },
  }
}

export function normalizeListing(raw, { source = 'etsy', fetchedAt = new Date().toISOString(), now = Date.now(), taxonomy = {}, images = {} } = {}) {
  if (!isObj(raw)) throw new EtsyValidationError('fiche attendue', 'listing')
  const id = requireId(raw, 'listing_id', 'listing')
  const shopId = requireId(raw, 'shop_id', `listing ${id}`)
  const title = optStr(raw.title)
  if (!title) throw new EtsyValidationError('« title » manquant', `listing ${id}`)
  const price = isObj(raw.price) ? raw.price : null
  const currency = optStr(price?.currency_code)
  const meta = { source: source === 'demo' ? 'Démonstration (synthétique)' : 'Etsy · findAllActiveListingsByShop', observedAt: fetchedAt }
  const created = optNum(raw.original_creation_timestamp) ?? optNum(raw.creation_timestamp)
  const taxonomyId = optNum(raw.taxonomy_id)
  const type = ['physical', 'download', 'both'].includes(raw.listing_type) ? raw.listing_type : null
  const firstImage = Array.isArray(raw.images) ? raw.images[0] : null
  return {
    id, shopId, title, source, fetchedAt,
    url: optStr(raw.url),
    imageUrl: optStr(firstImage?.url_570xN) || optStr(firstImage?.url_fullxfull) || images[id] || null,
    currency,
    type,
    state: optStr(raw.state),
    taxonomyId,
    category: taxonomyId != null ? taxonomy[taxonomyId] || null : null,
    tags: strList(raw.tags),
    materials: strList(raw.materials),
    styles: strList(raw.style),
    whenMade: optStr(raw.when_made),
    whoMade: optStr(raw.who_made),
    hasVariations: raw.has_variations === true,
    isPersonalizable: raw.is_personalizable === true,
    language: optStr(raw.language),
    processing: optNum(raw.processing_min) != null ? { min: optNum(raw.processing_min), max: optNum(raw.processing_max) } : null,
    createdAt: created ? new Date(created * 1000).toISOString() : null,
    updatedAt: optNum(raw.last_modified_timestamp) ? new Date(raw.last_modified_timestamp * 1000).toISOString() : null,
    metrics: {
      // Prix minimum de la fiche (variantes possibles), dans la devise de la boutique.
      price: observed(moneyToNumber(price), { ...meta, currency, period: 'Prix affiché actuel (minimum)', note: raw.has_variations ? 'Prix minimum : la fiche a des variantes' : null }),
      favorites: observed(optNum(raw.num_favorers), { ...meta, period: 'Valeur actuelle', note: 'Les favoris ne sont pas des ventes' }),
      quantity: observed(optNum(raw.quantity), { ...meta, period: 'Valeur actuelle', note: 'Stock affiché : une variation n’est pas une vente' }),
      views: observed(optNum(raw.views), { ...meta, period: 'Cumul depuis la création de la fiche', note: 'Les vues ne sont pas des ventes' }),
      ageDays: computed(daysSince(created, now), { source: meta.source, observedAt: fetchedAt, note: 'Depuis la création de la fiche' }),
      ...rates(optNum(raw.views), optNum(raw.num_favorers), daysSince(created, now), { source: meta.source, observedAt: fetchedAt }),
      // Ventes cumulées de la boutique (si la boutique est incluse dans la réponse) : jamais attribuées à la fiche.
      shopSold: isObj(raw.shop) ? observed(optNum(raw.shop.transaction_sold_count), { ...meta, source: 'Etsy · boutique incluse', period: 'Cumul de la boutique', note: 'Ventes de toute la boutique, pas de cette fiche' }) : unavailable('Boutique non incluse'),
      // Remplis par attachReviews si les avis ont été récupérés ; sinon indisponibles.
      reviews: unavailable('Avis non récupérés pour cette fiche'),
      lastReviewAt: unavailable('Avis non récupérés pour cette fiche'),
      // Emplacements du moteur d'estimation : indisponibles tant qu'aucun modèle validé n'existe.
      estSales: unavailable('Estimation non disponible'),
      estRevenue: unavailable('Estimation non disponible'),
    },
  }
}

// Ratios moyens calculés à partir des compteurs cumulés (moyenne sur la vie de la fiche, pas une tendance récente).
function rates(views, favs, ageDays, meta) {
  const days = ageDays != null ? Math.max(1, ageDays) : null
  const period = 'Moyenne depuis la création de la fiche'
  return {
    viewsPerDay: views != null && days ? computed(Math.round((views / days) * 10) / 10, { ...meta, period, note: 'Vues cumulées ÷ ancienneté' }) : unavailable('Vues ou ancienneté indisponibles'),
    favoritesPerDay: favs != null && days ? computed(Math.round((favs / days) * 100) / 100, { ...meta, period, note: 'Favoris actuels ÷ ancienneté' }) : unavailable('Favoris ou ancienneté indisponibles'),
    favRate: views != null && views > 0 && favs != null ? computed(Math.round((favs / views) * 1000) / 10, { ...meta, period, note: 'Favoris ÷ vues, en %' }) : unavailable('Vues ou favoris indisponibles'),
  }
}

export function normalizeReview(raw) {
  if (!isObj(raw)) throw new EtsyValidationError('avis attendu', 'review')
  const listingId = optNum(raw.listing_id)
  const ts = optNum(raw.create_timestamp) ?? optNum(raw.created_timestamp)
  const rating = optNum(raw.rating)
  if (!listingId || !ts) throw new EtsyValidationError('« listing_id » ou « create_timestamp » manquant', 'review')
  return { listingId, shopId: optNum(raw.shop_id), rating: rating >= 1 && rating <= 5 ? rating : null, createdAt: new Date(ts * 1000).toISOString() }
}

// Compte les avis récupérés par fiche. `coverage` décrit ce qui a vraiment été lu :
// { complete: bool, from, to, fetched, total } — un décompte partiel est signalé comme tel.
export function attachReviews(listings, reviews, coverage, fetchedAt = new Date().toISOString(), source = 'Etsy · getReviewsByShop') {
  const byListing = new Map()
  for (const r of reviews) byListing.set(r.listingId, [...(byListing.get(r.listingId) || []), r])
  const period = coverage?.from ? `Avis du ${coverage.from.slice(0, 10)} au ${(coverage.to || fetchedAt).slice(0, 10)}` : 'Avis récupérés'
  const note = coverage?.complete ? null : `Décompte partiel : ${coverage?.fetched ?? reviews.length} avis lus sur ${coverage?.total ?? '?'} pour la boutique`
  return listings.map(l => {
    const list = byListing.get(l.id) || []
    const last = list.map(r => r.createdAt).sort().at(-1) || null
    return {
      ...l,
      metrics: {
        ...l.metrics,
        reviews: computed(list.length, { source, observedAt: fetchedAt, period, note }),
        lastReviewAt: last ? computed(last, { source, observedAt: fetchedAt, period }) : unavailable('Aucun avis sur la période lue', { period }),
      },
    }
  })
}

// Couverture du catalogue : fiches réellement lues / fiches actives annoncées par la boutique.
export function catalogCoverage(shop, listings) {
  const announced = shop?.metrics?.activeListings?.value
  const fetched = listings.filter(l => l.shopId === shop.id).length
  if (typeof announced !== 'number') return { fetched, announced: null, complete: null, ratio: null }
  return { fetched, announced, complete: fetched >= announced, ratio: announced ? Math.min(1, fetched / announced) : null }
}

// Accepte un nom, un identifiant numérique ou une URL Etsy (…/shop/NomBoutique, …/listing/123/…).
export function parseShopQuery(input) {
  const q = String(input || '').trim()
  if (!q) return null
  if (/^\d+$/.test(q)) return { kind: 'shopId', value: Number(q) }
  const shop = /etsy\.com\/(?:[a-z]{2}(?:-[a-z]{2})?\/)?shop\/([A-Za-z0-9]+)/i.exec(q)
  if (shop) return { kind: 'shopName', value: shop[1] }
  const listing = /etsy\.com\/(?:[a-z]{2}(?:-[a-z]{2})?\/)?listing\/(\d+)/i.exec(q)
  if (listing) return { kind: 'listingId', value: Number(listing[1]) }
  const sub = /^([A-Za-z0-9]+)\.etsy\.com/i.exec(q.replace(/^https?:\/\//, ''))
  if (sub) return { kind: 'shopName', value: sub[1] }
  if (/^[A-Za-z0-9]{2,40}$/.test(q)) return { kind: 'shopName', value: q }
  return { kind: 'search', value: q }
}

// Ajoute aux fiches les variations mesurées entre relevés quotidiens (listingTrends).
export function attachTrends(listings, trends, alloc) {
  if (!trends) return listings
  return listings.map(l => {
    const t = trends.get(l.id)
    const meta = t?.span ? { source: 'Relevés quotidiens Cockpit', observedAt: t.to, period: `Sur ${t.span} j (du ${t.from.slice(0, 10)} au ${t.to.slice(0, 10)})`, note: 'Variation du compteur entre deux relevés' } : null
    const metric = k => (meta && t[k] != null ? computed(t[k], meta) : unavailable(t ? (t.span ? 'Compteur corrigé entre deux relevés' : 'Un seul relevé pour l’instant : tendance demain') : 'Fiche non suivie (ajoute la boutique ou mets-la en favori)'))
    const a = alloc?.get(l.id)
    const allocSales = a && a.sales != null
      ? estimated(a.sales, {
        method: `Ventes réelles de la boutique (+${a.shopSales} sur ${a.span} j) réparties au prorata des ${a.basis === 'views' ? 'vues' : 'favoris'} gagnés (${a.share} % de la boutique)`,
        source: 'Relevés quotidiens Cockpit', observedAt: a.to, period: `Sur ${a.span} j`, note: 'Estimation : Etsy ne publie pas les ventes par fiche',
      })
      : unavailable(a ? 'Pas de vues ni de favoris gagnés sur la période' : 'Nécessite au moins deux relevés de la boutique entière (ajoute la boutique)')
    return { ...l, metrics: { ...l.metrics, viewsTrend: metric('views'), favoritesTrend: metric('favorites'), allocSales } }
  })
}
