import { useState } from 'react'
import { Play, Pause, Square, Maximize2, ChevronUp } from 'lucide-react'
import { useStore } from '@/store/useStore'

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
        <div className="rounded-2xl shadow-2xl p-3 w-72"
          style={{ background: 'var(--bg-surface)', border: `1px solid ${accent}40` }}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${timerRunning ? 'animate-pulse' : ''}`}
                style={{ background: accent }} />
              <span className="text-xs font-medium truncate" style={{ color: 'var(--text-secondary)' }}>
                {project?.name || 'Sans projet'}
              </span>
            </div>
            <button onClick={() => setExpanded(false)}
              className="text-white/30 hover:text-white/60 transition-colors">
              <ChevronUp size={14} className="rotate-180" />
            </button>
          </div>

          {task && (
            <p className="text-[11px] mb-2 truncate" style={{ color: 'var(--text-tertiary)' }}>
              {task.title}
            </p>
          )}

          <p className="font-mono text-3xl font-bold mb-3" style={{ color: accent }}>
            {formatTime(elapsed)}
          </p>

          <div className="flex items-center gap-1.5">
            {timerRunning ? (
              <button onClick={onPause}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium transition-colors"
                style={{ background: 'rgba(255,214,107,0.15)', color: '#FFD66B' }}>
                <Pause size={12} /> Pause
              </button>
            ) : (
              <button onClick={onResume}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium transition-colors"
                style={{ background: accent + '20', color: accent }}>
                <Play size={12} /> Reprendre
              </button>
            )}
            <button onClick={onStop}
              className="flex items-center justify-center w-9 h-9 rounded-xl transition-colors"
              style={{ background: 'rgba(248,113,113,0.15)', color: '#F87171' }}>
              <Square size={12} />
            </button>
            <button onClick={() => { setExpanded(false); onOpenFocus?.() }}
              className="flex items-center justify-center w-9 h-9 rounded-xl transition-colors"
              style={{ background: 'var(--bg-card)', color: 'var(--text-secondary)' }}
              title="Mode focus">
              <Maximize2 size={12} />
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => setExpanded(true)}
          className="flex items-center gap-2 pl-3 pr-4 py-2.5 rounded-full shadow-2xl transition-all hover:scale-105"
          style={{ background: 'var(--bg-surface)', border: `1px solid ${accent}50` }}>
          <div className={`w-2 h-2 rounded-full ${timerRunning ? 'animate-pulse' : ''}`}
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
