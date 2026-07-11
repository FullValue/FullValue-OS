import { useState } from 'react'
import { Play, Pause, Square, Timer as TimerIcon, AlertTriangle } from 'lucide-react'
import { useStore } from '../../store/useStore'
import Timer, { formatTime } from '../ui/Timer'
import BarChart from '../ui/BarChart'
import Badge from '../ui/Badge'
import Drawer from '../ui/Drawer'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/select'
import { EmptyState } from '@/components/ui/empty-state'
import { toast } from '@/lib/toast'

function formatDuration(seconds) {
  if (!seconds) return '0m'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0 && m > 0) return `${h}h ${m}m`
  if (h > 0) return `${h}h`
  return `${m}m`
}

function getLast7Days() {
  const days = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() - i)
    days.push(d.toISOString().slice(0, 10))
  }
  return days
}

export default function Sessions({
  elapsed, timerRunning, timerPaused,
  timerProject, timerTask,
  setTimerProject, setTimerTask,
  onStart, onPause, onResume, onStop
}) {
  const { state, dispatch } = useStore()
  const [logDrawer, setLogDrawer] = useState(false)
  const [logNote, setLogNote] = useState('')

  function handleStop() {
    if (elapsed > 0) {
      setLogDrawer(true)
    } else {
      onStop()
    }
  }

  function handleLog() {
    if (!logNote.trim()) return
    dispatch({
      type: 'LOG_SESSION',
      payload: {
        projectId: timerProject || state.projects[0]?.id,
        taskId: timerTask || undefined,
        duration: elapsed,
        note: logNote.trim(),
      }
    })
    toast.success(`Session loggée — ${formatDuration(elapsed)}`)
    setLogNote('')
    setLogDrawer(false)
    onStop()
  }

  function getProject(id) {
    return state.projects.find(p => p.id === id)
  }

  // Weekly stats
  const weekStart = new Date()
  weekStart.setHours(0, 0, 0, 0)
  weekStart.setDate(weekStart.getDate() - weekStart.getDay())

  const weekSessions = state.sessions.filter(s => new Date(s.date) >= weekStart)
  const totalWeekSeconds = weekSessions.reduce((s, session) => s + session.duration, 0)
  const weekProjects = new Set(weekSessions.map(s => s.projectId)).size

  // Imbalance check
  const tier34Projects = new Set(state.projects.filter(p => p.tier >= 3).map(p => p.id))
  const tier34Seconds = weekSessions.filter(s => tier34Projects.has(s.projectId)).reduce((s, session) => s + session.duration, 0)
  const imbalance = totalWeekSeconds > 0 && (tier34Seconds / totalWeekSeconds) > 0.6

  // Bar chart data - last 7 days
  const last7 = getLast7Days()
  const chartData = last7.map(date => {
    const daySessions = state.sessions.filter(s => s.date.slice(0, 10) === date)
    const seconds = daySessions.reduce((sum, s) => sum + s.duration, 0)
    const dominantProjectId = daySessions.length > 0
      ? daySessions.reduce((a, b) => a.duration > b.duration ? a : b).projectId
      : null
    const color = dominantProjectId ? (getProject(dominantProjectId)?.color || 'var(--violet-deep)') : 'var(--violet-deep)'
    return { date, seconds, color }
  })

  const selectedProjectTasks = state.tasks.filter(
    t => t.projectId === timerProject && t.status !== 'done'
  )

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-8 text-2xl font-semibold tracking-tight text-[var(--text-primary)]">Sessions</h1>

      {/* Timer block */}
      <div className="mb-6 rounded-2xl border border-[var(--border-soft)] bg-[var(--bg-card)] p-8 text-center shadow-[var(--shadow-card)]">
        <Timer elapsed={elapsed} isRunning={timerRunning} />

        {/* Project + Task selectors */}
        <div className="mb-6 mt-6 flex gap-3">
          <NativeSelect
            value={timerProject}
            onChange={e => { setTimerProject(e.target.value); setTimerTask('') }}
          >
            <option value="">— Projet —</option>
            {state.projects.map(p => (
              <option key={p.id} value={p.id}>{p.emoji} {p.name}</option>
            ))}
          </NativeSelect>
          <NativeSelect
            value={timerTask}
            onChange={e => setTimerTask(e.target.value)}
            disabled={!timerProject}
          >
            <option value="">— Tâche (opt.) —</option>
            {selectedProjectTasks.map(t => (
              <option key={t.id} value={t.id}>{t.title}</option>
            ))}
          </NativeSelect>
        </div>

        {/* Controls */}
        <div className="flex justify-center gap-3">
          {!timerRunning && !timerPaused && (
            <Button size="lg" onClick={() => onStart(timerProject, timerTask)} className="px-8 hover:scale-[1.02]">
              <Play size={18} /> Démarrer
            </Button>
          )}
          {timerRunning && (
            <>
              <Button size="lg" variant="secondary" onClick={onPause}>
                <Pause size={18} /> Pause
              </Button>
              <Button size="lg" variant="danger" onClick={handleStop}>
                <Square size={18} /> Stop
              </Button>
            </>
          )}
          {timerPaused && (
            <>
              <Button size="lg" onClick={onResume}>
                <Play size={18} /> Reprendre
              </Button>
              <Button size="lg" variant="danger" onClick={handleStop}>
                <Square size={18} /> Stop & Logger
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Imbalance alert */}
      {imbalance && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-[var(--orange-solid)] bg-[var(--orange-bg)] px-4 py-3">
          <AlertTriangle size={18} className="mt-0.5 shrink-0 text-[var(--orange-deep)]" />
          <p className="text-sm text-[var(--orange-deep)]">Tu sur-investis en Tier 3/4 cette semaine ({Math.round((tier34Seconds / totalWeekSeconds) * 100)}% du temps)</p>
        </div>
      )}

      {/* Weekly summary */}
      <div className="mb-6 rounded-2xl border border-[var(--border-soft)] bg-[var(--bg-card)] p-5 shadow-[var(--shadow-card)]">
        <h2 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-tertiary)]">Cette semaine</h2>
        <div className="mb-5 grid grid-cols-3 gap-4">
          <div>
            <p className="font-mono text-2xl font-medium text-[var(--text-primary)] tabular">{formatDuration(totalWeekSeconds)}</p>
            <p className="text-xs text-[var(--text-tertiary)]">loggées</p>
          </div>
          <div>
            <p className="font-mono text-2xl font-medium text-[var(--text-primary)] tabular">{weekProjects}</p>
            <p className="text-xs text-[var(--text-tertiary)]">projet{weekProjects > 1 ? 's' : ''}</p>
          </div>
          <div>
            <p className="font-mono text-2xl font-medium text-[var(--text-primary)] tabular">{weekSessions.length}</p>
            <p className="text-xs text-[var(--text-tertiary)]">session{weekSessions.length > 1 ? 's' : ''}</p>
          </div>
        </div>
        <BarChart data={chartData} />
      </div>

      {/* Session history */}
      <div>
        <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-tertiary)]">Historique</h2>
        {state.sessions.length === 0 ? (
          <EmptyState
            icon={TimerIcon}
            compact
            title="Aucune session"
            description="Lance ta première session avec le timer ci-dessus."
          />
        ) : (
          <div className="flex flex-col gap-2">
            {state.sessions.map(session => {
              const project = getProject(session.projectId)
              const task = state.tasks.find(t => t.id === session.taskId)
              return (
                <div key={session.id} className="flex items-start gap-3 rounded-xl border border-[var(--border-soft)] bg-[var(--bg-card)] p-3.5 shadow-[var(--shadow-card)]">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      {project && <Badge color={project.color} name={project.name} />}
                      <span className="font-mono text-xs text-[var(--text-secondary)] tabular">{formatDuration(session.duration)}</span>
                      <span className="text-xs text-[var(--text-tertiary)] tabular">
                        {new Date(session.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
                      </span>
                    </div>
                    <p className="text-sm text-[var(--text-secondary)]">{session.note}</p>
                    {task && <p className="mt-0.5 text-xs text-[var(--text-tertiary)]">↳ {task.title}</p>}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Log drawer */}
      <Drawer isOpen={logDrawer} onClose={() => setLogDrawer(false)} title="Logger la session">
        <div className="flex flex-col gap-4">
          <div className="rounded-xl bg-[var(--bg-card-soft)] p-4 text-center">
            <p className="font-mono text-3xl font-medium text-[var(--text-primary)] tabular">{formatTime(elapsed)}</p>
            {timerProject && getProject(timerProject) && (
              <div className="mt-2 flex justify-center">
                <Badge color={getProject(timerProject).color} name={getProject(timerProject).name} />
              </div>
            )}
          </div>

          <div>
            <Label>Qu'est-ce que tu as produit ? *</Label>
            <Textarea
              autoFocus
              value={logNote}
              onChange={e => setLogNote(e.target.value)}
              placeholder="Décris ce que tu as accompli…"
              rows={4}
            />
          </div>

          <NativeSelect value={timerProject} onChange={e => setTimerProject(e.target.value)}>
            {state.projects.map(p => (
              <option key={p.id} value={p.id}>{p.emoji} {p.name}</option>
            ))}
          </NativeSelect>

          <Button onClick={handleLog} disabled={!logNote.trim()} className="w-full">
            Logger la session
          </Button>
          <Button variant="subtle" onClick={() => { setLogDrawer(false); onStop() }} className="w-full">
            Abandonner sans logger
          </Button>
        </div>
      </Drawer>
    </div>
  )
}
