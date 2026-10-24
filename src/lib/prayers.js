// Suivi des prières : quelles prières sont passées depuis assez longtemps pour demander si elles ont été faites.
import { localDateStr } from '@/lib/backup'

export const PRAYERS = [
  { id: 'fajr', label: 'Fajr' },
  { id: 'dhuhr', label: 'Dhuhr' },
  { id: 'asr', label: 'Asr' },
  { id: 'maghrib', label: 'Maghrib' },
  { id: 'isha', label: 'Isha' },
]
export const PRAYER_XP = { ontime: 5, late: 2, missed: 0 }
export const CHECK_DELAY_MIN = 30

function toMin(hhmm = '00:00') {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + (m || 0)
}

// Prières d'aujourd'hui dont l'heure + 30 min est passée et qui n'ont pas encore de réponse.
export function pendingPrayers(state, now = new Date()) {
  const times = state.settings?.prayerTimes || {}
  const today = localDateStr(now)
  const log = state.prayerLogs?.[today] || {}
  const nowMin = now.getHours() * 60 + now.getMinutes()
  return PRAYERS.filter(p => times[p.id] && !log[p.id] && nowMin >= toMin(times[p.id]) + CHECK_DELAY_MIN)
    .map(p => ({ ...p, time: times[p.id] }))
}

export function prayerXpByDay(state) {
  const out = {}
  for (const [date, log] of Object.entries(state.prayerLogs || {})) {
    out[date] = Object.values(log).reduce((s, st) => s + (PRAYER_XP[st] || 0), 0)
  }
  return out
}
