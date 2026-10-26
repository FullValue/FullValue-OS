import { test } from 'node:test'
import assert from 'node:assert/strict'
import { observed, computed, estimated, unavailable, numeric, formatMetric, moneyToNumber } from '../../src/lib/etsy/metrics.js'
import { normalizeShop, normalizeListing, normalizeReview, attachReviews, catalogCoverage, parseShopQuery, validateList, EtsyValidationError } from '../../src/lib/etsy/normalize.js'

const NOW = Date.parse('2026-10-26T12:00:00Z')
const at = '2026-10-26T12:00:00.000Z'

test('une donnée absente reste indisponible, jamais 0', () => {
  for (const v of [undefined, null, NaN]) {
    const m = observed(v)
    assert.equal(m.status, 'unavailable')
    assert.equal(m.value, null)
    assert.equal(numeric(m), null)
    assert.equal(formatMetric(m), 'Indisponible')
  }
  assert.equal(observed(0).value, 0, 'un vrai zéro reste zéro')
  assert.equal(observed(0).status, 'observed')
})

test('une estimation exige une méthode', () => {
  assert.throws(() => estimated(12, {}), /méthode/)
  assert.equal(estimated(12, { method: 'm1' }).status, 'estimated')
  assert.equal(computed(null).status, 'unavailable')
  assert.equal(unavailable('x').note, 'x')
})

test('montant Etsy : amount / divisor, et rejet des montants invalides', () => {
  assert.equal(moneyToNumber({ amount: 2599, divisor: 100, currency_code: 'EUR' }), 25.99)
  assert.equal(moneyToNumber({ amount: 2599, divisor: 0 }), null)
  assert.equal(moneyToNumber(undefined), null)
})

test('boutique : champs manquants → indisponibles, période des avis = 12 mois', () => {
  const shop = normalizeShop({ shop_id: 1, shop_name: 'X', currency_code: 'EUR', transaction_sold_count: 50, create_date: NOW / 1000 - 10 * 86400 }, { fetchedAt: at, now: NOW })
  assert.equal(shop.metrics.soldCount.value, 50)
  assert.match(shop.metrics.soldCount.period, /Cumul/)
  assert.equal(shop.metrics.reviewCount.status, 'unavailable')
  assert.equal(shop.metrics.favorites.status, 'unavailable')
  assert.equal(shop.metrics.ageDays.value, 10)
  assert.equal(shop.metrics.reviewCount.period, '12 derniers mois')
})

test('validation : réponses invalides rejetées', () => {
  assert.throws(() => normalizeShop({ shop_name: 'X' }), EtsyValidationError)
  assert.throws(() => normalizeListing({ listing_id: 3, shop_id: 1 }), /title/)
  assert.throws(() => validateList({ results: 'nope' }), EtsyValidationError)
  assert.throws(() => normalizeReview({ rating: 5 }), EtsyValidationError)
})

test('fiche : prix minimum dans sa devise, favoris non convertis en ventes, estimations indisponibles', () => {
  const l = normalizeListing({ listing_id: 9, shop_id: 1, title: 'Collier', price: { amount: 1500, divisor: 100, currency_code: 'GBP' }, has_variations: true, listing_type: 'physical', taxonomy_id: 5 }, { fetchedAt: at, now: NOW, taxonomy: { 5: 'Bijoux' } })
  assert.equal(l.metrics.price.value, 15)
  assert.equal(l.metrics.price.currency, 'GBP')
  assert.match(l.metrics.price.note, /variantes/)
  assert.equal(l.category, 'Bijoux')
  assert.equal(l.metrics.favorites.status, 'unavailable')
  assert.equal(l.metrics.estSales.status, 'unavailable')
  assert.equal(l.metrics.estRevenue.status, 'unavailable')
  assert.equal(l.metrics.reviews.status, 'unavailable')
})

test('avis : décompte partiel signalé, fiche sans avis = 0 calculé sur la période lue', () => {
  const ls = [1, 2].map(id => normalizeListing({ listing_id: id, shop_id: 1, title: `T${id}` }, { fetchedAt: at, now: NOW }))
  const rv = [normalizeReview({ listing_id: 1, shop_id: 1, rating: 5, create_timestamp: NOW / 1000 - 86400 })]
  const out = attachReviews(ls, rv, { complete: false, from: '2025-10-26', fetched: 1, total: 30 }, at)
  assert.equal(out[0].metrics.reviews.value, 1)
  assert.equal(out[1].metrics.reviews.value, 0)
  assert.equal(out[1].metrics.reviews.status, 'computed')
  assert.match(out[0].metrics.reviews.note, /partiel/)
})

test('catalogue partiel : couverture calculée, inconnue si le total manque', () => {
  const shop = normalizeShop({ shop_id: 1, shop_name: 'X', listing_active_count: 40 }, { fetchedAt: at, now: NOW })
  const ls = Array.from({ length: 12 }, (_, i) => normalizeListing({ listing_id: i + 1, shop_id: 1, title: 'x' }, { fetchedAt: at }))
  assert.deepEqual(catalogCoverage(shop, ls), { fetched: 12, announced: 40, complete: false, ratio: 0.3 })
  const noCount = normalizeShop({ shop_id: 2, shop_name: 'Y' }, { fetchedAt: at })
  assert.equal(catalogCoverage(noCount, []).complete, null)
})

test('recherche : nom, identifiant, URL boutique, URL fiche', () => {
  assert.deepEqual(parseShopQuery('123456'), { kind: 'shopId', value: 123456 })
  assert.deepEqual(parseShopQuery('https://www.etsy.com/fr/shop/MaBoutique?ref=x'), { kind: 'shopName', value: 'MaBoutique' })
  assert.deepEqual(parseShopQuery('https://www.etsy.com/listing/987654321/collier'), { kind: 'listingId', value: 987654321 })
  assert.deepEqual(parseShopQuery('MaBoutique'), { kind: 'shopName', value: 'MaBoutique' })
  assert.equal(parseShopQuery('   '), null)
})
