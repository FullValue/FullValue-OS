import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildPrayerUrl, parseTimings, prayerConfig, prayerFetchKey, shiftTime } from '../../src/lib/prayerTimes.js'

const sample = { data: { timings: { Fajr: '06:44', Sunrise: '07:56', Dhuhr: '12:36', Asr: '14:53 (CET)', Maghrib: '17:15', Isha: '18:27' } } }

test('réponse Aladhan convertie, décalages appliqués', () => {
  assert.deepEqual(parseTimings(sample, { fajr: 10, isha: -5 }), { fajr: '06:54', shuruq: '07:56', dhuhr: '12:36', asr: '14:53', maghrib: '17:15', isha: '18:22' })
  assert.throws(() => parseTimings({ data: { timings: { Fajr: '06:44' } } }))
})

test('décalage qui passe minuit', () => {
  assert.equal(shiftTime('23:50', 20), '00:10')
  assert.equal(shiftTime('00:05', -10), '23:55')
})

test('Cergy par défaut avec ses coordonnées, autre ville par son nom', () => {
  const cfg = prayerConfig({})
  assert.equal(cfg.enabled, true)
  const date = new Date(2026, 10, 12)
  assert.equal(buildPrayerUrl(cfg, date), 'https://api.aladhan.com/v1/timings/12-11-2026?latitude=49.0364&longitude=2.0761&method=12')
  assert.match(buildPrayerUrl({ ...cfg, city: 'Saint-Denis' }, date), /timingsByCity\/12-11-2026\?city=Saint-Denis&country=France&method=12$/)
})

test('la clé change avec le jour ou un réglage', () => {
  const cfg = prayerConfig({})
  const key = prayerFetchKey(cfg, '2026-11-12')
  assert.notEqual(key, prayerFetchKey(cfg, '2026-11-13'))
  assert.notEqual(key, prayerFetchKey({ ...cfg, offsets: { fajr: 5 } }, '2026-11-12'))
  assert.equal(key, prayerFetchKey({ ...cfg, city: ' CERGY ' }, '2026-11-12'))
})
