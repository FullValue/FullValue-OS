import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import TaskDetailModal from './shared/TaskDetailModal'

const DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const MONTHS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']

function isSameDay(d1, d2) {
  return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate()
}

function getMonthGrid(year, month) {
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  // Monday-first: 0=Mon…6=Sun
  let startDow = firstDay.getDay() - 1; if (startDow < 0) startDow = 6
  const days = []
  for (let i = 0; i < startDow; i++) {
    const d = new Date(year, month, 1 - (startDow - i))
    days.push({ date: d, inMonth: false })
  }
  for (let i = 1; i <= lastDay.getDate(); i++) {
    days.push({ date: new Date(year, month, i), inMonth: true })
  }
  while (days.length % 7 !== 0) {
    const d = new Date(year, month + 1, days.length - lastDay.getDate() - startDow + 1)
    days.push({ date: d, inMonth: false })
  }
  return days
}

function getWeekDays(refDate) {
  const d = new Date(refDate)
  const dow = d.getDay() === 0 ? 6 : d.getDay() - 1
  d.setDate(d.getDate() - dow)
  const days = []
  for (let i = 0; i < 7; i++) {
    days.push(new Date(d.getFullYear(), d.getMonth(), d.getDate() + i))
  }
  return days
}

function MonthView({ year, month, tasks, projects, onDayClick, onOpen }) {
  const grid = getMonthGrid(year, month)
  const today = new Date()

  return (
    <div>
      <div className="grid grid-cols-7 mb-1">
        {DAYS.map(d => (
          <div key={d} className="text-center text-[10px] uppercase tracking-[0.08em] text-[var(--text-tertiary)] py-1">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-px" style={{ background: 'var(--border-soft)' }}>
        {grid.map(({ date, inMonth }, i) => {
          const dayTasks = tasks.filter(t => t.dueDate && isSameDay(new Date(t.dueDate + 'T00:00:00'), date))
          const isToday = isSameDay(date, today)
          return (
            <div
              key={i}
              className="min-h-[80px] p-1.5 cursor-pointer hover:bg-[rgba(var(--ink),0.03)] transition-colors"
              style={{ background: 'var(--bg-card)' }}
              onClick={() => onDayClick(date)}
            >
              <span
                className={`tabular text-xs font-medium inline-flex items-center justify-center w-6 h-6 rounded-full mb-1 ${inMonth ? 'text-[var(--text-primary)]' : 'text-[var(--text-tertiary)]'}`}
                style={isToday ? { background: 'var(--violet-deep)', color: '#fff' } : {}}
              >
                {date.getDate()}
              </span>
              {dayTasks.slice(0, 3).map(task => {
                const project = projects.find(p => p.id === task.projectId)
                return (
                  <div
                    key={task.id}
                    onClick={e => { e.stopPropagation(); onOpen(task) }}
                    className="text-[10px] truncate rounded-md px-1 py-0.5 mb-0.5 cursor-pointer hover:opacity-80 transition-opacity"
                    style={{
                      background: (project?.color || '#8B7CFF') + '25',
                      color: project?.color || '#8B7CFF',
                      borderLeft: `2px solid ${project?.color || '#8B7CFF'}`,
                    }}
                  >
                    {task.title}
                  </div>
                )
              })}
              {dayTasks.length > 3 && (
                <div className="text-[10px] text-[var(--text-tertiary)]">+{dayTasks.length - 3}</div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

const HOURS = Array.from({ length: 17 }, (_, i) => i + 6) // 6h–22h

function WeekView({ weekDays, tasks, projects, onOpen }) {
  const today = new Date()

  return (
    <div className="flex overflow-x-auto">
      {/* Time gutter */}
      <div className="flex-shrink-0 w-12">
        <div className="h-8" /> {/* header spacer */}
        {HOURS.map(h => (
          <div key={h} className="h-14 flex items-start justify-end pr-2 pt-0.5">
            <span className="tabular text-[10px] text-[var(--text-tertiary)]">{h}h</span>
          </div>
        ))}
      </div>

      {/* Day columns */}
      <div className="flex flex-1 gap-px" style={{ background: 'var(--border-soft)' }}>
        {weekDays.map((day, di) => {
          const isToday = isSameDay(day, today)
          const dayTasks = tasks.filter(t => t.dueDate && isSameDay(new Date(t.dueDate + 'T00:00:00'), day))
          return (
            <div key={di} className="flex-1 min-w-[90px]" style={{ background: 'var(--bg-card)' }}>
              {/* Day header */}
              <div className={`h-8 flex flex-col items-center justify-center border-b`} style={{ borderColor: 'var(--border-soft)' }}>
                <span className="text-[10px] text-[var(--text-tertiary)]">{DAYS[di]}</span>
                <span className={`tabular text-xs font-semibold ${isToday ? 'text-[var(--violet-deep)]' : 'text-[var(--text-primary)]'}`}>{day.getDate()}</span>
              </div>

              {/* Hour rows */}
              <div className="relative">
                {HOURS.map(h => (
                  <div key={h} className="h-14 border-b" style={{ borderColor: 'var(--border-soft)' }} />
                ))}

                {/* Tasks positioned absolutely */}
                {dayTasks.map(task => {
                  const project = projects.find(p => p.id === task.projectId)
                  // Default: place at 9h, 30min height
                  const topPct = ((9 - 6) / 16) * 100
                  return (
                    <div
                      key={task.id}
                      onClick={() => onOpen(task)}
                      className="absolute left-1 right-1 rounded px-1.5 py-1 cursor-pointer hover:opacity-80 transition-opacity overflow-hidden"
                      style={{
                        top: `${topPct}%`,
                        height: `${(1 / 16) * 100}%`,
                        minHeight: 28,
                        background: (project?.color || '#8B7CFF') + '25',
                        borderLeft: `2px solid ${project?.color || '#8B7CFF'}`,
                      }}
                    >
                      <span className="text-[10px] font-medium truncate block" style={{ color: project?.color || '#8B7CFF' }}>
                        {task.title}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function CalendarView({ tasks = [], projects = [], onTaskUpdate }) {
  const today = new Date()
  const [viewMode, setViewMode] = useState('month')
  const [refDate, setRefDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1))
  const [detailTask, setDetailTask] = useState(null)

  const year = refDate.getFullYear()
  const month = refDate.getMonth()

  function prevPeriod() {
    if (viewMode === 'month') setRefDate(new Date(year, month - 1, 1))
    else setRefDate(d => { const n = new Date(d); n.setDate(n.getDate() - 7); return n })
  }

  function nextPeriod() {
    if (viewMode === 'month') setRefDate(new Date(year, month + 1, 1))
    else setRefDate(d => { const n = new Date(d); n.setDate(n.getDate() + 7); return n })
  }

  function goToday() {
    setRefDate(new Date(today.getFullYear(), today.getMonth(), 1))
  }

  const weekDays = getWeekDays(viewMode === 'week' ? refDate : today)

  const headerLabel = viewMode === 'month'
    ? `${MONTHS[month]} ${year}`
    : (() => {
        const wd = getWeekDays(refDate)
        return `${wd[0].getDate()} – ${wd[6].getDate()} ${MONTHS[wd[6].getMonth()]} ${wd[6].getFullYear()}`
      })()

  return (
    <>
      {/* Toolbar */}
      <div className="flex items-center gap-2 mb-3">
        <Button variant="subtle" size="sm" onClick={goToday}>
          Aujourd'hui
        </Button>
        <Button variant="ghost" size="icon-sm" onClick={prevPeriod} aria-label="Période précédente"><ChevronLeft size={14} /></Button>
        <Button variant="ghost" size="icon-sm" onClick={nextPeriod} aria-label="Période suivante"><ChevronRight size={14} /></Button>
        <span className="text-sm font-semibold tracking-tight text-[var(--text-primary)]">{headerLabel}</span>

        <div className="ml-auto inline-flex gap-0.5 rounded-xl bg-[rgba(var(--ink),0.05)] p-1">
          {['month', 'week'].map(m => (
            <Button
              key={m}
              variant="ghost"
              onClick={() => setViewMode(m)}
              className={
                'h-auto text-[11px] font-medium px-2.5 py-1 rounded-lg ' +
                (viewMode === m
                  ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm hover:bg-[var(--bg-card)]'
                  : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]')
              }
            >
              {m === 'month' ? 'Mois' : 'Semaine'}
            </Button>
          ))}
        </div>
      </div>

      {/* Calendar body */}
      <div className="rounded-2xl overflow-hidden bg-[var(--bg-card)] border border-[var(--border-soft)] shadow-[var(--shadow-card)]">
        {viewMode === 'month' ? (
          <MonthView
            year={year}
            month={month}
            tasks={tasks}
            projects={projects}
            onDayClick={() => {}}
            onOpen={setDetailTask}
          />
        ) : (
          <WeekView
            weekDays={getWeekDays(refDate)}
            tasks={tasks}
            projects={projects}
            onOpen={setDetailTask}
          />
        )}
      </div>

      {detailTask && (
        <TaskDetailModal
          task={detailTask}
          onClose={() => setDetailTask(null)}
          onUpdate={(id, updates) => { onTaskUpdate?.(id, updates); setDetailTask(t => ({ ...t, ...updates })) }}
          onDelete={() => setDetailTask(null)}
        />
      )}
    </>
  )
}
