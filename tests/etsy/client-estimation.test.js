import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createEtsyClient, readQuota, flattenTaxonomy, EtsyApiError } from '../../server/etsy/client.js'
import { EtsyValidationError, normalizeListing } from '../../src/lib/etsy/normalize.js'
import { estimateListingSales, revenueScenario, registerModel, splitByShopAndPeriod, fitBaseline, evaluate, beatsBaseline, signalAvailability } from '../../src/lib/etsy/estimation.js'
import { observed } from '../../src/lib/etsy/metrics.js'

// Faux fetch : rejoue une suite de réponses { status, body, headers }.
function fakeFetch(responses, calls = []) {
  let i = 0
  return async (url, init) => {
    calls.push({ url, headers: init.headers })
    const r = responses[Math.min(i++, responses.length - 1)]
    return {
      status: r.status ?? 200,
      ok: (r.status ?? 200) < 400,
      headers: new Map(Object.entries(r.headers || {})),
      json: async () => r.body,
    }
  }
}
const noSleep = []
const sleep = ms => { noSleep.push(ms); return Promise.resolve() }

test('clé envoyée en en-tête x-api-key « keystring:secret », jamais dans l’URL', async () => {
  const calls = []
  const c = createEtsyClient({ apiKey: 'KEY', sharedSecret: 'SECRET', fetchImpl: fakeFetch([{ body: { shop_id: 1, shop_name: 'X' } }], calls), sleep })
  await c.getShop(1)
  assert.equal(calls[0].headers['x-api-key'], 'KEY:SECRET')
  assert.ok(!calls[0].url.includes('KEY') && !calls[0].url.includes('SECRET'))
})

test('connecteur non configuré : erreur explicite', () => {
  assert.throws(() => createEtsyClient({}), EtsyApiError)
})

test('429 : respecte retry-after puis réessaie', async () => {
  noSleep.length = 0
  const c = createEtsyClient({ apiKey: 'k', sharedSecret: 's', sleep, fetchImpl: fakeFetch([
    { status: 429, headers: { 'retry-after': '2', 'x-remaining-today': '50' } },
    { body: { shop_id: 1, shop_name: 'X' }, headers: { 'x-remaining-today': '49', 'x-limit-per-day': '100' } },
  ]) })
  const shop = await c.getShop(1)
  assert.equal(shop.shop_id, 1)
  assert.ok(noSleep[0] >= 2000, 'attend au moins retry-after')
  assert.equal(c.quota().remainingToday, 49)
})

test('quota journalier épuisé : arrêt immédiat avec erreur claire', async () => {
  const c = createEtsyClient({ apiKey: 'k', sharedSecret: 's', sleep, fetchImpl: fakeFetch([{ status: 429, headers: { 'retry-after': '3600', 'x-remaining-today': '0' } }]) })
  await assert.rejects(c.getShop(1), err => err instanceof EtsyApiError && err.code === 'rate_limited' && /journalier/.test(err.message) && err.retryAfter === 3600)
})

test('retry-after trop long : pas d’attente bloquante', async () => {
  const c = createEtsyClient({ apiKey: 'k', sharedSecret: 's', sleep, fetchImpl: fakeFetch([{ status: 429, headers: { 'retry-after': '120', 'x-remaining-today': '10' } }]) })
  await assert.rejects(c.getShop(1), err => err.code === 'rate_limited')
})

test('403 : application non approuvée / permission manquante', async () => {
  const c = createEtsyClient({ apiKey: 'k', sharedSecret: 's', sleep, fetchImpl: fakeFetch([{ status: 403, body: { error: 'x' } }]) })
  await assert.rejects(c.getShop(1), err => err.code === 'forbidden')
})

test('pagination : lit toutes les pages, s’arrête au plafond, signale l’incomplétude', async () => {
  const page = (n, offset) => ({ body: { count: 250, results: Array.from({ length: n }, (_, i) => ({ listing_id: offset + i + 1 })) } })
  const calls = []
  const c = createEtsyClient({ apiKey: 'k', sharedSecret: 's', sleep, fetchImpl: fakeFetch([page(100, 0), page(100, 100), page(50, 200)], calls) })
  const all = await c.getActiveListings(1, { maxItems: 500 })
  assert.equal(all.results.length, 250)
  assert.equal(all.complete, true)
  assert.match(calls[1].url, /offset=100/)
  const c2 = createEtsyClient({ apiKey: 'k', sharedSecret: 's', sleep, fetchImpl: fakeFetch([page(100, 0), page(100, 100)]) })
  const capped = await c2.getActiveListings(1, { maxItems: 150 })
  assert.equal(capped.results.length, 150)
  assert.equal(capped.complete, false)
})

test('réponse invalide : erreur de validation', async () => {
  const c = createEtsyClient({ apiKey: 'k', sharedSecret: 's', sleep, fetchImpl: fakeFetch([{ body: { nope: true } }]) })
  await assert.rejects(c.getActiveListings(1), EtsyValidationError)
})

test('cache : une seconde lecture identique n’appelle pas Etsy, expiration respectée', async () => {
  let t = 0
  const calls = []
  const c = createEtsyClient({ apiKey: 'k', sharedSecret: 's', sleep, now: () => t, fetchImpl: fakeFetch([{ body: { shop_id: 1, shop_name: 'X' } }], calls) })
  await c.getShop(1); await c.getShop(1)
  assert.equal(calls.length, 1)
  t = 25 * 3600e3
  await c.getShop(1)
  assert.equal(calls.length, 2)
})

test('quotas : en-têtes lus, absents → null', () => {
  assert.deepEqual(readQuota(new Map([['x-limit-per-day', '100']])), { limitPerSecond: null, remainingThisSecond: null, limitPerDay: 100, remainingToday: null })
})

test('catégories : arbre aplati en chemins', () => {
  const t = flattenTaxonomy({ count: 1, results: [{ id: 1, name: 'Bijoux', children: [{ id: 2, name: 'Colliers', children: [] }] }] })
  assert.deepEqual(t, { 1: 'Bijoux', 2: 'Bijoux › Colliers' })
})

// ── Moteur d'estimation ─────────────────────────────────────────────

const listing = normalizeListing({ listing_id: 1, shop_id: 1, title: 'x', price: { amount: 2000, divisor: 100, currency_code: 'EUR' }, taxonomy_id: 3 }, { fetchedAt: '2026-10-26T00:00:00Z' })

test('aucun modèle validé → « Estimation non disponible », CA indisponible', () => {
  const est = estimateListingSales(listing)
  assert.equal(est.status, 'unavailable')
  assert.match(est.note, /non disponible/i)
  assert.equal(revenueScenario(est, listing.metrics.price).status, 'unavailable')
})

test('un modèle non validé est refusé', () => {
  assert.throws(() => registerModel({ id: 'x', predict: () => ({ value: 1 }), validation: { beatsBaseline: false } }), /refusé/)
  assert.throws(() => registerModel({ id: 'x', predict: () => ({ value: 1 }), validation: { beatsBaseline: true, heldOutShops: 3, heldOutPeriods: 2, errorsByCategory: {} } }), /refusé/, 'consentement à la calibration exigé')
})

test('CA = scénario brut ventes estimées × prix, étiqueté comme tel', () => {
  const fakeModel = { id: 'm-test', validation: { beatsBaseline: true, heldOutShops: 3, heldOutPeriods: 2, errorsByCategory: {} }, period: '30 jours', predict: () => ({ value: 4 }) }
  const est = estimateListingSales(listing, {}, [fakeModel])
  assert.equal(est.status, 'estimated')
  const ca = revenueScenario(est, listing.metrics.price)
  assert.equal(ca.value, 80)
  assert.equal(ca.currency, 'EUR')
  assert.match(ca.note, /Ni CA réel, ni bénéfice/)
  assert.equal(revenueScenario(est, observed(null)).status, 'unavailable')
})

test('signaux : le suivi de compteur exige l’autorisation et 2 observations', () => {
  assert.equal(signalAvailability(listing, { trackingAllowed: false, observationCount: 5 }).shopCounter, false)
  assert.equal(signalAvailability(listing, { trackingAllowed: true, observationCount: 2 }).shopCounter, true)
  assert.equal(signalAvailability(listing).reviewsDated, false)
})

test('découpage de validation sans fuite : aucune boutique ni période partagée', () => {
  const recs = []
  for (let s = 1; s <= 40; s++) for (const p of ['2026-01-01', '2026-04-01', '2026-07-01', '2026-10-01']) recs.push({ shopId: s, periodStart: p, category: s % 2 ? 'A' : 'B', reviews: 5, sales: 20 + s })
  const { train, test: held } = splitByShopAndPeriod(recs, { cutoff: '2026-07-01' })
  assert.ok(train.length > 0 && held.length > 0)
  const trainShops = new Set(train.map(r => r.shopId))
  assert.ok(held.every(r => !trainShops.has(r.shopId)), 'boutiques de test absentes de l’entraînement')
  assert.ok(train.every(r => r.periodStart < '2026-07-01') && held.every(r => r.periodStart >= '2026-07-01'))
  const base = fitBaseline(train)
  const ev = evaluate(base, held)
  assert.equal(ev.n, held.length)
  assert.ok(ev.byCategory.A || ev.byCategory.B)
  assert.equal(beatsBaseline(ev, ev), false, 'égaler la baseline ne suffit pas')
})
