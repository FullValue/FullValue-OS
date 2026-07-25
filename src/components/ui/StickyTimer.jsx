import { useState } from 'react'
import { Play, Pause, Square, Maximize2, ChevronUp } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { Button } from '@/components/ui/button'

function formatTime(s) {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

export default function StickyTimer({
  elapsed, timerRunning, timerPaused, timerProject, timerTask,
  onPause, onResume, onStop, onOpenFocus,
}) {
  const { state } = useStore()
  const [expanded, setExpanded] = useState(false)

  if (!timerRunning && !timerPaused) return null

  const project = state.projects.find(p => p.id === timerProject)
  const task = state.tasks.find(t => t.id === timerTask)
  const accent = project?.color || 'var(--violet-deep)'

  return (
    <div
      className="fixed z-40 transition-all"
      style={{
        bottom: 'max(16px, env(safe-area-inset-bottom, 16px))',
        right: 16,
      }}
    >
      {expanded ? (
        <div className="w-72 rounded-2xl p-3 shadow-2xl"
          style={{ background: 'var(--bg-surface)', border: `1px solid ${accent}40` }}>
          <div className="mb-2 flex items-center justify-between">
            <div className="flex min-w-0 items-center gap-2">
              <div className={`h-2 w-2 flex-shrink-0 rounded-full ${timerRunning ? 'animate-pulse' : ''}`}
                style={{ background: accent }} />
              <span className="truncate text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                {project?.name || 'Sans projet'}
              </span>
            </div>
            <Button variant="ghost" size="icon-sm" onClick={() => setExpanded(false)}>
              <ChevronUp size={14} className="rotate-180" />
            </Button>
          </div>

          {task && (
            <p className="mb-2 truncate text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
              {task.title}
            </p>
          )}

          <p className="mb-3 font-mono text-3xl font-bold tabular-nums" style={{ color: accent }}>
            {formatTime(elapsed)}
          </p>

          <div className="flex items-center gap-1.5">
            {timerRunning ? (
              <Button variant="ghost" onClick={onPause} className="flex-1"
                style={{ background: 'var(--yellow-bg)', color: 'var(--yellow-deep)' }}>
                <Pause size={12} /> Pause
              </Button>
            ) : (
              <Button variant="ghost" onClick={onResume} className="flex-1"
                style={{ background: accent + '20', color: accent }}>
                <Play size={12} /> Reprendre
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={onStop}
              style={{ background: 'var(--red-bg)', color: 'var(--red-deep)' }}>
              <Square size={12} />
            </Button>
            <Button variant="ghost" size="icon" title="Mode focus"
              onClick={() => { setExpanded(false); onOpenFocus?.() }}
              style={{ background: 'var(--bg-card)', color: 'var(--text-secondary)' }}>
              <Maximize2 size={12} />
            </Button>
          </div>
        </div>
      ) : (
        // Pastille repliée : déclencheur pilule sur-mesure (dot + chrono + projet) —
        // la hauteur/padding fixes du Button casseraient la forme, gardé natif.
        <button onClick={() => setExpanded(true)}
          className="flex items-center gap-2 rounded-full py-2.5 pl-3 pr-4 shadow-2xl transition-all hover:scale-105 active:scale-100"
          style={{ background: 'var(--bg-surface)', border: `1px solid ${accent}50` }}>
          <div className={`h-2 w-2 rounded-full ${timerRunning ? 'animate-pulse' : ''}`}
            style={{ background: accent }} />
          <span className="font-mono text-sm font-semibold tabular-nums" style={{ color: accent }}>
            {formatTime(elapsed)}
          </span>
          {project && (
            <span className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>
              · {project.name}
            </span>
          )}
        </button>
      )}
    </div>
  )
}
