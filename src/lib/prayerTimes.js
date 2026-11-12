// Horaires de prière automatiques via l'API gratuite Aladhan (sans clé) : https://aladhan.com/prayer-times-api
// Cergy par défaut (coordonnées fixes, plus fiable que la recherche par nom) ; une autre ville passe par son nom.
// Les décalages (minutes par prière) servent à coller aux horaires affichés par ta mosquée.

export const PRAYER_KEYS = ['fajr', 'shuruq', 'dhuhr', 'asr', 'maghrib', 'isha']

export const PRAYER_METHODS = [
  { id: 12, label: 'Musulmans de France (12°)' },
  { id: 2, label: 'ISNA (15°)' },
  { id: 3, label: 'Ligue islamique mondiale (18°)' },
]

const CERGY = { latitude: 49.0364, longitude: 2.0761 }

export const PRAYER_AUTO_DEFAULTS = { enabled: true, city: 'Cergy', country: 'France', method: 12, offsets: {} }

export function prayerConfig(settings) {
  const saved = settings?.prayerAuto || {}
  return { ...PRAYER_AUTO_DEFAULTS, ...saved, offsets: { ...(saved.offsets || {}) } }
}

// Change dès que le jour ou un réglage change : sert à savoir s'il faut redemander les horaires.
export function prayerFetchKey(cfg, dateStr) {
  const offsets = PRAYER_KEYS.map(k => Number(cfg.offsets?.[k]) || 0).join(',')
  return `${dateStr}|${String(cfg.city || '').trim().toLowerCase()}|${cfg.method}|${offsets}`
}

export function buildPrayerUrl(cfg, date = new Date()) {
  const day = `${String(date.getDate()).padStart(2, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${date.getFullYear()}`
  const city = String(cfg.city || '').trim()
  const method = encodeURIComponent(cfg.method ?? 12)
  if (!city || city.toLowerCase() === 'cergy') {
    return `https://api.aladhan.com/v1/timings/${day}?latitude=${CERGY.latitude}&longitude=${CERGY.longitude}&method=${method}`
  }
  return `https://api.aladhan.com/v1/timingsByCity/${day}?city=${encodeURIComponent(city)}&country=${encodeURIComponent(cfg.country || 'France')}&method=${method}`
}

export function shiftTime(hhmm, minutes = 0) {
  const [h, m] = hhmm.split(':').map(Number)
  const total = (((h * 60 + m + (Number(minutes) || 0)) % 1440) + 1440) % 1440
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

// Réponse Aladhan → { fajr: 'HH:MM', shuruq, dhuhr, asr, maghrib, isha }, décalages appliqués.
export function parseTimings(json, offsets = {}) {
  const t = json?.data?.timings
  const source = { fajr: t?.Fajr, shuruq: t?.Sunrise, dhuhr: t?.Dhuhr, asr: t?.Asr, maghrib: t?.Maghrib, isha: t?.Isha }
  const out = {}
  for (const key of PRAYER_KEYS) {
    const match = /^(\d{1,2}):(\d{2})/.exec(String(source[key] || ''))
    if (!match) throw new Error('Réponse inattendue du service des horaires.')
    out[key] = shiftTime(`${match[1].padStart(2, '0')}:${match[2]}`, offsets[key])
  }
  return out
}

export async function fetchPrayerTimes(cfg, date = new Date()) {
  const res = await fetch(buildPrayerUrl(cfg, date), { signal: AbortSignal.timeout(12000) })
  if (!res.ok) throw new Error(res.status === 400 || res.status === 404 ? `Ville introuvable : ${cfg.city}` : `Le service des horaires a répondu ${res.status}.`)
  return parseTimings(await res.json(), cfg.offsets)
}
