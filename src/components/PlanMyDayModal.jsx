import { useState, useEffect, useRef } from 'react'
import { X, Calendar, Sparkles } from 'lucide-react'
import { useStore } from '@/store/useStore'

const START_HOUR = 6
const END_HOUR = 22
const HOUR_PX = 56
const HOUR_SPAN = END_HOUR - START_HOUR

function snap15(h) { return Math.round(h * 4) / 4 }
function hourToHHMM(h) {
  const total = Math.round(h * 60)
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}
function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function PlanMyDayModal({ isOpen, onClose }) {
  const { state, dispatch } = useStore()
  const [drag, setDrag] = useState(null) // { task, mouseX, mouseY, dropTarget }
  const gridRef = useRef(null)
  const today = todayStr()

  useEffect(() => {
    if (!isOpen) return
    const handler = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  useEffect(() => {
    if (!drag) return
    function onMove(e) {
      const target = computeDropHour(e.clientX, e.clientY)
      setDrag(s => s && ({ ...s, mouseX: e.clientX, mouseY: e.clientY, dropTarget: target }))
    }
    function onUp(e) {
      const target = computeDropHour(e.clientX, e.clientY)
      if (target != null) {
        const t = drag.task
        const durationH = (t.estimatedMinutes && t.estimatedMinutes > 0) ? t.estimatedMinutes / 60 : 1
        const endH = Math.min(END_HOUR, target + durationH)
        const project = state.projects.find(p => p.id === t.projectId)
        dispatch({
          type: 'ADD_CALENDAR_EVENT',
          payload: {
            title: t.title,
            date: today,
            startTime: hourToHHMM(target),
            endTime: hourToHHMM(endH),
            eventType: 'focus',
            emoji: '🎯',
            notes: `Planifié depuis "Plan ma journée" · tâche #${t.id}`,
            projectId: t.projectId || null,
            taskId: t.id,
          },
        })
      }
      setDrag(null)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    return () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drag])

  function computeDropHour(x, y) {
    if (!gridRef.current) return null
    const rect = gridRef.current.getBoundingClientRect()
    if (x < rect.left || x > rect.right) return null
    const relY = y - rect.top
    if (relY < 0 || relY > HOUR_SPAN * HOUR_PX) return null
    return Math.max(START_HOUR, Math.min(END_HOUR - 0.25, snap15(START_HOUR + relY / HOUR_PX)))
  }

  function startDrag(e, task) {
    e.preventDefault()
    setDrag({ task, mouseX: e.clientX, mouseY: e.clientY, dropTarget: null })
  }

  if (!isOpen) return null

  // Today's unplanned tasks: today=true, status!=done, NOT already in calendar today
  const eventTaskIds = new Set(state.calendarEvents.filter(e => e.date === today && e.taskId).map(e => e.taskId))
  const todayTasks = state.tasks
    .filter(t => t.today && t.status !== 'done' && !eventTaskIds.has(t.id))
    .sort((a, b) => {
      const ORDER = { critical: 0, 'very-urgent': 1, urgent: 2 }
      return (ORDER[a.urgency] ?? 9) - (ORDER[b.urgency] ?? 9)
    })

  // Today's existing events for the right panel
  const todayEvents = []
  state.calendarEvents.filter(e => e.date === today).forEach(e => {
    const [sh, sm] = e.startTime.split(':').map(Number)
    const [eh, em] = e.endTime.split(':').map(Number)
    const project = state.projects.find(p => p.id === e.projectId)
    todayEvents.push({
      id: `m_${e.id}`, title: e.title, emoji: e.emoji || '📌',
      startHour: sh + sm/60, durationH: (eh + em/60) - (sh + sm/60),
      color: project?.color || '#8B7CFF',
    })
  })
  state.appointments.filter(a => a.date === today).forEach(a => {
    const [sh, sm] = (a.time || '09:00').split(':').map(Number)
    const client = state.clients.find(c => c.id === a.clientId)
    todayEvents.push({
      id: `a_${a.id}`, title: a.title, emoji: '👤',
      startHour: sh + sm/60, durationH: (a.duration || 3600) / 3600,
      color: client?.accentColor || '#FFC1E0',
    })
  })

  const hourLabels = Array.from({ length: HOUR_SPAN }, (_, i) => START_HOUR + i)
  const now = new Date()
  const nowH = now.getHours() + now.getMinutes() / 60

  return (
    <div className="fixed inset-0 z-50 flex flex-col"
      style={{ background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(20px)' }}>

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <Sparkles size={16} style={{ color: 'var(--violet-deep)' }} />
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            Plan ma journée
          </h2>
          <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
            {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </span>
        </div>
        <button onClick={onClose}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs text-white/50 hover:text-white/80 transition-colors">
          <X size={14} /> Fermer (Esc)
        </button>
      </div>

      <div className="flex-1 flex gap-4 px-6 pb-6 overflow-hidden">

        {/* Left: tasks list */}
        <div className="w-80 flex-shrink-0 rounded-2xl p-4 overflow-y-auto"
          style={{ background: 'var(--c-card)', border: '1px solid var(--c-border)' }}>
          <p className="text-[10px] uppercase tracking-wider font-semibold mb-3"
            style={{ color: 'var(--text-tertiary)' }}>
            Tâches à planifier · {todayTasks.length}
          </p>

          {todayTasks.length === 0 ? (
            <p className="text-xs text-center py-8" style={{ color: 'var(--text-tertiary)' }}>
              Toutes tes tâches today sont déjà planifiées 🎉
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {todayTasks.map(t => {
                const project = state.projects.find(p => p.id === t.projectId)
                const dur = t.estimatedMinutes ? `${Math.round(t.estimatedMinutes / 60 * 10) / 10}h` : '~1h'
                const urgencyIcon = t.urgency === 'critical' ? '🚨' : t.urgency === 'very-urgent' ? '🔥' : t.urgency === 'urgent' ? '⚡' : null
                const isDragging = drag?.task?.id === t.id
                return (
                  <div key={t.id}
                    onMouseDown={(e) => startDrag(e, t)}
                    className={`rounded-xl p-3 cursor-grab transition-all hover:scale-[1.01] ${isDragging ? 'opacity-30' : ''}`}
                    style={{
                      background: (project?.color || '#8B7CFF') + '15',
                      border: `1px solid ${(project?.color || '#8B7CFF')}30`,
                    }}>
                    <div className="flex items-center gap-1.5 mb-1">
                      {urgencyIcon && <span className="text-xs">{urgencyIcon}</span>}
                      {project && (
                        <span className="text-[10px]" style={{ color: project.color }}>
                          {project.emoji} {project.name}
                        </span>
                      )}
                      <span className="ml-auto font-mono text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                        {dur}
                      </span>
                    </div>
                    <p className="text-sm leading-tight" style={{ color: 'var(--text-primary)' }}>
                      {t.title}
                    </p>
                    {!t.estimatedMinutes && (
                      <p className="text-[9px] mt-1 italic" style={{ color: 'var(--text-tertiary)' }}>
                        Pas d'estimation · 1h par défaut
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Right: today's calendar */}
        <div className="flex-1 rounded-2xl overflow-hidden"
          style={{ background: 'var(--c-card)', border: '1px solid var(--c-border)' }}>
          <div className="px-4 py-2.5 flex items-center gap-2"
            style={{ borderBottom: '1px solid var(--c-border)' }}>
            <Calendar size={12} style={{ color: 'var(--text-tertiary)' }} />
            <p className="text-[10px] uppercase tracking-wider font-semibold"
              style={{ color: 'var(--text-tertiary)' }}>Aujourd'hui</p>
            <span className="ml-auto text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
              Glisse une tâche sur une heure
            </span>
          </div>

          <div className="flex h-full overflow-auto">
            {/* Time gutter */}
            <div className="w-14 flex-shrink-0 pt-0" style={{ borderRight: '1px solid rgba(255,255,255,0.05)' }}>
              {hourLabels.map(h => (
                <div key={h} className="flex items-start justify-end pr-2 pt-1" style={{ height: `${HOUR_PX}px` }}>
                  <span className="font-mono text-[10px] text-white/20">{h}h</span>
                </div>
              ))}
            </div>

            {/* Single day column (drop target) */}
            <div ref={gridRef} className="flex-1 relative" style={{ height: `${HOUR_SPAN * HOUR_PX}px` }}>
              {/* Hour lines */}
              {hourLabels.map(h => (
                <div key={h} className="absolute w-full"
                  style={{ top: `${(h - START_HOUR) * HOUR_PX}px`, borderTop: '1px solid rgba(255,255,255,0.03)', height: `${HOUR_PX}px` }} />
              ))}

              {/* Existing events */}
              {todayEvents.map(ev => {
                const top = Math.max(0, (ev.startHour - START_HOUR) * HOUR_PX)
                const height = Math.max(20, ev.durationH * HOUR_PX)
                return (
                  <div key={ev.id} className="absolute left-1 right-1 rounded px-2 overflow-hidden"
                    style={{
                      top: `${top}px`, height: `${height}px`,
                      background: ev.color + '22', borderLeft: `2px solid ${ev.color}`,
                    }}>
                    <span className="text-[11px] font-medium leading-tight flex items-center gap-1 pt-0.5 truncate"
                      style={{ color: ev.color }}>
                      <span>{ev.emoji}</span> {ev.title}
                    </span>
                  </div>
                )
              })}

              {/* Drop placeholder while dragging */}
              {drag?.dropTarget != null && (() => {
                const dur = (drag.task.estimatedMinutes && drag.task.estimatedMinutes > 0) ? drag.task.estimatedMinutes / 60 : 1
                const top = (drag.dropTarget - START_HOUR) * HOUR_PX
                const height = dur * HOUR_PX
                return (
                  <div className="absolute left-1 right-1 rounded px-2 pointer-events-none"
                    style={{
                      top: `${top}px`, height: `${height}px`,
                      background: 'rgba(139,124,255,0.25)',
                      border: '2px dashed var(--violet-deep)',
                    }}>
                    <p className="text-[11px] font-semibold pt-0.5" style={{ color: 'var(--violet-deep)' }}>
                      {hourToHHMM(drag.dropTarget)} · {drag.task.title}
                    </p>
                  </div>
                )
              })()}

              {/* Now indicator */}
              {nowH >= START_HOUR && nowH <= END_HOUR && (
                <div className="absolute left-0 right-0 z-10 pointer-events-none"
                  style={{ top: `${(nowH - START_HOUR) * HOUR_PX}px` }}>
                  <div className="relative">
                    <div className="absolute left-0 w-2 h-2 rounded-full -translate-y-1/2" style={{ background: '#8B7CFF' }} />
                    <div className="ml-2 h-px" style={{ background: 'rgba(139,124,255,0.5)' }} />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Ghost following cursor */}
      {drag && (
        <div className="fixed pointer-events-none z-[60]"
          style={{ left: drag.mouseX + 10, top: drag.mouseY + 10 }}>
          <div className="rounded-lg px-3 py-1.5 shadow-2xl"
            style={{ background: 'var(--violet-deep)', color: '#fff' }}>
            <span className="text-xs font-medium">{drag.task.title}</span>
          </div>
        </div>
      )}
    </div>
  )
}
