import { test } from 'node:test'
import assert from 'node:assert/strict'
import { recordObservation, purgeObservations, counterVariations, summarizeVariation, comparableVariations } from '../../src/lib/etsy/observations.js'
import { applyFilters, sortListings, buildComparison, mixedCurrencies, DEFAULT_FILTERS } from '../../src/lib/etsy/filters.js'
import { normalizeListing, normalizeShop } from '../../src/lib/etsy/normalize.js'
import { demoDataset } from '../../src/lib/etsy/demo.js'

const DAY = 86400000
const t0 = Date.parse('2026-10-01T00:00:00Z')
const obs = (shopId, d, sold) => ({ shopId, at: new Date(t0 + d * DAY).toISOString(), values: { soldCount: sold } })

test('variation du compteur : hausse, stable, correction (baisse) et observation manquante', () => {
  const list = [obs(1, 0, 100), obs(1, 7, 130), obs(1, 14, 130), obs(1, 21, 120), obs(1, 28, null)]
  const seg = counterVariations(list, 1)
  assert.deepEqual(seg.map(s => s.kind), ['increase', 'flat', 'correction', 'missing'])
  assert.equal(seg[0].delta, 30)
  assert.equal(seg[2].delta, null, 'une baisse n’est jamais une vente négative')
  assert.equal(summarizeVariation(seg).available, false)
  const ok = summarizeVariation(seg.slice(0, 2))
  assert.equal(ok.available, true)
  assert.equal(ok.delta, 30)
  assert.equal(ok.label, 'Variation du compteur entre deux observations')
})

test('une seule observation ne donne aucune variation (pas d’historique reconstruit)', () => {
  assert.equal(summarizeVariation(counterVariations([obs(1, 0, 100)], 1)).available, false)
})

test('périodes : durées différentes ou trou trop long → non comparables', () => {
  const a = summarizeVariation(counterVariations([obs(1, 0, 10), obs(1, 7, 20)], 1))
  const b = summarizeVariation(counterVariations([obs(2, 0, 10), obs(2, 28, 90)], 2))
  assert.equal(comparableVariations(a, b).ok, false)
  const c = summarizeVariation(counterVariations([obs(3, 0, 10), obs(3, 7, 15)], 3))
  assert.equal(comparableVariations(a, c).ok, true)
})

test('conservation limitée : purge par ancienneté et par nombre', () => {
  const now = t0 + 200 * DAY
  const list = [obs(1, 0, 1), obs(1, 150, 2), obs(1, 190, 3)]
  assert.equal(purgeObservations(list, { now, retentionDays: 90 }).length, 2)
  assert.equal(purgeObservations(list, { now, retentionDays: 365, maxPerShop: 1 }).length, 1)
  const shop = normalizeShop({ shop_id: 1, shop_name: 'X', transaction_sold_count: 5 }, { fetchedAt: new Date(now).toISOString(), now })
  const out = recordObservation(list, shop, { now, retentionDays: 90 })
  assert.equal(out.length, 3)
  assert.equal(out.at(-1).values.soldCount, 5)
  assert.equal(out.at(-1).values.favorites, null, 'compteur absent → null, pas 0')
})

const L = (id, price, cur, fav, extra = {}) => normalizeListing({ listing_id: id, shop_id: 1, title: `Fiche ${id} ${extra.word || ''}`, price: price == null ? undefined : { amount: price * 100, divisor: 100, currency_code: cur }, num_favorers: fav, listing_type: extra.type || 'physical', taxonomy_id: extra.tax ?? 1, tags: extra.tags || [] }, { fetchedAt: '2026-10-26T00:00:00Z' })

test('filtres numériques : une valeur indisponible ne passe pas un filtre actif (sauf option)', () => {
  const ls = [L(1, 10, 'EUR', 5), L(2, null, 'EUR', null), L(3, 50, 'EUR', 100)]
  assert.deepEqual(applyFilters(ls, { ...DEFAULT_FILTERS, priceMin: 5 }).map(l => l.id), [1, 3])
  assert.deepEqual(applyFilters(ls, { ...DEFAULT_FILTERS, priceMin: 5, keepUnavailable: true }).map(l => l.id), [1, 2, 3])
  assert.deepEqual(applyFilters(ls, { ...DEFAULT_FILTERS, favMax: 10 }).map(l => l.id), [1])
  assert.equal(applyFilters(ls, DEFAULT_FILTERS).length, 3, 'sans filtre, tout reste')
})

test('mots inclus / exclus, type numérique / physique', () => {
  const ls = [L(1, 10, 'EUR', 1, { word: 'collier', tags: ['or'] }), L(2, 10, 'EUR', 1, { word: 'planner', type: 'download' })]
  assert.deepEqual(applyFilters(ls, { ...DEFAULT_FILTERS, include: 'collier' }).map(l => l.id), [1])
  assert.deepEqual(applyFilters(ls, { ...DEFAULT_FILTERS, exclude: 'or' }).map(l => l.id), [2])
  assert.deepEqual(applyFilters(ls, { ...DEFAULT_FILTERS, type: 'digital' }).map(l => l.id), [2])
})

test('tri : les indisponibles en dernier dans les deux sens', () => {
  const ls = [L(1, 10, 'EUR', 5), L(2, null, 'EUR', null), L(3, 50, 'EUR', 100)]
  assert.deepEqual(sortListings(ls, 'price', 'desc').map(l => l.id), [3, 1, 2])
  assert.deepEqual(sortListings(ls, 'price', 'asc').map(l => l.id), [1, 3, 2])
})

test('comparaison : devises différentes → montants non comparés ; bornes 2 à 5', () => {
  const a = L(1, 10, 'EUR', 5)
  const b = L(2, 12, 'USD', 9)
  const rows = [
    { label: 'Prix', get: l => l.metrics.price, monetary: true, better: 'low' },
    { label: 'Favoris', get: l => l.metrics.favorites, better: 'high' },
  ]
  const cmp = buildComparison([a, b], rows)
  assert.equal(cmp.sameCurrency, false)
  assert.match(cmp.warning, /Devises différentes/)
  assert.equal(cmp.rows[0].best, null, 'pas de « meilleur prix » entre devises')
  assert.equal(cmp.rows[1].best, 9)
  assert.equal(buildComparison([a], rows).ok, false)
  assert.equal(buildComparison([a, b, a, b, a, b], rows).ok, false)
  assert.deepEqual(mixedCurrencies([a, b]), ['EUR', 'USD'])
})

test('jeu de démonstration : valide, multi-devises, catalogue partiel et valeurs manquantes présentes', () => {
  const d = demoDataset(Date.parse('2026-10-26T12:00:00Z'))
  assert.equal(d.shops.length, 5)
  assert.ok(new Set(d.listings.map(l => l.currency)).size >= 3)
  assert.ok(d.listings.some(l => l.metrics.price.status === 'unavailable'))
  assert.ok(d.listings.some(l => l.category === null))
  assert.ok(d.shops.some(s => s.metrics.reviewCount.status === 'unavailable'))
  assert.ok(d.listings.every(l => l.metrics.estSales.status === 'unavailable'), 'aucune estimation inventée')
  assert.ok(d.listings.every(l => l.metrics.reviews.source === 'Démonstration (synthétique)'), 'la démo ne se présente jamais comme Etsy')
  const plannerLab = d.shops.find(s => s.id === 900003)
  assert.equal(d.listings.filter(l => l.shopId === plannerLab.id).length, 12)
  assert.equal(plannerLab.metrics.activeListings.value, 40)
})
