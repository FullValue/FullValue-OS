import { useState, useRef } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
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
        <button
          onClick={() => setStartDate(() => { const d = new Date(); d.setDate(d.getDate() - 2); return d })}
          className="text-[11px] px-2.5 py-1.5 rounded-lg transition-colors"
          style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.50)' }}
        >
          Aujourd'hui
        </button>
        <button onClick={() => shiftPeriod(-1)} className="p-1.5 rounded-lg hover:bg-white/8 text-white/40 hover:text-white/70 transition-colors"><ChevronLeft size={14} /></button>
        <button onClick={() => shiftPeriod(1)} className="p-1.5 rounded-lg hover:bg-white/8 text-white/40 hover:text-white/70 transition-colors"><ChevronRight size={14} /></button>
        <span className="text-xs text-white/50">{formatDate(startDate)} – {formatDate(addDays(startDate, days - 1))}</span>

        <div className="ml-auto flex gap-1 p-0.5 rounded-lg" style={{ background: 'rgba(0,0,0,0.20)' }}>
          {ZOOM_OPTIONS.map(z => (
            <button
              key={z.id}
              onClick={() => setZoom(z.id)}
              className="text-[11px] px-2.5 py-1 rounded-md transition-all"
              style={zoom === z.id
                ? { background: 'var(--c-card)', color: 'rgba(255,255,255,0.85)' }
                : { color: 'rgba(255,255,255,0.30)' }}
            >
              {z.label}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--c-border)' }}>
        <div className="overflow-x-auto">
          <div style={{ minWidth: 560 }}>
            {/* Header row */}
            <div className="flex" style={{ borderBottom: '1px solid var(--c-border)' }}>
              {/* Task name column */}
              <div className="flex-shrink-0 w-48 px-3 py-2 text-[10px] uppercase tracking-wider text-white/25 font-semibold" style={{ borderRight: '1px solid var(--c-border)' }}>
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
                        borderColor: 'rgba(255,255,255,0.04)',
                        background: isWeekend ? 'rgba(255,255,255,0.015)' : 'transparent',
                      }}
                    >
                      {showLabel && (
                        <span className={`text-[9px] ${isToday ? 'text-violet font-bold' : 'text-white/20'}`}>
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
                    style={{ left: todayOffset, background: '#8B7CFF', opacity: 0.6 }}
                  />
                )}
              </div>
            </div>

            {/* Task rows */}
            {ganttTasks.length === 0 && noDates.length === 0 ? (
              <div className="py-12 text-center text-xs text-white/25">Aucune tâche avec des dates</div>
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
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', minHeight: 40 }}
                    >
                      {/* Label */}
                      <div
                        className="flex-shrink-0 w-48 px-3 py-2 cursor-pointer hover:bg-white/3 transition-colors"
                        style={{ borderRight: '1px solid var(--c-border)' }}
                        onClick={() => setDetailTask(task)}
                      >
                        <div className="flex items-center gap-1.5">
                          {project && <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: project.color }} />}
                          <span className={`text-xs truncate ${isDone ? 'line-through text-white/30' : 'text-white/75'}`}>{task.title}</span>
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
                          <div className="absolute top-0 bottom-0 w-px pointer-events-none" style={{ left: todayOffset, background: '#8B7CFF', opacity: 0.25 }} />
                        )}
                      </div>
                    </div>
                  )
                })}

                {/* Tasks without dates */}
                {noDates.length > 0 && (
                  <>
                    <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-white/20 font-semibold" style={{ background: 'rgba(255,255,255,0.02)', borderTop: '1px solid var(--c-border)' }}>
                      Sans dates ({noDates.length})
                    </div>
                    {noDates.map(task => {
                      const project = projects.find(p => p.id === task.projectId)
                      return (
                        <div
                          key={task.id}
                          className="flex items-center"
                          style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', minHeight: 36 }}
                        >
                          <div
                            className="flex-shrink-0 w-48 px-3 py-1.5 cursor-pointer hover:bg-white/3 transition-colors"
                            style={{ borderRight: '1px solid var(--c-border)' }}
                            onClick={() => setDetailTask(task)}
                          >
                            <div className="flex items-center gap-1.5">
                              {project && <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: project.color }} />}
                              <span className="text-xs truncate text-white/40">{task.title}</span>
                            </div>
                          </div>
                          <div className="flex-1 px-3">
                            <span className="text-[10px] text-white/20">— aucune date définie</span>
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
