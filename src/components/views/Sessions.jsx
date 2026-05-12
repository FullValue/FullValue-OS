import { useState } from 'react'
import { Play, Pause, Square, ChevronDown } from 'lucide-react'
import { useStore } from '../../store/useStore'
import Timer, { formatTime } from '../ui/Timer'
import BarChart from '../ui/BarChart'
import Badge from '../ui/Badge'
import Drawer from '../ui/Drawer'

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
    const color = dominantProjectId ? (getProject(dominantProjectId)?.color || '#6366F1') : '#6366F1'
    return { date, seconds, color }
  })

  const selectedProjectTasks = state.tasks.filter(
    t => t.projectId === timerProject && t.status !== 'done'
  )

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="font-heading font-bold text-white text-2xl mb-8">Sessions</h1>

      {/* Timer block */}
      <div className="bg-white/3 border border-white/5 rounded-2xl p-8 mb-6 text-center">
        <Timer elapsed={elapsed} isRunning={timerRunning} />

        {/* Project + Task selectors */}
        <div className="flex gap-3 mt-6 mb-6">
          <select
            value={timerProject}
            onChange={e => { setTimerProject(e.target.value); setTimerTask('') }}
            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-accent/50"
          >
            <option value="" style={{ background: '#161B22' }}>— Projet —</option>
            {state.projects.map(p => (
              <option key={p.id} value={p.id} style={{ background: '#161B22' }}>{p.name}</option>
            ))}
          </select>
          <select
            value={timerTask}
            onChange={e => setTimerTask(e.target.value)}
            disabled={!timerProject}
            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/70 focus:outline-none focus:ring-2 focus:ring-accent/50 disabled:opacity-40"
          >
            <option value="" style={{ background: '#161B22' }}>— Tâche (opt.) —</option>
            {selectedProjectTasks.map(t => (
              <option key={t.id} value={t.id} style={{ background: '#161B22' }}>{t.title}</option>
            ))}
          </select>
        </div>

        {/* Controls */}
        <div className="flex gap-3 justify-center">
          {!timerRunning && !timerPaused && (
            <button
              onClick={() => onStart(timerProject, timerTask)}
              className="flex items-center gap-2 px-8 py-3 bg-accent hover:bg-accent/90 text-white rounded-xl font-medium transition-all hover:scale-[1.02]"
            >
              <Play size={18} /> Démarrer
            </button>
          )}
          {timerRunning && (
            <>
              <button
                onClick={onPause}
                className="flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/15 text-white rounded-xl font-medium transition-all"
              >
                <Pause size={18} /> Pause
              </button>
              <button
                onClick={handleStop}
                className="flex items-center gap-2 px-6 py-3 bg-red-900/30 hover:bg-red-900/50 text-red-400 rounded-xl font-medium transition-all"
              >
                <Square size={18} /> Stop
              </button>
            </>
          )}
          {timerPaused && (
            <>
              <button
                onClick={onResume}
                className="flex items-center gap-2 px-6 py-3 bg-accent hover:bg-accent/90 text-white rounded-xl font-medium transition-all"
              >
                <Play size={18} /> Reprendre
              </button>
              <button
                onClick={handleStop}
                className="flex items-center gap-2 px-6 py-3 bg-red-900/30 hover:bg-red-900/50 text-red-400 rounded-xl font-medium transition-all"
              >
                <Square size={18} /> Stop & Logger
              </button>
            </>
          )}
        </div>
      </div>

      {/* Imbalance alert */}
      {imbalance && (
        <div className="mb-6 flex items-start gap-3 bg-amber/10 border border-amber/25 rounded-xl px-4 py-3">
          <span className="text-amber text-lg">⚠️</span>
          <p className="text-amber text-sm">Tu sur-investis en Tier 3/4 cette semaine ({Math.round((tier34Seconds / totalWeekSeconds) * 100)}% du temps)</p>
        </div>
      )}

      {/* Weekly summary */}
      <div className="bg-white/3 border border-white/5 rounded-2xl p-5 mb-6">
        <h2 className="text-white/60 text-xs font-medium uppercase tracking-wider mb-4">Cette semaine</h2>
        <div className="grid grid-cols-3 gap-4 mb-5">
          <div>
            <p className="font-mono text-white text-2xl font-medium">{formatDuration(totalWeekSeconds)}</p>
            <p className="text-white/30 text-xs">loggées</p>
          </div>
          <div>
            <p className="font-mono text-white text-2xl font-medium">{weekProjects}</p>
            <p className="text-white/30 text-xs">projet{weekProjects > 1 ? 's' : ''}</p>
          </div>
          <div>
            <p className="font-mono text-white text-2xl font-medium">{weekSessions.length}</p>
            <p className="text-white/30 text-xs">session{weekSessions.length > 1 ? 's' : ''}</p>
          </div>
        </div>
        <BarChart data={chartData} />
      </div>

      {/* Session history */}
      <div>
        <h2 className="text-white/60 text-xs font-medium uppercase tracking-wider mb-3">Historique</h2>
        {state.sessions.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-white/30 text-sm">Aucune session cette semaine — lance ta première avec le timer ☝️</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {state.sessions.map(session => {
              const project = getProject(session.projectId)
              const task = state.tasks.find(t => t.id === session.taskId)
              return (
                <div key={session.id} className="flex items-start gap-3 p-3.5 bg-white/3 border border-white/5 rounded-xl">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      {project && <Badge color={project.color} name={project.name} />}
                      <span className="font-mono text-white/60 text-xs">{formatDuration(session.duration)}</span>
                      <span className="text-white/20 text-xs">
                        {new Date(session.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
                      </span>
                    </div>
                    <p className="text-white/70 text-sm">{session.note}</p>
                    {task && <p className="text-white/30 text-xs mt-0.5">↳ {task.title}</p>}
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
          <div className="bg-white/5 rounded-xl p-4 text-center">
            <p className="font-mono text-white text-3xl font-medium">{formatTime(elapsed)}</p>
            {timerProject && getProject(timerProject) && (
              <div className="mt-2 flex justify-center">
                <Badge color={getProject(timerProject).color} name={getProject(timerProject).name} />
              </div>
            )}
          </div>

          <div>
            <label className="text-white/50 text-xs mb-1 block">Qu'est-ce que tu as produit ? *</label>
            <textarea
              autoFocus
              value={logNote}
              onChange={e => setLogNote(e.target.value)}
              placeholder="Décris ce que tu as accompli..."
              rows={4}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-accent/50 resize-none"
            />
          </div>

          <div className="flex gap-3">
            <select
              value={timerProject}
              onChange={e => setTimerProject(e.target.value)}
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
            >
              {state.projects.map(p => (
                <option key={p.id} value={p.id} style={{ background: '#161B22' }}>{p.name}</option>
              ))}
            </select>
          </div>

          <button
            onClick={handleLog}
            disabled={!logNote.trim()}
            className="w-full bg-accent hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed text-white py-3 rounded-xl font-medium transition-colors"
          >
            Logger la session
          </button>
          <button
            onClick={() => { setLogDrawer(false); onStop() }}
            className="w-full bg-white/5 hover:bg-white/10 text-white/50 py-2.5 rounded-xl text-sm transition-colors"
          >
            Abandonner sans logger
          </button>
        </div>
      </Drawer>
    </div>
  )
}
