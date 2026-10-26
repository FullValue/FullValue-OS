// Moteur d'estimation des ventes par produit — indépendant de l'interface et du connecteur.
// Il ne reproduit aucun algorithme tiers. Aucun modèle n'est enregistré tant qu'il n'a pas été
// calibré sur des transactions de boutiques volontaires (consentement explicite à l'entraînement)
// puis validé sur des boutiques ET des périodes exclues de l'entraînement, en battant la baseline.
// Sans cela : « Estimation non disponible ». Pas de formule universelle, pas de répartition
// arbitraire des ventes boutique entre les fiches, pas d'intervalle inventé.
import { estimated, unavailable } from './metrics.js'

// Signaux candidats : des hypothèses à tester, pas des preuves de ventes.
export const SIGNALS = [
  { id: 'reviewsDated', label: 'Avis datés de la fiche', needs: 'Avis récupérés (getReviewsByListing / getReviewsByShop)' },
  { id: 'age', label: 'Ancienneté de la fiche', needs: 'original_creation_timestamp' },
  { id: 'category', label: 'Catégorie', needs: 'taxonomy_id' },
  { id: 'price', label: 'Prix affiché', needs: 'price (minimum)' },
  { id: 'favorites', label: 'Favoris de la fiche', needs: 'num_favorers' },
  { id: 'shopCounter', label: 'Variation du compteur de ventes boutique', needs: 'Observations conservées (autorisation de suivi)' },
]

export const PREREQUISITES = [
  'Transactions de boutiques volontaires, avec consentement explicite à l’entraînement (distinct du consentement à connecter la boutique)',
  'Historique d’observations autorisé (conservation et suivi accordés par Etsy)',
  'Validation sur boutiques et périodes exclues de l’entraînement, meilleure que la baseline, erreurs documentées par catégorie',
]

const avail = m => !!m && m.status !== 'unavailable' && m.value != null

// Quels signaux sont réellement disponibles pour une fiche donnée.
export function signalAvailability(listing, ctx = {}) {
  const m = listing?.metrics || {}
  return {
    reviewsDated: avail(m.reviews),
    age: avail(m.ageDays),
    category: listing?.taxonomyId != null,
    price: avail(m.price),
    favorites: avail(m.favorites),
    shopCounter: !!ctx.trackingAllowed && (ctx.observationCount || 0) >= 2,
  }
}

// Registre des modèles validés. Vide : aucune calibration n'existe à ce jour.
const registry = []

export function registerModel(model) {
  const v = model?.validation
  const ok = model?.id && typeof model.predict === 'function' && v?.beatsBaseline === true
    && v?.heldOutShops > 0 && v?.heldOutPeriods > 0 && v?.errorsByCategory && model?.calibrationConsent === true
  if (!ok) throw new Error('Modèle refusé : calibration consentie, validation hors échantillon (boutiques et périodes) et supériorité sur la baseline sont obligatoires.')
  registry.push(model)
  return model
}

export const registeredModels = () => [...registry]

export function estimateListingSales(listing, ctx = {}, models = registry) {
  const signals = signalAvailability(listing, ctx)
  const model = models.find(md => md.categories == null || md.categories.includes(listing.taxonomyId))
  if (!model) {
    return unavailable('Estimation non disponible : aucun modèle calibré et validé.', { note: 'Estimation non disponible', method: null })
  }
  const missing = (model.requiredSignals || []).filter(s => !signals[s])
  if (missing.length) {
    return unavailable(`Estimation non disponible : signaux manquants (${missing.join(', ')}).`)
  }
  const out = model.predict(listing, ctx)
  if (!out || typeof out.value !== 'number') return unavailable('Estimation non disponible pour cette fiche.')
  return estimated(out.value, {
    method: model.id,
    period: out.period || model.period,
    source: `Modèle ${model.id}`,
    observedAt: listing.fetchedAt,
    // Fourchette seulement si la méthode la produit et l'a validée.
    note: model.validation.intervalValidated && out.interval ? `Fourchette validée : ${out.interval[0]} – ${out.interval[1]}` : null,
  })
}

// CA estimé = scénario brut ventes estimées × prix affiché actuel. Jamais « CA réel » ni bénéfice.
export function revenueScenario(salesMetric, priceMetric) {
  if (salesMetric?.status !== 'estimated') return unavailable('Estimation non disponible (pas de ventes estimées).')
  if (!avail(priceMetric) || !priceMetric.currency) return unavailable('Prix indisponible.')
  return estimated(salesMetric.value * priceMetric.value, {
    method: `${salesMetric.method} × prix affiché`,
    currency: priceMetric.currency,
    period: salesMetric.period,
    source: 'Scénario brut',
    note: 'Scénario brut : ne reconstitue ni prix historiques, variantes, promotions, remboursements, taxes ni frais de livraison. Ni CA réel, ni bénéfice.',
  })
}

// ── Harnais de validation (pour la future calibration) ───────────────────────────────────────
// Enregistrement de calibration : { shopId, listingId, category, periodStart (ISO), reviews, sales }
// où `sales` vient des transactions réelles d'une boutique volontaire.

function hash(str) {
  let h = 2166136261
  for (const ch of String(str)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) }
  return (h >>> 0) / 4294967296
}

// Découpe sans fuite : test = boutiques tirées ET périodes >= cutoff ; train = autres boutiques ET périodes < cutoff.
// Les enregistrements « mixtes » (boutique de test avant cutoff, ou boutique d'entraînement après) sont écartés.
export function splitByShopAndPeriod(records, { cutoff, testShopRatio = 0.3, salt = 'etsy' } = {}) {
  if (!cutoff) throw new Error('cutoff (date ISO) requis')
  const isTestShop = id => hash(`${salt}:${id}`) < testShopRatio
  const train = []
  const test = []
  for (const r of records) {
    const late = r.periodStart >= cutoff
    if (isTestShop(r.shopId) && late) test.push(r)
    else if (!isTestShop(r.shopId) && !late) train.push(r)
  }
  return { train, test }
}

const median = arr => {
  if (!arr.length) return null
  const s = [...arr].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
}

// Baseline simple à battre : ratio médian ventes / avis appris par catégorie sur l'entraînement.
// Ce n'est PAS un estimateur publié : seulement la référence de comparaison.
export function fitBaseline(train) {
  const byCat = new Map()
  const all = []
  for (const r of train) {
    if (!(r.reviews > 0) || typeof r.sales !== 'number') continue
    const ratio = r.sales / r.reviews
    byCat.set(r.category, [...(byCat.get(r.category) || []), ratio])
    all.push(ratio)
  }
  const rates = Object.fromEntries([...byCat].map(([k, v]) => [k, median(v)]))
  const globalRate = median(all)
  return {
    id: 'baseline-ratio-median',
    rates,
    globalRate,
    predict: r => {
      const rate = rates[r.category] ?? globalRate
      return rate == null || typeof r.reviews !== 'number' ? null : rate * r.reviews
    },
  }
}

export function evaluate(model, test) {
  const rows = test.map(r => ({ r, p: model.predict(r) })).filter(x => typeof x.p === 'number' && typeof x.r.sales === 'number')
  const errs = rows.map(x => x.p - x.r.sales)
  const mae = errs.length ? errs.reduce((s, e) => s + Math.abs(e), 0) / errs.length : null
  const pct = rows.filter(x => x.r.sales > 0).map(x => Math.abs(x.p - x.r.sales) / x.r.sales)
  const byCategory = {}
  for (const x of rows) {
    const c = (byCategory[x.r.category] ||= { n: 0, absErr: 0, bias: 0 })
    c.n += 1
    c.absErr += Math.abs(x.p - x.r.sales)
    c.bias += x.p - x.r.sales
  }
  for (const c of Object.values(byCategory)) { c.mae = c.absErr / c.n; c.meanBias = c.bias / c.n; delete c.absErr; delete c.bias }
  return {
    n: rows.length,
    skipped: test.length - rows.length,
    mae,
    mape: pct.length ? pct.reduce((s, v) => s + v, 0) / pct.length : null,
    byCategory,
  }
}

export function beatsBaseline(candidateEval, baselineEval) {
  return candidateEval.n > 0 && baselineEval.n > 0 && candidateEval.mae != null && baselineEval.mae != null && candidateEval.mae < baselineEval.mae
}
