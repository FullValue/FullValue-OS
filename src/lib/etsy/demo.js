// Mode démonstration : boutiques et fiches 100 % synthétiques (aucune donnée Etsy réelle),
// au format exact des réponses Etsy Open API v3, pour passer par la même validation que le réel.
// Cas volontairement inclus : champs manquants, catalogue partiel, plusieurs devises,
// fiches numériques, avis partiels, compteur corrigé et observation manquante.
import { normalizeShop, normalizeListing, normalizeReview, attachReviews } from './normalize.js'

export const DEMO_TAXONOMY = {
  1001: 'Bijoux › Colliers',
  1002: 'Maison › Décoration murale',
  1003: 'Papeterie › Planners imprimables',
  1004: 'Vêtements › T-shirts',
  1005: 'Accessoires › Sacs',
}

const DAY = 86400
function rng(seed) {
  let s = seed
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646 }
}

// Vignette SVG locale (pas d'image externe) : couleur et initiales de la fiche.
function thumb(title, hue) {
  const initials = title.split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase()
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${hue},70%,72%)"/><stop offset="1" stop-color="hsl(${(hue + 40) % 360},65%,52%)"/></linearGradient></defs><rect width="160" height="160" rx="18" fill="url(#g)"/><text x="80" y="96" font-family="Arial" font-size="44" font-weight="700" fill="white" text-anchor="middle">${initials}</text></svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

const SHOPS = [
  { shop_id: 900001, shop_name: 'DemoAtelierLune', title: 'Bijoux minimalistes (démo)', currency_code: 'EUR', country: 'FR', sold: 4820, fav: 2310, reviews: 612, avg: 4.8, active: 14, digital: 0, ageDays: 2100, taxa: [1001, 1005], hue: 260 },
  { shop_id: 900002, shop_name: 'DemoPrintNest', title: 'Affiches murales (démo)', currency_code: 'USD', country: 'US', sold: 12950, fav: 5120, reviews: 1480, avg: 4.9, active: 16, digital: 6, ageDays: 1500, taxa: [1002, 1003], hue: 20 },
  // Catalogue partiel : 40 fiches annoncées, 12 fournies.
  { shop_id: 900003, shop_name: 'DemoPlannerLab', title: 'Planners imprimables (démo)', currency_code: 'GBP', country: 'GB', sold: 26400, fav: 8800, reviews: 2950, avg: 4.7, active: 40, digital: 40, ageDays: 900, taxa: [1003], hue: 160, provided: 12 },
  // Champs manquants : avis 12 mois et favoris absents de la réponse.
  { shop_id: 900004, shop_name: 'DemoCotonBrut', title: null, currency_code: 'EUR', country: 'PT', sold: 310, fav: null, reviews: null, avg: null, active: 9, digital: 0, ageDays: 240, taxa: [1004, 1005], hue: 200 },
  { shop_id: 900005, shop_name: 'DemoMaisonSable', title: 'Déco murale & textiles (démo)', currency_code: 'EUR', country: 'FR', sold: 1730, fav: 940, reviews: 205, avg: 4.6, active: 11, digital: 2, ageDays: 1200, taxa: [1002, 1005], hue: 35 },
]

const WORDS = {
  1001: ['Collier', 'Pendentif', 'Chaîne fine', 'Médaillon', 'Ras-du-cou'],
  1002: ['Affiche', 'Poster', 'Tableau', 'Tapisserie', 'Cadre'],
  1003: ['Planner', 'Agenda', 'Bullet journal', 'Habit tracker', 'Budget sheet'],
  1004: ['T-shirt', 'Tee oversize', 'Débardeur', 'Sweat léger', 'Polo'],
  1005: ['Sac', 'Tote bag', 'Pochette', 'Banane', 'Cabas'],
}
const ADJ = ['minimaliste', 'personnalisé', 'vintage', 'boho', 'doré', 'en lin', 'brodé', 'imprimable', 'en coton bio', 'graphique']
const TAGS = ['cadeau', 'personnalisé', 'fait main', 'minimaliste', 'boho', 'anniversaire', 'mariage', 'imprimable', 'déco', 'écologique', 'vintage', 'noël']

export function demoRaw(now = Date.now()) {
  const nowSec = Math.floor(now / 1000)
  const rand = rng(42)
  const shops = []
  const listings = []
  const reviews = []
  let lid = 7100000
  for (const s of SHOPS) {
    shops.push({
      shop_id: s.shop_id, shop_name: s.shop_name, title: s.title, currency_code: s.currency_code,
      shop_location_country_iso: s.country, url: `https://www.etsy.com/shop/${s.shop_name}`,
      create_date: nowSec - s.ageDays * DAY, transaction_sold_count: s.sold, num_favorers: s.fav ?? undefined,
      review_count: s.reviews, review_average: s.avg, listing_active_count: s.active, digital_listing_count: s.digital,
      is_vacation: false, icon_url_fullxfull: null,
    })
    const provided = s.provided ?? s.active
    for (let i = 0; i < provided; i++) {
      const tax = s.taxa[i % s.taxa.length]
      const word = WORDS[tax][Math.floor(rand() * 5)]
      const title = `${word} ${ADJ[Math.floor(rand() * ADJ.length)]}${i % 4 === 0 ? ' — édition limitée' : ''}`
      const digital = tax === 1003 || (s.digital && i < s.digital)
      const base = { EUR: 2400, USD: 2600, GBP: 2100 }[s.currency_code]
      const amount = digital ? 300 + Math.floor(rand() * 900) : base + Math.floor(rand() * 5000)
      const id = lid++
      const ageDays = 20 + Math.floor(rand() * Math.min(s.ageDays, 1400))
      const listing = {
        listing_id: id, shop_id: s.shop_id, title, state: 'active',
        url: `https://www.etsy.com/listing/${id}/demo`,
        // Une fiche sans prix et une sans catégorie, pour tester l'affichage « Indisponible ».
        price: s.shop_id === 900004 && i === 2 ? undefined : { amount, divisor: 100, currency_code: s.currency_code },
        quantity: digital ? 999 : 1 + Math.floor(rand() * 25),
        num_favorers: s.shop_id === 900004 && i === 3 ? undefined : Math.floor(rand() * rand() * 900),
        views: 40 + Math.floor(rand() * rand() * 24000),
        tags: Array.from({ length: 4 + Math.floor(rand() * 6) }, () => TAGS[Math.floor(rand() * TAGS.length)]).filter((t, k, a) => a.indexOf(t) === k),
        materials: digital ? [] : ['coton', 'laiton', 'lin', 'papier recyclé', 'cuir végétal'].filter(() => rand() > 0.6),
        taxonomy_id: s.shop_id === 900005 && i === 1 ? null : tax,
        listing_type: digital ? 'download' : 'physical',
        original_creation_timestamp: nowSec - ageDays * DAY,
        has_variations: rand() > 0.6,
        when_made: digital ? 'made_to_order' : '2020_2026',
        who_made: 'i_did',
        images: [{ url_570xN: thumb(title, (s.hue + i * 9) % 360) }],
      }
      listings.push(listing)
      // Avis datés synthétiques sur 365 jours (aucun lien réel avec des ventes).
      const n = Math.floor(rand() * rand() * 30)
      for (let k = 0; k < n; k++) {
        reviews.push({ shop_id: s.shop_id, listing_id: id, rating: 4 + Math.round(rand()), create_timestamp: nowSec - Math.floor(rand() * Math.min(365, ageDays)) * DAY })
      }
    }
  }
  return { shops, listings, reviews }
}

// Jeu complet normalisé, prêt pour l'interface.
export function demoDataset(now = Date.now()) {
  const raw = demoRaw(now)
  const fetchedAt = new Date(now).toISOString()
  const opts = { source: 'demo', fetchedAt, now, taxonomy: DEMO_TAXONOMY }
  const shops = raw.shops.map(s => normalizeShop(s, opts))
  const reviews = raw.reviews.map(normalizeReview)
  const from = new Date(now - 365 * DAY * 1000).toISOString()
  let listings = raw.listings.map(l => normalizeListing(l, opts))
  // Avis : complets pour toutes les boutiques sauf DemoPrintNest (décompte partiel simulé).
  listings = shops.flatMap(shop => {
    const own = listings.filter(l => l.shopId === shop.id)
    const ownReviews = reviews.filter(r => r.shopId === shop.id)
    const partial = shop.id === 900002
    const kept = partial ? ownReviews.slice(0, Math.floor(ownReviews.length / 2)) : ownReviews
    return attachReviews(own, kept, { complete: !partial, from, to: fetchedAt, fetched: kept.length, total: ownReviews.length }, fetchedAt, 'Démonstration (synthétique)')
  })
  return { shops, listings, taxonomy: DEMO_TAXONOMY, fetchedAt }
}

// Observations synthétiques des compteurs (pour montrer le suivi) : une correction et un trou.
export function demoObservations(shops, now = Date.now()) {
  const out = []
  for (const shop of shops) {
    const sold = shop.metrics.soldCount.value
    for (let d = 28; d >= 0; d -= 7) {
      const at = new Date(now - d * DAY * 1000).toISOString()
      let value = typeof sold === 'number' ? Math.max(0, sold - Math.round(d * (sold / 2000))) : null
      if (shop.id === 900001 && d === 14) value = value + 40 // pic suivi d'une correction à J-7
      if (shop.id === 900005 && d === 14) value = null // observation sans la valeur
      out.push({ shopId: shop.id, at, source: 'demo', values: { soldCount: value, favorites: shop.metrics.favorites.value, reviewCount: shop.metrics.reviewCount.value } })
    }
  }
  return out
}
