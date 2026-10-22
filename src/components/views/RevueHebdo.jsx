import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, CalendarCheck, Clock, Trophy, Star, Sun, CalendarPlus, Check, Trash2 } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { localDateStr } from '@/lib/backup'
import { toastUndo } from '@/lib/toast'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

const DAY = 86400000
const STALE_DAYS = 14
const SECTION = 'mb-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-tertiary)]'

function weekBounds(offset) {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7) + offset * 7)
  const end = new Date(start.getTime() + 7 * DAY)
  return { start, end }
}

function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return h ? `${h}h${m ? String(m).padStart(2, '0') : ''}` : `${m} min`
}

function inRange(iso, { start, end }) {
  if (!iso) return false
  const t = new Date(iso).getTime()
  return t >= start.getTime() && t < end.getTime()
}

function Kpi({ Icon, value, label }) {
  return (
    <Card className="p-4">
      <Icon size={15} className="mb-2 text-[var(--text-tertiary)]" />
      <div className="text-2xl font-semibold text-[var(--text-primary)]">{value}</div>
      <div className="text-xs text-[var(--text-tertiary)]">{label}</div>
    </Card>
  )
}

// Ligne de tâche à trier : chaque bouton règle la tâche en un clic.
function TriageRow({ task, project, onToday, onNextWeek, onDone, onDelete, hint }) {
  return (
    <li className="flex flex-wrap items-center gap-2 rounded-xl px-3 py-2 hover:bg-[rgba(var(--ink),0.04)]">
      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: project?.color || 'var(--border-medium)' }} />
      <span className="min-w-0 flex-1 truncate text-sm text-[var(--text-primary)]">{task.title}</span>
      <span className="text-[11px] text-[var(--text-tertiary)]">{hint}</span>
      <div className="flex gap-1">
        <Button size="xs" variant="subtle" onClick={onToday} title="Mettre dans les priorités du jour"><Sun size={12} /> Aujourd'hui</Button>
        <Button size="xs" variant="subtle" onClick={onNextWeek} title="Repousser d'une semaine"><CalendarPlus size={12} /> +1 sem.</Button>
        <Button size="xs" variant="subtle" onClick={onDone} aria-label="Terminer"><Check size={12} /></Button>
        <Button size="xs" variant="subtle" onClick={onDelete} aria-label="Supprimer"><Trash2 size={12} /></Button>
      </div>
    </li>
  )
}

export default function RevueHebdo({ onNavigate }) {
  const { state, dispatch } = useStore()
  const [offset, setOffset] = useState(0)
  const [openedAt] = useState(() => Date.now())
  const week = useMemo(() => weekBounds(offset), [offset])
  const projectsById = useMemo(() => Object.fromEntries(state.projects.map(p => [p.id, p])), [state.projects])

  const done = state.tasks.filter(t => t.status === 'done' && inRange(t.completedAt, week))
  const sessions = state.sessions.filter(s => inRange(s.date, week))
  const focusSeconds = sessions.reduce((sum, s) => sum + (s.duration || 0), 0)
  const reviews = state.dailyReviews.filter(r => !r.skipped && inRange(r.date + 'T12:00:00', week))
  const ratings = reviews.map(r => r.rating).filter(Boolean)
  const avgRating = ratings.length ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1) : '–'
  const wins = reviews.flatMap(r => (r.wins || []).map(w => ({ text: w, date: r.date })))

  const perPole = state.projects.map(p => ({
    project: p,
    done: done.filter(t => t.projectId === p.id).length,
    focus: sessions.filter(s => s.projectId === p.id).reduce((sum, s) => sum + (s.duration || 0), 0),
  }))
  const maxFocus = Math.max(1, ...perPole.map(p => p.focus))

  const today = localDateStr()
  const open = state.tasks.filter(t => t.status !== 'done')
  const overdue = open.filter(t => t.dueDate && t.dueDate < today).sort((a, b) => a.dueDate.localeCompare(b.dueDate))
  const staleLimit = openedAt - STALE_DAYS * DAY
  const stale = open.filter(t => !t.dueDate && !t.today && t.status === 'todo' && new Date(t.createdAt).getTime() < staleLimit)
  const next = weekBounds(offset + 1)
  const upcoming = open.filter(t => t.dueDate && inRange(t.dueDate + 'T12:00:00', next)).sort((a, b) => a.dueDate.localeCompare(b.dueDate))

  const plusWeek = task => {
    const base = task.dueDate && task.dueDate > today ? new Date(task.dueDate + 'T12:00:00') : new Date()
    return localDateStr(new Date(base.getTime() + 7 * DAY))
  }
  const actions = task => ({
    onToday: () => dispatch({ type: 'UPDATE_TASK', payload: { id: task.id, today: true, dueDate: today } }),
    onNextWeek: () => dispatch({ type: 'UPDATE_TASK', payload: { id: task.id, dueDate: plusWeek(task) } }),
    onDone: () => dispatch({ type: 'TOGGLE_TASK_DONE', payload: task.id }),
    onDelete: () => {
      dispatch({ type: 'DELETE_TASK', payload: task.id })
      toastUndo('Tâche supprimée', () => dispatch({ type: 'RESTORE_ITEMS', payload: { tasks: [task] } }))
    },
  })

  const fmt = d => d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  const weekLabel = offset === 0 ? 'Cette semaine' : offset === -1 ? 'Semaine dernière' : `${fmt(week.start)} – ${fmt(new Date(week.end.getTime() - DAY))}`

  return (
    <div className="space-y-6">
      {/* Le coin haut droit est occupé par la recherche et l'apparence : la navigation reste sous le titre */}
      <div className="space-y-2">
        <div>
          <h1 className="font-heading text-2xl font-bold text-[var(--text-primary)]">Revue hebdo</h1>
          <p className="text-sm text-[var(--text-tertiary)]">Fais le point, trie ce qui traîne, prépare la semaine suivante.</p>
        </div>
        <div className="-ml-2 flex items-center gap-1">
          <Button variant="ghost" size="icon-sm" onClick={() => setOffset(o => o - 1)} aria-label="Semaine précédente"><ChevronLeft size={15} /></Button>
          <span className="min-w-[130px] text-center text-sm font-medium text-[var(--text-primary)]">{weekLabel}</span>
          <Button variant="ghost" size="icon-sm" onClick={() => setOffset(o => Math.min(0, o + 1))} disabled={offset === 0} aria-label="Semaine suivante"><ChevronRight size={15} /></Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi Icon={CalendarCheck} value={done.length} label="tâches terminées" />
        <Kpi Icon={Clock} value={formatDuration(focusSeconds)} label="de focus chronométré" />
        <Kpi Icon={Trophy} value={`${reviews.length}/7`} label="journées clôturées" />
        <Kpi Icon={Star} value={avgRating} label="note moyenne des journées" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <p className={SECTION}>Par pôle</p>
          <ul className="space-y-3">
            {perPole.map(({ project, done: n, focus }) => (
              <li key={project.id}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <button type="button" className="text-left font-medium text-[var(--text-primary)] hover:underline" onClick={() => onNavigate('projet_' + project.id)}>
                    {project.emoji} {project.name}
                  </button>
                  <span className="text-xs text-[var(--text-tertiary)]">{n} terminée{n > 1 ? 's' : ''} · {formatDuration(focus)}</span>
                </div>
                <div className="h-1.5 rounded-full bg-[var(--bg-page)]">
                  <div className="h-1.5 rounded-full" style={{ width: `${(focus / maxFocus) * 100}%`, background: project.color }} />
                </div>
              </li>
            ))}
          </ul>
          {focusSeconds === 0 && <p className="mt-3 text-xs text-[var(--text-tertiary)]">Aucune session chronométrée cette semaine : lance le chrono depuis une tâche pour voir où va ton temps.</p>}
        </Card>

        <Card className="p-5">
          <p className={SECTION}>Victoires · {wins.length}</p>
          {wins.length ? (
            <ul className="space-y-2">
              {wins.map((w, i) => (
                <li key={i} className="flex gap-2 text-sm text-[var(--text-primary)]">
                  <Trophy size={14} className="mt-0.5 shrink-0 text-[var(--yellow-deep)]" />
                  <span>{w.text} <span className="text-[11px] text-[var(--text-tertiary)]">· {new Date(w.date + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'short' })}</span></span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-[var(--text-tertiary)]">Les victoires notées en fin de journée s'afficheront ici.</p>
          )}
        </Card>
      </div>

      {offset === 0 && (
        <>
          <Card className="p-5">
            <p className={SECTION}>À trier · en retard ({overdue.length})</p>
            {overdue.length ? (
              <ul className="-mx-3">
                {overdue.map(t => (
                  <TriageRow key={t.id} task={t} project={projectsById[t.projectId]} hint={`prévue le ${new Date(t.dueDate + 'T12:00:00').toLocaleDateString('fr-FR')}`} {...actions(t)} />
                ))}
              </ul>
            ) : <p className="text-sm text-[var(--text-tertiary)]">Rien en retard. 👌</p>}
          </Card>

          <Card className="p-5">
            <p className={SECTION}>À trier · oubliées depuis {STALE_DAYS} jours ({stale.length})</p>
            {stale.length ? (
              <ul className="-mx-3">
                {stale.map(t => (
                  <TriageRow key={t.id} task={t} project={projectsById[t.projectId]} hint="sans échéance" {...actions(t)} />
                ))}
              </ul>
            ) : <p className="text-sm text-[var(--text-tertiary)]">Aucune tâche dormante.</p>}
          </Card>

          <Card className="p-5">
            <p className={SECTION}>Semaine prochaine · {upcoming.length} échéance{upcoming.length > 1 ? 's' : ''}</p>
            {upcoming.length ? (
              <ul className="space-y-1.5">
                {upcoming.map(t => (
                  <li key={t.id} className="flex items-center gap-2 text-sm">
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: projectsById[t.projectId]?.color || 'var(--border-medium)' }} />
                    <span className="w-20 shrink-0 text-xs text-[var(--text-tertiary)]">{new Date(t.dueDate + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' })}</span>
                    <span className="truncate text-[var(--text-primary)]">{t.title}</span>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-[var(--text-tertiary)]">Aucune échéance la semaine prochaine.</p>}
            <div className="mt-4 flex flex-wrap gap-2">
              <Button size="sm" onClick={() => onNavigate('calendrier')}>Planifier dans le calendrier</Button>
              <Button size="sm" variant="outline" onClick={() => onNavigate('inbox')}>Vider l'Inbox ({state.inbox.length})</Button>
            </div>
          </Card>
        </>
      )}
    </div>
  )
}
