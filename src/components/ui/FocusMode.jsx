import { useEffect, useState, useRef } from 'react'
import { Play, Pause, Square, X, Coffee } from 'lucide-react'
import { useStore } from '@/store/useStore'

function formatTime(s) {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

const POMODORO_WORK = 25 * 60
const POMODORO_BREAK = 5 * 60

export default function FocusMode({
  isOpen, onClose,
  elapsed, timerRunning, timerPaused, timerProject, timerTask,
  onPause, onResume, onStop,
}) {
  const { state } = useStore()
  const [pomodoroOn, setPomodoroOn] = useState(false)
  const [mode, setMode] = useState('work')
  const [cycleStart, setCycleStart] = useState(0)
  const [cycles, setCycles] = useState(0)
  const audioRef = useRef(null)

  useEffect(() => {
    if (!isOpen) return
    const handler = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  useEffect(() => {
    if (!pomodoroOn || !timerRunning) return
    const targetSec = mode === 'work' ? POMODORO_WORK : POMODORO_BREAK
    if (elapsed - cycleStart >= targetSec) {
      try { audioRef.current?.play() } catch {}
      if (mode === 'work') {
        setMode('break')
        setCycles(c => c + 1)
      } else {
        setMode('work')
      }
      setCycleStart(elapsed)
    }
  }, [elapsed, pomodoroOn, mode, cycleStart, timerRunning])

  if (!isOpen) return null

  const project = state.projects.find(p => p.id === timerProject)
  const task = state.tasks.find(t => t.id === timerTask)
  const accent = project?.color || 'var(--violet-deep)'

  const targetSec = mode === 'work' ? POMODORO_WORK : POMODORO_BREAK
  const remaining = pomodoroOn ? Math.max(0, targetSec - (elapsed - cycleStart)) : elapsed
  const cycleProgress = pomodoroOn ? Math.min(100, ((elapsed - cycleStart) / targetSec) * 100) : 0

  function handleTogglePomodoro() {
    if (!pomodoroOn) {
      setMode('work')
      setCycleStart(elapsed)
      setCycles(0)
    }
    setPomodoroOn(v => !v)
  }

  function handleStop() {
    setPomodoroOn(false)
    setMode('work')
    setCycles(0)
    setCycleStart(0)
    onStop?.()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(20px)' }}>

      <audio ref={audioRef} preload="auto">
        <source src="data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=" />
      </audio>

      <button onClick={onClose}
        className="absolute top-6 right-6 text-white/40 hover:text-white/80 transition-colors flex items-center gap-2 text-xs">
        <X size={16} />
        <span className="hidden sm:inline">Quitter (Esc)</span>
      </button>

      {project && (
        <div className="absolute top-6 left-6 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: accent }} />
          <span className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>
            {project.name}
          </span>
        </div>
      )}

      <div className="flex flex-col items-center px-6 max-w-2xl text-center">

        {task ? (
          <h2 className="text-2xl sm:text-3xl font-semibold mb-12 leading-tight"
            style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            {task.title}
          </h2>
        ) : (
          <p className="text-sm mb-12" style={{ color: 'var(--text-tertiary)' }}>
            Session libre
          </p>
        )}

        {pomodoroOn && (
          <div className="mb-4 flex items-center gap-2 px-3 py-1 rounded-full"
            style={{ background: mode === 'work' ? accent + '20' : 'rgba(168,230,189,0.20)' }}>
            {mode === 'break' && <Coffee size={11} style={{ color: '#A8E6BD' }} />}
            <span className="text-[10px] uppercase tracking-wider font-bold"
              style={{ color: mode === 'work' ? accent : '#A8E6BD' }}>
              {mode === 'work' ? `Pomodoro · Cycle ${cycles + 1}` : 'Pause'}
            </span>
          </div>
        )}

        <p className="font-mono font-bold leading-none mb-2 tabular-nums"
          style={{
            fontSize: 'clamp(80px, 18vw, 180px)',
            color: pomodoroOn && mode === 'break' ? '#A8E6BD' : accent,
          }}>
          {pomodoroOn ? formatTime(remaining) : formatTime(elapsed)}
        </p>

        {pomodoroOn && (
          <div className="w-64 h-1 rounded-full overflow-hidden mb-2"
            style={{ background: 'rgba(255,255,255,0.06)' }}>
            <div className="h-full transition-all"
              style={{
                width: `${cycleProgress}%`,
                background: mode === 'work' ? accent : '#A8E6BD',
              }} />
          </div>
        )}

        {!pomodoroOn && elapsed > 0 && (
          <p className="font-mono text-xs mb-6" style={{ color: 'var(--text-tertiary)' }}>
            Temps total
          </p>
        )}

        <div className="flex items-center gap-3 mt-8">
          {timerRunning ? (
            <button onClick={onPause}
              className="flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-semibold transition-all hover:scale-105"
              style={{ background: 'rgba(255,214,107,0.15)', color: '#FFD66B' }}>
              <Pause size={14} /> Pause
            </button>
          ) : (
            <button onClick={onResume}
              className="flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-semibold transition-all hover:scale-105"
              style={{ background: accent, color: '#0a0a0a' }}>
              <Play size={14} /> Reprendre
            </button>
          )}
          <button onClick={handleStop}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-semibold transition-all hover:scale-105"
            style={{ background: 'rgba(248,113,113,0.15)', color: '#F87171' }}>
            <Square size={14} /> Terminer
          </button>
        </div>

        <button onClick={handleTogglePomodoro}
          className="mt-6 flex items-center gap-2 text-xs px-4 py-2 rounded-xl transition-colors"
          style={{
            background: pomodoroOn ? accent + '15' : 'rgba(255,255,255,0.05)',
            color: pomodoroOn ? accent : 'var(--text-tertiary)',
            border: `1px solid ${pomodoroOn ? accent + '40' : 'rgba(255,255,255,0.08)'}`,
          }}>
          <span className="w-3 h-3 rounded-full flex items-center justify-center"
            style={{
              background: pomodoroOn ? accent : 'transparent',
              border: `1.5px solid ${pomodoroOn ? accent : 'rgba(255,255,255,0.2)'}`,
            }}>
            {pomodoroOn && <span className="w-1 h-1 rounded-full bg-black/60" />}
          </span>
          Pomodoro 25/5
          {pomodoroOn && cycles > 0 && (
            <span className="font-mono">· {cycles} cycle{cycles > 1 ? 's' : ''}</span>
          )}
        </button>
      </div>
    </div>
  )
}
