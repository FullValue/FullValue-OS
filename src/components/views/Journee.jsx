import { useState, useEffect, useMemo } from 'react'
import {
  Play, AlertTriangle, Inbox, ChevronRight,
  TrendingUp, TrendingDown, Minus, Zap, GripVertical,
} from 'lucide-react'
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core'
import {
  SortableContext, useSortable, verticalListSortingStrategy, arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useStore } from '@/store/useStore'
import { PrayerWidget } from '@/components/layout/RightSidebar'

// ── Helpers ──────────────────────────────────────────────────────────────────

function getWeekNumber(d) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const dayNum = date.getUTCDay() || 7
  date.setUTCDate(date.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  return Math.ceil((((date - yearStart) / 86400000) + 1) / 7)
}

const PRAYER_BLOCKS = [
  { label: 'Fajr',    startMin: 5 * 60 + 30,  durationMin: 30 },
  { label: 'Dhuhr',   startMin: 13 * 60 + 15, durationMin: 30 },
  { label: 'Asr',     startMin: 17 * 60,       durationMin: 30 },
  { label: 'Maghrib', startMin: 20 * 60 + 30,  durationMin: 20 },
  { label: 'Isha',    startMin: 21 * 60 + 30,  durationMin: 30 },
  { label: 'Qiyâm',  startMin: 3 * 60 + 30,   durationMin: 90 },
]

function getNextPrayer(nowMin) {
  const upcoming = PRAYER_BLOCKS.filter(p => p.startMin > nowMin && p.label !== 'Qiyâm')
  return upcoming[0] || PRAYER_BLOCKS.find(p => p.label === 'Qiyâm')
}

function formatTimeUntil(diff) {
  if (diff <= 0) return '0m'
  const h = Math.floor(diff / 60)
  const m = diff % 60
  if (h > 0 && m > 0) return `${h}h${m}m`
  if (h > 0) return `${h}h`
  return `${m}m`
}

function getWeekStart() {
  const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - d.getDay()); return d
}

function getMomentum(tasks, projectId) {
  const now = Date.now()
  const week1Start = now - 14 * 86400000
  const week2Start = now - 7 * 86400000
  const prev = tasks.filter(t => t.projectId === projectId && t.completedAt && new Date(t.completedAt) >= new Date(week1Start) && new Date(t.completedAt) < new Date(week2Start)).length
  const curr = tasks.filter(t => t.projectId === projectId && t.completedAt && new Date(t.completedAt) >= new Date(week2Start)).length
  if (curr > prev) return 'up'
  if (curr < prev) return 'down'
  return 'flat'
}

// ── Reusable widget card shell ────────────────────────────────────────────────

function WidgetCard({ title, badge, action, children, accent }) {
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: 'var(--bg-card)',
        border: '0.5px solid var(--border-soft)',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      {title && (
        <div
          className="flex items-center justify-between px-5 pt-4 pb-3"
          style={{ borderBottom: '1px solid var(--border-soft)' }}
        >
          <h2 className="font-semibold text-sm" style={{ color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
            {title}
          </h2>
          <div className="flex items-center gap-2">
            {badge}
            {action}
          </div>
        </div>
      )}
      <div className="px-5 py-4">{children}</div>
    </div>
  )
}

// ── DeadlinesCard ─────────────────────────────────────────────────────────────

function DeadlinesCard({ tasks, projects, onNavigate }) {
  const today = new Date().toISOString().slice(0, 10)
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10)

  const withDue = tasks
    .filter(t => t.dueDate && t.status !== 'done')
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, 5)

  const urgentCount = withDue.filter(t => t.dueDate <= tomorrow).length

  function dayLabel(iso) {
    const d = new Date(iso + 'T12:00:00')
    if (iso === today) return <span style={{ color: 'var(--pink-deep)', fontWeight: 600 }}>AUJ</span>
    if (iso === tomorrow) return <span style={{ color: 'var(--red-deep)', fontWeight: 600 }}>{d.toLocaleDateString('fr-FR', { weekday: 'short' }).toUpperCase()}</span>
    return <span style={{ color: 'var(--text-tertiary)' }}>{d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' }).toUpperCase()}</span>
  }

  return (
    <WidgetCard
      title="Prochaines deadlines"
      badge={urgentCount > 0 && (
        <span
          className="text-[10px] px-2 py-0.5 rounded-full font-medium"
          style={{ background: 'var(--red-bg)', color: 'var(--red-deep)' }}
        >
          {urgentCount} urgente{urgentCount > 1 ? 's' : ''}
        </span>
      )}
      action={
        <button onClick={() => onNavigate('taches')} style={{ color: 'var(--text-tertiary)' }} className="hover:opacity-70 transition-opacity">
          <ChevronRight size={14} />
        </button>
      }
    >
      {withDue.length === 0 ? (
        <p className="text-sm text-center py-4" style={{ color: 'var(--text-tertiary)' }}>Aucune deadline à venir 🎉</p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {withDue.map(task => {
            const project = projects.find(p => p.id === task.projectId)
            const isToday = task.dueDate === today
            const isTomorrow = task.dueDate === tomorrow
            return (
              <div
                key={task.id}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all"
                style={{
                  background: isToday ? 'var(--pink-bg)' : isTomorrow ? 'var(--red-bg)' : 'var(--bg-card-soft)',
                  border: `0.5px solid ${isToday ? 'var(--pink-solid)' : isTomorrow ? 'var(--red-solid)' : 'var(--border-soft)'}`,
                }}
              >
                <span className="font-mono text-[11px] w-12 flex-shrink-0">{dayLabel(task.dueDate)}</span>
                <span className="flex-1 text-sm truncate" style={{ color: 'var(--text-primary)', textDecoration: task.status === 'done' ? 'line-through' : 'none' }}>{task.title}</span>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {task.impact === 'high' && <Zap size={10} style={{ color: 'var(--yellow-deep)' }} />}
                  {task.ship80 && <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium" style={{ background: 'var(--pink-bg)', color: 'var(--pink-deep)' }}>80%</span>}
                  {project && <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: project.color }} />}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </WidgetCard>
  )
}

// ── MomentumCard ─────────────────────────────────────────────────────────────

function MomentumCard({ projects, tasks }) {
  const TIER_LABELS = { 1: 'T1', 2: 'T2', 3: 'T3', 4: 'T4' }

  return (
    <WidgetCard title="Momentum projets">
      <div className="flex flex-col gap-4">
        {projects.map(p => {
          const pTasks = tasks.filter(t => t.projectId === p.id)
          const done = pTasks.filter(t => t.status === 'done').length
          const total = pTasks.length
          const pct = total > 0 ? Math.round((done / total) * 100) : (p.northStarProgress || 0)
          const momentum = getMomentum(tasks, p.id)

          return (
            <div key={p.id} className="flex items-center gap-3">
              {/* Ring */}
              <div className="relative w-10 h-10 flex-shrink-0">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{
                    background: `conic-gradient(${p.color} ${pct * 3.6}deg, var(--border-soft) 0deg)`,
                  }}
                >
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-[11px]"
                    style={{ background: 'var(--bg-card)', color: p.color }}
                  >
                    {p.emoji}
                  </div>
                </div>
              </div>
              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{p.name}</span>
                  <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>{TIER_LABELS[p.tier]}</span>
                </div>
                <p className="text-[11px] truncate mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{p.northStar}</p>
              </div>
              {/* % + momentum */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <span className="font-mono text-sm" style={{ color: 'var(--text-secondary)' }}>{pct}%</span>
                {momentum === 'up' && <TrendingUp size={13} style={{ color: 'var(--green-deep)' }} />}
                {momentum === 'down' && <TrendingDown size={13} style={{ color: 'var(--red-deep)' }} />}
                {momentum === 'flat' && <Minus size={13} style={{ color: 'var(--yellow-deep)' }} />}
              </div>
            </div>
          )
        })}
      </div>
    </WidgetCard>
  )
}

// ── StatsRow ──────────────────────────────────────────────────────────────────

function StatTile({ label, value, sub, barPct, barColor, onClick }) {
  return (
    <div
      className="rounded-2xl p-4 flex flex-col gap-2 transition-all"
      style={{
        background: 'var(--bg-card)',
        border: '0.5px solid var(--border-soft)',
        boxShadow: 'var(--shadow-card)',
        cursor: onClick ? 'pointer' : 'default',
      }}
      onClick={onClick}
    >
      <p className="text-[10px] uppercase tracking-wider font-medium" style={{ color: 'var(--text-tertiary)', letterSpacing: '0.06em' }}>{label}</p>
      <div className="font-mono text-xl font-semibold" style={{ color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>{value}</div>
      {barPct !== undefined && (
        <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--border-soft)' }}>
          <div className="h-full rounded-full transition-all" style={{ width: `${barPct}%`, background: barColor }} />
        </div>
      )}
      {sub && <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>{sub}</p>}
    </div>
  )
}

function StatsRow({ state, nowMinutes, onNavigate, dispatch }) {
  const weekStart = getWeekStart()
  const weekSeconds = state.sessions.filter(s => new Date(s.date) >= weekStart).reduce((sum, s) => sum + s.duration, 0)
  const weekHours = (weekSeconds / 3600).toFixed(1)

  const [endH, endM] = (state.settings?.endOfWorkday || '20:00').split(':').map(Number)
  const endMinutes = endH * 60 + endM
  const remainingMinutes = Math.max(0, endMinutes - nowMinutes)
  const remainingPct = Math.min(100, Math.max(0, (remainingMinutes / (endMinutes - 8 * 60)) * 100))

  const todayAll = state.tasks.filter(t => t.today)
  const todayDone = todayAll.filter(t => t.status === 'done').length
  const inboxCount = state.inbox.length
  const energyLabels = ['', 'Épuisé', 'Fatigué', 'Normal', 'En forme', 'Au top 💪']

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <StatTile
        label="Temps restant"
        value={formatTimeUntil(remainingMinutes)}
        barPct={remainingPct}
        barColor="var(--green-deep)"
      />
      <StatTile
        label="Priorités du jour"
        value={<>{todayDone}<span style={{ color: 'var(--text-tertiary)', fontSize: '1rem', fontWeight: 400 }}>/{todayAll.length}</span></>}
        barPct={todayAll.length ? (todayDone / todayAll.length) * 100 : 0}
        barColor="var(--violet-deep)"
      />
      <div
        className="rounded-2xl p-4 flex flex-col gap-2"
        style={{ background: 'var(--bg-card)', border: '0.5px solid var(--border-soft)', boxShadow: 'var(--shadow-card)' }}
      >
        <p className="text-[10px] uppercase tracking-wider font-medium" style={{ color: 'var(--text-tertiary)', letterSpacing: '0.06em' }}>Énergie</p>
        <div className="flex gap-1.5 mt-0.5">
          {[1, 2, 3, 4, 5].map(n => (
            <button
              key={n}
              onClick={() => dispatch({ type: 'SET_ENERGY', payload: n })}
              className="rounded-full border-2 transition-all focus:outline-none"
              style={{
                width: 18,
                height: 18,
                borderColor: n <= state.energy ? 'var(--violet-deep)' : 'var(--border-medium)',
                background: n <= state.energy ? 'var(--violet-bg)' : 'transparent',
              }}
            />
          ))}
        </div>
        <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>{energyLabels[state.energy] || 'Non défini'}</p>
      </div>
      <StatTile
        label="Inbox à trier"
        value={<span style={{ color: inboxCount > 0 ? 'var(--yellow-deep)' : 'var(--text-tertiary)' }}>{inboxCount}</span>}
        sub={inboxCount > 0 ? 'cliquer pour trier' : 'tout est trié 🎉'}
        onClick={() => onNavigate('inbox')}
      />
    </div>
  )
}

// ── PrioritiesCard ────────────────────────────────────────────────────────────

function PrioritiesCard({ tasks, projects, dispatch, onStartTask }) {
  const todayTasks = tasks
    .filter(t => t.today && t.status !== 'done')
    .sort((a, b) => (a.impact === 'high' ? -1 : 1) - (b.impact === 'high' ? -1 : 1))
    .slice(0, 3)

  const doneToday = tasks.filter(t => t.today && t.status === 'done').length
  const total = tasks.filter(t => t.today).length

  return (
    <WidgetCard
      title={`Priorités du jour · ${Math.min(3, total)} max`}
      badge={<span className="text-xs font-mono" style={{ color: 'var(--text-tertiary)' }}>{doneToday}/{total}</span>}
    >
      {todayTasks.length === 0 ? (
        <p className="text-sm text-center py-4" style={{ color: 'var(--text-tertiary)' }}>Aucune priorité — va dans Tâches pour en épingler</p>
      ) : (
        <div className="flex flex-col gap-2">
          {todayTasks.map(task => {
            const project = projects.find(p => p.id === task.projectId)
            return (
              <div key={task.id} className="flex items-center gap-3 py-1">
                <button
                  onClick={() => dispatch({ type: 'TOGGLE_TASK_DONE', payload: task.id })}
                  className="w-4 h-4 rounded border-2 flex-shrink-0 transition-colors"
                  style={{ borderColor: 'var(--border-medium)' }}
                />
                {project && <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: project.color }} />}
                <span className="flex-1 text-sm truncate" style={{ color: 'var(--text-primary)' }}>{task.title}</span>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {task.impact === 'high' && <Zap size={10} style={{ color: 'var(--yellow-deep)' }} />}
                  {task.ship80 && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium" style={{ background: 'var(--pink-bg)', color: 'var(--pink-deep)' }}>80%</span>
                  )}
                  <button
                    onClick={() => onStartTask(task.projectId, task.id)}
                    className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg transition-colors"
                    style={{ background: 'var(--violet-bg)', color: 'var(--violet-deep)' }}
                  >
                    <Play size={9} /> Go
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </WidgetCard>
  )
}

// ── Drag & drop widget wrapper ────────────────────────────────────────────────

const DEFAULT_WIDGET_ORDER = ['hero', 'stats', 'priorities']
const LAYOUT_KEY = 'cockpit:dashboard:layout:journee'

function SortableWidget({ id, children }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
    >
      <div className="relative group">
        {/* Drag handle */}
        <button
          {...attributes}
          {...listeners}
          className="absolute top-3 right-3 z-10 p-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
          style={{ background: 'var(--bg-card-soft)', color: 'var(--text-tertiary)' }}
          title="Réorganiser"
        >
          <GripVertical size={14} />
        </button>
        {children}
      </div>
    </div>
  )
}

// ── Main Journee ─────────────────────────────────────────────────────────────

export default function Journee({ onStartTask, onNavigate }) {
  const { state, dispatch } = useStore()
  const [now, setNow] = useState(new Date())
  const [captureText, setCaptureText] = useState('')
  const [captured, setCaptured] = useState(false)
  const [widgetOrder, setWidgetOrder] = useState(() => {
    try {
      const saved = localStorage.getItem(LAYOUT_KEY)
      return saved ? JSON.parse(saved) : DEFAULT_WIDGET_ORDER
    } catch { return DEFAULT_WIDGET_ORDER }
  })

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000)
    return () => clearInterval(t)
  }, [])

  const nowMinutes = now.getHours() * 60 + now.getMinutes()
  const weekNum = getWeekNumber(now)

  function getGreeting() {
    const h = now.getHours()
    if (h >= 3 && h < 6) return 'Qiyâm 🌙'
    if (h >= 6 && h < 12) return 'Bonjour ☀️'
    if (h >= 12 && h < 18) return 'Bon après-midi 🌤'
    if (h >= 18 && h < 21) return 'Bonne soirée 🌇'
    return 'Bonne nuit 🌙'
  }

  const weekStart = getWeekStart()
  const weekSeconds = state.sessions.filter(s => new Date(s.date) >= weekStart).reduce((sum, s) => sum + s.duration, 0)
  const weekHours = (weekSeconds / 3600).toFixed(1)

  const nextPrayer = getNextPrayer(nowMinutes)
  const timeUntilPrayer = nextPrayer ? formatTimeUntil(nextPrayer.startMin - nowMinutes) : null

  // Drift alert
  const weekSessions = state.sessions.filter(s => new Date(s.date) >= weekStart)
  const totalWeekSec = weekSessions.reduce((s, x) => s + x.duration, 0)
  const tier34Ids = new Set(state.projects.filter(p => p.tier >= 3).map(p => p.id))
  const tier34Sec = weekSessions.filter(s => tier34Ids.has(s.projectId)).reduce((s, x) => s + x.duration, 0)
  const driftPct = totalWeekSec > 0 ? Math.round((tier34Sec / totalWeekSec) * 100) : 0
  const showDrift = driftPct > 30

  function handleCapture(e) {
    if (e.key === 'Enter' && captureText.trim()) {
      dispatch({ type: 'ADD_INBOX', payload: { text: captureText.trim(), type: 'task' } })
      setCaptureText('')
      setCaptured(true)
      setTimeout(() => setCaptured(false), 2000)
    }
  }

  // Drag & drop
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  function handleDragEnd({ active, over }) {
    if (!over || active.id === over.id) return
    const oldIdx = widgetOrder.indexOf(active.id)
    const newIdx = widgetOrder.indexOf(over.id)
    if (oldIdx === -1 || newIdx === -1) return
    const next = arrayMove(widgetOrder, oldIdx, newIdx)
    setWidgetOrder(next)
    try { localStorage.setItem(LAYOUT_KEY, JSON.stringify(next)) } catch {}
  }

  function renderWidget(id) {
    switch (id) {
      case 'hero':
        return (
          <div className="grid gap-4" style={{ gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)' }}>
            <DeadlinesCard tasks={state.tasks} projects={state.projects} onNavigate={onNavigate} />
            <MomentumCard projects={state.projects} tasks={state.tasks} />
          </div>
        )
      case 'stats':
        return (
          <StatsRow
            state={state}
            nowMinutes={nowMinutes}
            onNavigate={onNavigate}
            dispatch={dispatch}
          />
        )
      case 'priorities':
        return (
          <PrioritiesCard
            tasks={state.tasks}
            projects={state.projects}
            dispatch={dispatch}
            onStartTask={onStartTask}
          />
        )
      default:
        return null
    }
  }

  return (
    <div className="space-y-4 pb-8">

      {/* Drift alert */}
      {showDrift && (
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-2xl"
          style={{ background: 'var(--yellow-bg)', border: '1px solid var(--yellow-solid)' }}
        >
          <AlertTriangle size={15} style={{ color: 'var(--yellow-deep)', flexShrink: 0 }} />
          <p className="text-sm flex-1" style={{ color: 'var(--yellow-deep)' }}>
            Tu as passé <strong>{driftPct}%</strong> de ton temps sur T3/T4 cette semaine. Recentre-toi sur T1/T2.
          </p>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] mb-1 uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
            Semaine {weekNum} · {now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            {getGreeting()}
          </h1>
        </div>
        <div className="text-right flex-shrink-0">
          {nextPrayer && timeUntilPrayer && (
            <p className="font-mono text-sm font-semibold" style={{ color: 'var(--pink-deep)' }}>
              {timeUntilPrayer} avant {nextPrayer.label}
            </p>
          )}
          <p className="font-mono text-[11px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{weekHours}h cette semaine</p>
        </div>
      </div>

      {/* Draggable widgets */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={widgetOrder} strategy={verticalListSortingStrategy}>
          <div className="space-y-4">
            {widgetOrder.map(id => (
              <SortableWidget key={id} id={id}>
                {renderWidget(id)}
              </SortableWidget>
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Prayer widget — mobile only (on desktop it's in RightSidebar) */}
      <div className="lg:hidden">
        <PrayerWidget nowMinutes={nowMinutes} />
      </div>

      {/* Capture bar */}
      <div
        className="rounded-2xl px-4 py-3 flex items-center gap-3"
        style={{ background: 'var(--violet-bg)', border: '1px solid var(--violet-solid)' }}
      >
        <input
          value={captureText}
          onChange={e => setCaptureText(e.target.value)}
          onKeyDown={handleCapture}
          placeholder="Capture rapide — idée, tâche, à pas oublier..."
          className="flex-1 bg-transparent text-sm focus:outline-none"
          style={{ color: 'var(--text-primary)' }}
        />
        {captured ? (
          <span className="text-xs font-medium flex-shrink-0" style={{ color: 'var(--green-deep)' }}>Capturé ✓</span>
        ) : (
          <kbd
            className="flex-shrink-0 text-[10px] px-2 py-1 rounded-lg font-mono"
            style={{ background: 'var(--bg-card)', color: 'var(--text-tertiary)', border: '1px solid var(--border-soft)' }}
          >
            ⌘K
          </kbd>
        )}
      </div>
    </div>
  )
}
