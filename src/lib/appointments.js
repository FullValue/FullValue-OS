// Rendez-vous : calculs purs (début, fin, tri, rappels). Un RDV = { title, date 'AAAA-MM-JJ', time 'HH:MM',
// duration (secondes), clientId?, projectId?, location?, link?, note?, reminderMin? }.

export const DEFAULT_REMINDER_MIN = 15
export const REMINDER_OPTIONS = [
  { value: '', label: 'Aucun rappel' },
  { value: 5, label: '5 min avant' },
  { value: 15, label: '15 min avant' },
  { value: 30, label: '30 min avant' },
  { value: 60, label: '1 h avant' },
  { value: 1440, label: 'La veille' },
]
export const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120, 180]

export function startOf(a) {
  return new Date(`${a.date}T${a.time || '09:00'}:00`)
}

export function endOf(a) {
  return new Date(startOf(a).getTime() + (a.duration || 3600) * 1000)
}

export function durationLabel(seconds) {
  const m = Math.round((seconds || 3600) / 60)
  if (m < 60) return `${m} min`
  return m % 60 ? `${Math.floor(m / 60)} h ${m % 60}` : `${m / 60} h`
}

// À venir (pas encore terminés) du plus proche au plus lointain ; passés du plus récent au plus ancien.
export function splitAppointments(list, now = new Date()) {
  const valid = (list || []).filter(a => a.date)
  const upcoming = valid.filter(a => endOf(a) >= now).sort((a, b) => startOf(a) - startOf(b))
  const past = valid.filter(a => endOf(a) < now).sort((a, b) => startOf(b) - startOf(a))
  return { upcoming, past }
}

// Rappels à déclencher maintenant : on est dans la fenêtre [début − rappel, début + 5 min].
export function dueReminders(list, now = new Date()) {
  return (list || []).filter(a => {
    if (!a.date || a.reminderMin === null || a.reminderMin === '') return false
    const lead = (a.reminderMin ?? DEFAULT_REMINDER_MIN) * 60000
    const start = startOf(a).getTime()
    return now.getTime() >= start - lead && now.getTime() <= start + 5 * 60000
  })
}

export function reminderKey(a) {
  return `${a.id}@${a.date}T${a.time || ''}`
}

export function relativeDay(dateStr, now = new Date()) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const [y, m, d] = dateStr.split('-').map(Number)
  const diff = Math.round((new Date(y, m - 1, d) - today) / 86400000)
  if (diff === 0) return "Aujourd'hui"
  if (diff === 1) return 'Demain'
  if (diff === -1) return 'Hier'
  const label = new Date(y, m - 1, d).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', ...(y !== now.getFullYear() ? { year: 'numeric' } : {}) })
  return label.charAt(0).toUpperCase() + label.slice(1)
}
