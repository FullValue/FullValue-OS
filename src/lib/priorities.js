// Sélection des tâches qui méritent l'attention maintenant, partagée par le bandeau
// « À traiter », les notifications et le tableau de bord.
import { localDateStr } from '@/lib/backup'

export function urgency(task, today) {
  if (task.dueDate && task.dueDate < today) return 'overdue'
  if (task.dueDate === today) return 'today'
  if (task.status === 'inprogress') return 'inprogress'
  if (task.today) return 'priority'
  if (task.impact === 'high') return 'high'
  return null
}

const ORDER = { overdue: 0, today: 1, inprogress: 2, priority: 3, high: 4 }

export function topTasks(tasks, limit = 6, today = localDateStr()) {
  return tasks
    .filter(t => t.status !== 'done')
    .map(t => ({ task: t, level: urgency(t, today) }))
    .filter(x => x.level)
    .sort((a, b) => ORDER[a.level] - ORDER[b.level] || (a.task.dueDate || '9999').localeCompare(b.task.dueDate || '9999'))
    .slice(0, limit)
}

export const URGENCY_LABEL = {
  overdue: 'En retard',
  today: "Échéance aujourd'hui",
  inprogress: 'En cours',
  priority: 'Priorité du jour',
  high: 'Fort impact',
}

export const URGENCY_COLOR = {
  overdue: 'var(--red-deep)',
  today: 'var(--orange-deep)',
  inprogress: 'var(--accent)',
  priority: 'var(--accent)',
  high: 'var(--yellow-deep)',
}

export function initials(name = '') {
  return name.replace(/[^\p{L}\s]/gu, ' ').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('') || '?'
}

export function timeAgo(ms) {
  const min = Math.round((Date.now() - ms) / 60000)
  if (min < 60) return `il y a ${Math.max(1, min)} min`
  const h = Math.round(min / 60)
  if (h < 24) return `il y a ${h} h`
  return `il y a ${Math.round(h / 24)} j`
}
