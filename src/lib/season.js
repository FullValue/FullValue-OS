// Saisons trimestrielles : l'XP gagnée dans le trimestre fixe ton rang (badge de saison).
import { quarterOf } from '@/lib/goals'

export const SEASON_TIERS = [
  { id: 'bronze', label: 'Bronze', emoji: '🥉', min: 0, color: '#C08457' },
  { id: 'argent', label: 'Argent', emoji: '🥈', min: 1500, color: '#9AA3B2' },
  { id: 'or', label: 'Or', emoji: '🥇', min: 4000, color: '#E0A800' },
  { id: 'platine', label: 'Platine', emoji: '💠', min: 8000, color: '#3B6FF0' },
  { id: 'diamant', label: 'Diamant', emoji: '💎', min: 15000, color: '#8B5CF6' },
]

export function tierFor(xp) {
  const tier = [...SEASON_TIERS].reverse().find(t => xp >= t.min)
  const next = SEASON_TIERS.find(t => t.min > xp) || null
  return { ...tier, next, toNext: next ? next.min - xp : 0 }
}

// XP par trimestre à partir de l'XP journalière.
export function seasonsFrom(xpByDay) {
  const byQuarter = {}
  for (const [date, n] of Object.entries(xpByDay)) {
    const q = quarterOf(new Date(date + 'T12:00:00'))
    byQuarter[q] = (byQuarter[q] || 0) + n
  }
  return Object.entries(byQuarter).sort(([a], [b]) => b.localeCompare(a)).map(([quarter, xp]) => ({ quarter, xp, tier: tierFor(xp) }))
}
