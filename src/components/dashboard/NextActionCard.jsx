import { Play, Check, Target } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { pickNextAction } from '@/lib/priorities'

// ── Prochaine action ─────────────────────────────────────────────────────────
// Une seule tâche mise en avant : en cours > fort impact > échéance la plus proche.

export default function NextActionCard({ tasks, projects, dispatch, onStartTask }) {
  const d = new Date()
  const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  const task = pickNextAction(tasks, today)
  const project = task && projects.find(p => p.id === task.projectId)

  if (!task) {
    return (
      <Card className="flex items-center gap-3 p-4">
        <Target size={18} className="shrink-0 text-[var(--text-tertiary)]" />
        <p className="text-sm text-[var(--text-secondary)]">Aucune priorité pour aujourd'hui. Choisis 1 à 3 tâches dans « Priorités du jour » pour démarrer.</p>
      </Card>
    )
  }

  const overdue = task.dueDate && task.dueDate < today
  return (
    <Card className="p-4" style={{ borderColor: project?.color }}>
      <div className="flex flex-wrap items-center gap-3">
        <Target size={18} className="shrink-0" style={{ color: 'var(--violet-deep)' }} />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-tertiary)]">
            Ta prochaine action{project ? ` · ${project.emoji || ''} ${project.name}` : ''}
          </p>
          <p className="truncate text-base font-semibold text-[var(--text-primary)]">{task.title}</p>
          <p className="text-xs text-[var(--text-tertiary)]">
            {task.status === 'inprogress' ? 'En cours' : 'À faire'}
            {task.impact === 'high' ? ' · fort impact' : ''}
            {task.dueDate ? ` · ${overdue ? 'en retard depuis le' : 'échéance'} ${new Date(task.dueDate + 'T12:00:00').toLocaleDateString('fr-FR')}` : ''}
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => onStartTask(task.projectId, task.id)}><Play size={13} /> Focus</Button>
          <Button size="sm" variant="outline" onClick={() => dispatch({ type: 'TOGGLE_TASK_DONE', payload: task.id })}><Check size={13} /> Terminé</Button>
        </div>
      </div>
    </Card>
  )
}
