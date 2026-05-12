import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
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
          <div key={d} className="text-center text-[10px] uppercase tracking-wider text-white/25 py-1">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-px" style={{ background: 'var(--c-border)' }}>
        {grid.map(({ date, inMonth }, i) => {
          const dayTasks = tasks.filter(t => t.dueDate && isSameDay(new Date(t.dueDate + 'T00:00:00'), date))
          const isToday = isSameDay(date, today)
          return (
            <div
              key={i}
              className="min-h-[80px] p-1.5 cursor-pointer hover:bg-white/3 transition-colors"
              style={{ background: 'var(--c-card)' }}
              onClick={() => onDayClick(date)}
            >
              <span
                className={`text-xs font-medium inline-flex items-center justify-center w-6 h-6 rounded-full mb-1 ${inMonth ? 'text-white/70' : 'text-white/20'}`}
                style={isToday ? { background: '#8B7CFF', color: '#fff' } : {}}
              >
                {date.getDate()}
              </span>
              {dayTasks.slice(0, 3).map(task => {
                const project = projects.find(p => p.id === task.projectId)
                return (
                  <div
                    key={task.id}
                    onClick={e => { e.stopPropagation(); onOpen(task) }}
                    className="text-[10px] truncate rounded px-1 py-0.5 mb-0.5 cursor-pointer hover:opacity-80 transition-opacity"
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
                <div className="text-[10px] text-white/30">+{dayTasks.length - 3}</div>
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
            <span className="text-[10px] text-white/20">{h}h</span>
          </div>
        ))}
      </div>

      {/* Day columns */}
      <div className="flex flex-1 gap-px" style={{ background: 'var(--c-border)' }}>
        {weekDays.map((day, di) => {
          const isToday = isSameDay(day, today)
          const dayTasks = tasks.filter(t => t.dueDate && isSameDay(new Date(t.dueDate + 'T00:00:00'), day))
          return (
            <div key={di} className="flex-1 min-w-[90px]" style={{ background: 'var(--c-card)' }}>
              {/* Day header */}
              <div className={`h-8 flex flex-col items-center justify-center border-b`} style={{ borderColor: 'var(--c-border)' }}>
                <span className="text-[10px] text-white/30">{DAYS[di]}</span>
                <span className={`text-xs font-semibold ${isToday ? 'text-violet' : 'text-white/70'}`}>{day.getDate()}</span>
              </div>

              {/* Hour rows */}
              <div className="relative">
                {HOURS.map(h => (
                  <div key={h} className="h-14 border-b" style={{ borderColor: 'rgba(255,255,255,0.03)' }} />
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
        <button onClick={goToday} className="text-[11px] px-2.5 py-1.5 rounded-lg transition-colors" style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.50)' }}>
          Aujourd'hui
        </button>
        <button onClick={prevPeriod} className="p-1.5 rounded-lg hover:bg-white/8 text-white/40 hover:text-white/70 transition-colors"><ChevronLeft size={14} /></button>
        <button onClick={nextPeriod} className="p-1.5 rounded-lg hover:bg-white/8 text-white/40 hover:text-white/70 transition-colors"><ChevronRight size={14} /></button>
        <span className="text-sm font-semibold text-white/80">{headerLabel}</span>

        <div className="ml-auto flex gap-1 p-0.5 rounded-lg" style={{ background: 'rgba(0,0,0,0.20)' }}>
          {['month', 'week'].map(m => (
            <button
              key={m}
              onClick={() => setViewMode(m)}
              className="text-[11px] px-2.5 py-1 rounded-md transition-all"
              style={viewMode === m
                ? { background: 'var(--c-card)', color: 'rgba(255,255,255,0.85)' }
                : { color: 'rgba(255,255,255,0.30)' }}
            >
              {m === 'month' ? 'Mois' : 'Semaine'}
            </button>
          ))}
        </div>
      </div>

      {/* Calendar body */}
      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--c-border)' }}>
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
