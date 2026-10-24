// Habitudes : jours prévus, séries et taux de réussite, calculés depuis state.habitLogs.
import { localDateStr } from '@/lib/backup'

// days : [1..7] (1 = lundi). Vide ou absent = tous les jours.
export function isDue(habit, date) {
  if (!habit.days?.length) return true
  const dow = ((date.getDay() + 6) % 7) + 1
  return habit.days.includes(dow)
}

export function doneOn(logs, habitId, dateStr) {
  return (logs?.[dateStr] || []).includes(habitId)
}

function addDays(date, n) {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

// Jours prévus consécutifs réussis ; aujourd'hui pas encore coché ne casse pas la série.
export function habitStreak(habit, logs, today = new Date()) {
  let streak = 0
  let cursor = new Date(today)
  if (isDue(habit, cursor) && !doneOn(logs, habit.id, localDateStr(cursor))) cursor = addDays(cursor, -1)
  for (let i = 0; i < 400; i++) {
    if (isDue(habit, cursor)) {
      if (!doneOn(logs, habit.id, localDateStr(cursor))) break
      streak++
    }
    cursor = addDays(cursor, -1)
    if (habit.createdAt && cursor < new Date(habit.createdAt.slice(0, 10) + 'T00:00:00')) break
  }
  return streak
}

// Les 7 derniers jours : { date, due, done } du plus ancien au plus récent.
export function lastDays(habit, logs, n = 7, today = new Date()) {
  return Array.from({ length: n }, (_, i) => {
    const d = addDays(today, i - n + 1)
    const ds = localDateStr(d)
    return { date: ds, due: isDue(habit, d), done: doneOn(logs, habit.id, ds) }
  })
}

export function dueToday(habits, today = new Date()) {
  return habits.filter(h => !h.archived && isDue(h, today))
}

export const HABIT_PRESETS = [
  { emoji: '🕌', name: 'Les 5 prières à l’heure' },
  { emoji: '📖', name: 'Lecture 20 min' },
  { emoji: '💪', name: 'Sport', days: [1, 3, 5] },
  { emoji: '🚶', name: 'Marche 30 min' },
  { emoji: '💧', name: '2 L d’eau' },
  { emoji: '🌙', name: 'Couché avant 23 h' },
  { emoji: '📵', name: 'Pas de réseaux avant midi' },
  { emoji: '🧠', name: 'Revue du jour (5 min)' },
]

export const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']
