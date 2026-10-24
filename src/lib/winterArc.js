// Winter Arc : une période de discipline renforcée (par défaut jusqu'au 31 décembre).
// Pendant l'Arc : XP doublée, une journée ne compte que si l'objectif de focus est atteint
// et toutes les routines sont faites, et le boss de la semaine devient un boss de glace.
// Réglages dans state.settings.winterArc = { active, startDate, endDate, focusGoalMin, snow, completed }.
import { localDateStr } from '@/lib/backup'

export const ARC_DEFAULT_FOCUS_MIN = 180
// Altitude du sommet de la montagne d'ascension (Mont Blanc) : tous les jours validés = sommet.
export const ARC_SUMMIT_M = 4808

export const ARC_DURATIONS = [
  { id: 'year-end', label: 'Jusqu’au 31 décembre' },
  { id: '30', label: '30 jours', days: 30 },
  { id: '60', label: '60 jours', days: 60 },
  { id: '90', label: '90 jours', days: 90 },
]

export function arcEndDate(durationId, start = new Date()) {
  const d = ARC_DURATIONS.find(x => x.id === durationId)
  if (d?.days) {
    const end = new Date(start)
    end.setDate(end.getDate() + d.days - 1)
    return localDateStr(end)
  }
  return `${start.getFullYear()}-12-31`
}

function daysBetween(a, b) {
  return Math.round((new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00')) / 86400000)
}

// État de l'Arc à une date donnée.
export function arcInfo(state, now = new Date()) {
  const arc = state.settings?.winterArc
  if (!arc?.startDate || !arc?.endDate) return { active: false }
  const today = localDateStr(now)
  const totalDays = daysBetween(arc.startDate, arc.endDate) + 1
  const dayIndex = Math.min(totalDays, Math.max(1, daysBetween(arc.startDate, today) + 1))
  return {
    active: !!arc.active && today >= arc.startDate && today <= arc.endDate,
    finished: !!arc.active && today > arc.endDate,
    completed: !!arc.completed,
    startDate: arc.startDate,
    endDate: arc.endDate,
    totalDays,
    dayIndex,
    daysLeft: Math.max(0, daysBetween(today, arc.endDate)),
    focusGoalMin: Number(arc.focusGoalMin) || ARC_DEFAULT_FOCUS_MIN,
    snow: arc.snow !== false,
    inArc: date => !!arc.active && date >= arc.startDate && date <= arc.endDate,
  }
}

export const ARC_QUOTES = [
  'La discipline, c’est choisir entre ce que tu veux maintenant et ce que tu veux le plus.',
  'Personne ne viendra le faire à ta place.',
  'Les champions se construisent quand personne ne regarde.',
  'Petit effort quotidien, résultat monumental.',
  'Ton futur toi te remercie pour chaque séance d’aujourd’hui.',
  'Le confort est l’ennemi de la progression.',
  'Fais-le fatigué. Fais-le sans envie. Mais fais-le.',
  'Un hiver de travail, une année de résultats.',
  'La motivation te lance, l’habitude te garde en route.',
  'Moins de bruit, plus de travail.',
  'Chaque jour coché est une promesse tenue envers toi-même.',
  'Tu n’as pas besoin de plus de temps, tu as besoin de plus de focus.',
  'Le froid forge le caractère.',
  'Ce que tu fais en silence finit par parler pour toi.',
  'Sois l’énergie que tu veux attirer.',
  'Gagne la matinée, gagne la journée.',
  'Le travail bat le talent quand le talent ne travaille pas.',
  'Rappelle-toi pourquoi tu as commencé.',
  'Une séance de plus que la semaine dernière.',
  'Le succès est la somme de petits efforts répétés jour après jour.',
  'Pas de zéro aujourd’hui.',
  'L’excellence n’est pas un acte, c’est une habitude.',
  'Tu es plus fort que tes excuses.',
  'Construis en hiver ce que les autres verront au printemps.',
  'Focus. Prière. Exécution.',
  'La régularité est ton super-pouvoir.',
  'Un jour ou jour un : c’est toi qui décides.',
  'Le meilleur moment pour commencer, c’était hier. Le deuxième, c’est maintenant.',
  'Sors de ta zone de confort, c’est là que tout se passe.',
  'L’Arc se termine. Toi, tu continues.',
]

export function quoteOfDay(date = new Date()) {
  const idx = Math.floor(new Date(localDateStr(date) + 'T12:00:00').getTime() / 86400000)
  return ARC_QUOTES[((idx % ARC_QUOTES.length) + ARC_QUOTES.length) % ARC_QUOTES.length]
}
