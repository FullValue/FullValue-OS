import { useState, useRef } from 'react'
import { ChevronLeft, ChevronRight, CalendarRange } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import TaskDetailModal from './shared/TaskDetailModal'

const ZOOM_OPTIONS = [
  { id: 'week',  label: 'Semaine', days: 14,  cellW: 48 },
  { id: 'month', label: 'Mois',   days: 30,  cellW: 28 },
  { id: 'quarter', label: 'Trimestre', days: 90, cellW: 12 },
]

function addDays(date, n) {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

function daysBetween(a, b) {
  return Math.round((b - a) / 86400000)
}

function formatDate(d) {
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
}

export default function GanttView({ tasks = [], projects = [], onTaskUpdate, onTaskDelete }) {
  const [zoom, setZoom] = useState('week')
  const [startDate, setStartDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 2)
    return d
  })
  const [detailTask, setDetailTask] = useState(null)
  const [dragging, setDragging] = useState(null)
  const containerRef = useRef(null)

  const zoomOpt = ZOOM_OPTIONS.find(z => z.id === zoom)
  const { days, cellW } = zoomOpt
  const totalW = days * cellW

  const dateRange = Array.from({ length: days }, (_, i) => addDays(startDate, i))
  const today = new Date()

  // Only show tasks that have at least startDate or dueDate
  const ganttTasks = tasks.filter(t => t.startDate || t.dueDate)

  // Tasks without dates shown in a "no dates" section
  const noDates = tasks.filter(t => !t.startDate && !t.dueDate)

  function getBarStyle(task) {
    const rangeStart = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate())
    const taskStart = task.startDate ? new Date(task.startDate + 'T00:00:00') : new Date(task.dueDate + 'T00:00:00')
    const taskEnd = task.dueDate ? new Date(task.dueDate + 'T00:00:00') : taskStart

    const left = daysBetween(rangeStart, taskStart) * cellW
    const width = Math.max((daysBetween(taskStart, taskEnd) + 1) * cellW, cellW)
    return { left, width }
  }

  function shiftPeriod(dir) {
    setStartDate(d => addDays(d, dir * Math.floor(days / 2)))
  }

  const todayOffset = daysBetween(startDate, today) * cellW

  return (
    <>
      {/* Toolbar */}
      <div className="flex items-center gap-2 mb-3">
        <Button
          variant="subtle"
          size="sm"
          onClick={() => setStartDate(() => { const d = new Date(); d.setDate(d.getDate() - 2); return d })}
        >
          Aujourd'hui
        </Button>
        <Button variant="ghost" size="icon-sm" onClick={() => shiftPeriod(-1)} aria-label="Période précédente"><ChevronLeft size={14} /></Button>
        <Button variant="ghost" size="icon-sm" onClick={() => shiftPeriod(1)} aria-label="Période suivante"><ChevronRight size={14} /></Button>
        <span className="tabular text-xs text-[var(--text-secondary)]">{formatDate(startDate)} – {formatDate(addDays(startDate, days - 1))}</span>

        <div className="ml-auto inline-flex gap-0.5 rounded-xl bg-[rgba(var(--ink),0.05)] p-1">
          {ZOOM_OPTIONS.map(z => (
            <Button
              key={z.id}
              variant="ghost"
              onClick={() => setZoom(z.id)}
              className={
                'h-auto text-[11px] font-medium px-2.5 py-1 rounded-lg ' +
                (zoom === z.id
                  ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm hover:bg-[var(--bg-card)]'
                  : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]')
              }
            >
              {z.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl overflow-hidden bg-[var(--bg-card)] border border-[var(--border-soft)] shadow-[var(--shadow-card)]">
        <div className="overflow-x-auto">
          <div style={{ minWidth: 560 }}>
            {/* Header row */}
            <div className="flex" style={{ borderBottom: '1px solid var(--border-soft)' }}>
              {/* Task name column */}
              <div className="flex-shrink-0 w-48 px-3 py-2 text-[10px] uppercase tracking-[0.08em] text-[var(--text-tertiary)] font-semibold" style={{ borderRight: '1px solid var(--border-soft)' }}>
                Tâche
              </div>
              {/* Date cells */}
              <div className="relative flex" style={{ width: totalW }}>
                {dateRange.map((d, i) => {
                  const isToday = daysBetween(startDate, today) === i
                  const isWeekend = d.getDay() === 0 || d.getDay() === 6
                  const showLabel = cellW >= 28 || i % 3 === 0
                  return (
                    <div
                      key={i}
                      className="flex-shrink-0 text-center border-r"
                      style={{
                        width: cellW,
                        borderColor: 'var(--border-soft)',
                        background: isWeekend ? 'rgba(var(--ink),0.025)' : 'transparent',
                      }}
                    >
                      {showLabel && (
                        <span className={`tabular text-[9px] ${isToday ? 'text-[var(--violet-deep)] font-bold' : 'text-[var(--text-tertiary)]'}`}>
                          {cellW >= 28 ? d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'numeric' }) : d.getDate()}
                        </span>
                      )}
                    </div>
                  )
                })}
                {/* Today indicator */}
                {todayOffset >= 0 && todayOffset <= totalW && (
                  <div
                    className="absolute top-0 bottom-0 w-px pointer-events-none"
                    style={{ left: todayOffset, background: 'var(--violet-deep)', opacity: 0.6 }}
                  />
                )}
              </div>
            </div>

            {/* Task rows */}
            {ganttTasks.length === 0 && noDates.length === 0 ? (
              <EmptyState
                compact
                icon={CalendarRange}
                title="Aucune tâche datée"
                description="Ajoute une date de début ou d'échéance pour voir les tâches ici."
              />
            ) : (
              <>
                {ganttTasks.map((task, ri) => {
                  const project = projects.find(p => p.id === task.projectId)
                  const { left, width } = getBarStyle(task)
                  const isDone = task.status === 'done'
                  const barColor = project?.color || '#8B7CFF'

                  return (
                    <div
                      key={task.id}
                      className="flex items-center"
                      style={{ borderBottom: '1px solid var(--border-soft)', minHeight: 40 }}
                    >
                      {/* Label */}
                      <div
                        className="flex-shrink-0 w-48 px-3 py-2 cursor-pointer hover:bg-[rgba(var(--ink),0.03)] transition-colors"
                        style={{ borderRight: '1px solid var(--border-soft)' }}
                        onClick={() => setDetailTask(task)}
                      >
                        <div className="flex items-center gap-1.5">
                          {project && <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: project.color }} />}
                          <span className={`text-xs truncate ${isDone ? 'line-through text-[var(--text-tertiary)]' : 'text-[var(--text-secondary)]'}`}>{task.title}</span>
                        </div>
                      </div>

                      {/* Bar area */}
                      <div className="relative flex-1" style={{ height: 40, width: totalW }}>
                        {left >= -width && left <= totalW && (
                          <div
                            className="absolute top-1/2 -translate-y-1/2 rounded-full cursor-pointer hover:opacity-80 transition-opacity flex items-center px-2"
                            style={{
                              left: Math.max(0, left),
                              width: left < 0 ? width + left : Math.min(width, totalW - left),
                              height: 22,
                              background: barColor + (isDone ? '30' : '40'),
                              border: `1px solid ${barColor}60`,
                            }}
                            onClick={() => setDetailTask(task)}
                          >
                            <span className="text-[10px] truncate font-medium" style={{ color: barColor }}>{task.title}</span>
                          </div>
                        )}
                        {/* Today line */}
                        {todayOffset >= 0 && todayOffset <= totalW && (
                          <div className="absolute top-0 bottom-0 w-px pointer-events-none" style={{ left: todayOffset, background: 'var(--violet-deep)', opacity: 0.25 }} />
                        )}
                      </div>
                    </div>
                  )
                })}

                {/* Tasks without dates */}
                {noDates.length > 0 && (
                  <>
                    <div className="px-3 py-1.5 text-[10px] uppercase tracking-[0.08em] text-[var(--text-tertiary)] font-semibold" style={{ background: 'rgba(var(--ink),0.03)', borderTop: '1px solid var(--border-soft)' }}>
                      Sans dates ({noDates.length})
                    </div>
                    {noDates.map(task => {
                      const project = projects.find(p => p.id === task.projectId)
                      return (
                        <div
                          key={task.id}
                          className="flex items-center"
                          style={{ borderBottom: '1px solid var(--border-soft)', minHeight: 36 }}
                        >
                          <div
                            className="flex-shrink-0 w-48 px-3 py-1.5 cursor-pointer hover:bg-[rgba(var(--ink),0.03)] transition-colors"
                            style={{ borderRight: '1px solid var(--border-soft)' }}
                            onClick={() => setDetailTask(task)}
                          >
                            <div className="flex items-center gap-1.5">
                              {project && <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: project.color }} />}
                              <span className="text-xs truncate text-[var(--text-tertiary)]">{task.title}</span>
                            </div>
                          </div>
                          <div className="flex-1 px-3">
                            <span className="text-[10px] text-[var(--text-tertiary)]">— aucune date définie</span>
                          </div>
                        </div>
                      )
                    })}
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {detailTask && (
        <TaskDetailModal
          task={detailTask}
          onClose={() => setDetailTask(null)}
          onUpdate={(id, updates) => { onTaskUpdate?.(id, updates); setDetailTask(t => ({ ...t, ...updates })) }}
          onDelete={id => { onTaskDelete?.(id); setDetailTask(null) }}
        />
      )}
    </>
  )
}
