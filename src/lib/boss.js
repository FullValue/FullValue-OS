// Boss de la semaine : un gros défi hebdo, choisi selon la semaine. Sa vie descend à mesure
// que tu avances ; vaincu, il rapporte une grosse récompense (XP + pièces).
import { localDateStr } from '@/lib/backup'

export const BOSS_REWARD = { xp: 300, coins: 100 }

const inWeek = (iso, w) => { if (!iso) return false; const t = new Date(iso).getTime(); return t >= w.start && t < w.end }

export const BOSSES = [
  { id: 'hydre', emoji: '🐉', name: "L'Hydre de la procrastination", goal: 10, unit: 'tâches à fort impact',
    measure: (s, w) => s.tasks.filter(t => t.status === 'done' && t.impact === 'high' && inWeek(t.completedAt, w)).length },
  { id: 'golem', emoji: '🗿', name: 'Le Golem du focus', goal: 600, unit: 'min de focus',
    measure: (s, w) => Math.round(s.sessions.filter(x => inWeek(x.date, w)).reduce((sum, x) => sum + (x.duration || 0), 0) / 60) },
  { id: 'spectre', emoji: '👻', name: 'Le Spectre des devis', goal: 3, unit: 'devis envoyés',
    measure: (s, w) => (s.clientInvoices || []).filter(i => i.kind === 'quote' && ['sent', 'accepted'].includes(i.status) && inWeek((i.date || '') + 'T12:00:00', w)).length },
  { id: 'kraken', emoji: '🦑', name: 'Le Kraken des routines', goal: 25, unit: 'routines cochées',
    measure: (s, w) => Object.entries(s.habitLogs || {}).filter(([d]) => inWeek(d + 'T12:00:00', w)).reduce((sum, [, ids]) => sum + ids.length, 0) },
  { id: 'titan', emoji: '⚔️', name: 'Le Titan des tâches', goal: 20, unit: 'tâches terminées',
    measure: (s, w) => s.tasks.filter(t => t.status === 'done' && inWeek(t.completedAt, w)).length },
  { id: 'sphinx', emoji: '🦁', name: 'Le Sphinx des prières', goal: 30, unit: "prières à l'heure",
    measure: (s, w) => Object.entries(s.prayerLogs || {}).filter(([d]) => inWeek(d + 'T12:00:00', w)).reduce((sum, [, log]) => sum + Object.values(log).filter(v => v === 'ontime').length, 0) },
]

export function weekBounds(date = new Date()) {
  const start = new Date(date)
  start.setHours(0, 0, 0, 0)
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7))
  return { start: start.getTime(), end: start.getTime() + 7 * 86400000, key: localDateStr(start) }
}

export function bossOfWeek(date = new Date()) {
  const w = weekBounds(date)
  const idx = Math.floor(w.start / (7 * 86400000))
  return { ...BOSSES[((idx % BOSSES.length) + BOSSES.length) % BOSSES.length], week: w }
}

export function bossStatus(state, date = new Date()) {
  const boss = bossOfWeek(date)
  const value = boss.measure(state, boss.week)
  const hp = Math.max(0, boss.goal - value)
  return { ...boss, value, hp, hpPct: Math.round((hp / boss.goal) * 100), defeated: hp === 0, claimed: !!state.game?.bossClaims?.[boss.week.key] }
}
