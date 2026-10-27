import { test } from 'node:test'
import assert from 'node:assert/strict'
import { listingTrends } from '../../src/lib/etsy/observations.js'

const row = (id, day, views, favorites) => ({ kind: 'listing', entity_id: id, day, at: `${day}T05:00:00.000Z`, vals: { views, favorites } })

test('variation sur ~7 jours entre relevés, correction non calculée, relevé unique sans tendance', () => {
  const t = listingTrends([
    row(1, '2026-10-01', 100, 10), row(1, '2026-10-05', 150, 12), row(1, '2026-10-08', 300, 20),
    row(2, '2026-10-01', 500, 50), row(2, '2026-10-08', 450, 55),
    row(3, '2026-10-08', 10, 1),
  ])
  assert.deepEqual([t.get(1).views, t.get(1).favorites, t.get(1).span], [200, 10, 7])
  assert.equal(t.get(2).views, null)
  assert.equal(t.get(2).favorites, 5)
  assert.equal(t.get(3).span, 0)
})

import { allocateListingSales, shopDailySales } from '../../src/lib/etsy/observations.js'
const shop = (day, sold) => ({ kind: 'shop', entity_id: 9, day, at: `${day}T05:00:00.000Z`, vals: { soldCount: sold } })
const lst = (id, day, views) => ({ kind: 'listing', entity_id: id, shop_id: 9, day, at: `${day}T05:00:00.000Z`, vals: { views, favorites: 0 } })

test('ventes réelles par jour et répartition au prorata des vues gagnées', () => {
  const rows = [shop('2026-10-01', 100), shop('2026-10-02', 104), shop('2026-10-08', 120),
    lst(1, '2026-10-01', 0), lst(1, '2026-10-08', 300), lst(2, '2026-10-01', 0), lst(2, '2026-10-08', 100)]
  assert.deepEqual(shopDailySales(rows).get(9).map(d => d.sales), [4, 16])
  const a = allocateListingSales(rows)
  assert.equal(a.get(1).sales, 15)
  assert.equal(a.get(2).sales, 5)
  assert.equal(a.get(1).shopSales, 20)
})
