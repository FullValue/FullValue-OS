import { useState } from 'react'
import { Gauge, Edit2, Check } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from '@/lib/toast'

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function formatHours(min) {
  if (min < 60) return `${min}m`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`
}

export default function CapacityWidget() {
  const { state, dispatch } = useStore()
  const [editing, setEditing] = useState(false)
  const [draftHours, setDraftHours] = useState(() => Math.round((state.settings?.dailyCapacityMinutes ?? 480) / 60))

  const capacityMin = state.settings?.dailyCapacityMinutes ?? 480
  const today = todayStr()

  // Estimated time for today's active tasks
  const todayTasks = state.tasks.filter(t => t.today && t.status !== 'done')
  const estimatedMin = todayTasks.reduce((sum, t) => sum + (t.estimatedMinutes || 0), 0)
  const tasksWithoutEstimate = todayTasks.filter(t => !t.estimatedMinutes).length

  // Appointments today
  const apptMin = state.appointments
    .filter(a => a.date === today)
    .reduce((sum, a) => sum + (a.duration ? Math.round(a.duration / 60) : 0), 0)

  // Sessions already logged today
  const loggedMin = state.sessions
    .filter(s => s.date && s.date.slice(0, 10) === today)
    .reduce((sum, s) => sum + Math.round(s.duration / 60), 0)

  const plannedMin = estimatedMin + apptMin
  const remainingMin = capacityMin - plannedMin - loggedMin
  const usedPct = Math.min(100, ((plannedMin + loggedMin) / capacityMin) * 100)
  const overload = plannedMin + loggedMin > capacityMin

  const accent = overload ? 'var(--red-deep)' : usedPct > 80 ? 'var(--yellow-deep)' : 'var(--violet-deep)'

  function saveCapacity() {
    const h = Math.max(1, Math.min(24, Number(draftHours) || 8))
    dispatch({ type: 'UPDATE_SETTINGS', payload: { dailyCapacityMinutes: h * 60 } })
    setEditing(false)
    toast.success('Capacité mise à jour')
  }

  return (
    <div className="rounded-2xl p-4"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--c-border)' }}>

      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Gauge size={14} style={{ color: 'var(--text-tertiary)' }} />
          <span className="text-[10px] uppercase tracking-wider font-semibold"
            style={{ color: 'var(--text-tertiary)' }}>
            Capacité du jour
          </span>
        </div>

        {editing ? (
          <div className="flex items-center gap-1">
            <Input type="number" min="1" max="24"
              value={draftHours}
              onChange={e => setDraftHours(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') saveCapacity(); if (e.key === 'Escape') setEditing(false) }}
              autoFocus
              className="h-7 w-14 px-2 text-xs font-mono text-right" />
            <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>h</span>
            <Button variant="ghost" size="icon-sm" onClick={saveCapacity} aria-label="Valider">
              <Check size={11} />
            </Button>
          </div>
        ) : (
          <Button variant="ghost" size="sm" onClick={() => setEditing(true)}
            className="gap-1 font-mono text-[11px] text-[var(--text-tertiary)]">
            {Math.round(capacityMin / 60)}h <Edit2 size={9} />
          </Button>
        )}
      </div>

      {/* Progress bar */}
      <div className="flex h-2.5 rounded-full overflow-hidden mb-3"
        style={{ background: 'rgba(var(--ink),0.06)' }}>
        {loggedMin > 0 && (
          <div style={{
            width: `${Math.min(100, (loggedMin / capacityMin) * 100)}%`,
            background: 'var(--green-deep)',
          }} title={`${formatHours(loggedMin)} déjà loggé`} />
        )}
        {apptMin > 0 && (
          <div style={{
            width: `${Math.min(100, (apptMin / capacityMin) * 100)}%`,
            background: 'var(--blue-deep)',
          }} title={`${formatHours(apptMin)} de RDV`} />
        )}
        {estimatedMin > 0 && (
          <div style={{
            width: `${Math.min(100, (estimatedMin / capacityMin) * 100)}%`,
            background: accent,
          }} title={`${formatHours(estimatedMin)} de tâches estimées`} />
        )}
      </div>

      {/* Breakdown */}
      <div className="grid grid-cols-4 gap-2 mb-2">
        <Slot color="#A8E6BD" label="Loggé" value={formatHours(loggedMin)} />
        <Slot color="#A8D4F0" label="RDV" value={formatHours(apptMin)} />
        <Slot color={accent} label="Estimé" value={formatHours(estimatedMin)} />
        <Slot
          color={overload ? '#F87171' : 'var(--text-secondary)'}
          label={overload ? 'Surcharge' : 'Marge'}
          value={overload ? `+${formatHours(Math.abs(remainingMin))}` : formatHours(Math.max(0, remainingMin))}
        />
      </div>

      {/* Warnings */}
      {(overload || tasksWithoutEstimate > 0) && (
        <div className="flex flex-col gap-1 mt-2">
          {overload && (
            <p className="text-[10px]" style={{ color: '#F87171' }}>
              ⚠ Tu sur-engages ta journée — replanifie ou réduis.
            </p>
          )}
          {tasksWithoutEstimate > 0 && (
            <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
              {tasksWithoutEstimate} tâche{tasksWithoutEstimate > 1 ? 's' : ''} today sans estimation.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function Slot({ color, label, value }) {
  return (
    <div>
      <div className="flex items-center gap-1 mb-0.5">
        <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color }} />
        <span className="text-[9px] uppercase tracking-wider"
          style={{ color: 'var(--text-tertiary)' }}>{label}</span>
      </div>
      <p className="font-mono text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
        {value}
      </p>
    </div>
  )
}
