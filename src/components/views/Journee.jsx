import { useState, useEffect, useMemo, useRef } from 'react'
import confetti from 'canvas-confetti'
import {
  Play, AlertTriangle, Inbox, ChevronRight,
  TrendingUp, TrendingDown, Minus, Zap, GripVertical,
  Plus, X,
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
import StatistiqueWidget from '@/components/widgets/StatistiqueWidget'
import CapacityWidget from '@/components/widgets/CapacityWidget'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress, ProgressRing } from '@/components/ui/progress'

// ── Helpers ──────────────────────────────────────────────────────────────────

function getWeekNumber(d) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const dayNum = date.getUTCDay() || 7
  date.setUTCDate(date.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  return Math.ceil((((date - yearStart) / 86400000) + 1) / 7)
}

function hhmmToMin(s) {
  if (!s || typeof s !== 'string') return 0
  const [h, m] = s.split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

function getNextPrayer(nowMin, prayerTimes) {
  const blocks = [
    { label: 'Fajr',    startMin: hhmmToMin(prayerTimes?.fajr    || '05:30') },
    { label: 'Dhuhr',   startMin: hhmmToMin(prayerTimes?.dhuhr   || '13:15') },
    { label: 'Asr',     startMin: hhmmToMin(prayerTimes?.asr     || '17:00') },
    { label: 'Maghrib', startMin: hhmmToMin(prayerTimes?.maghrib || '20:30') },
    { label: 'Isha',    startMin: hhmmToMin(prayerTimes?.isha    || '21:30') },
  ]
  const upcoming = blocks.filter(p => p.startMin > nowMin)
  return upcoming[0] || { label: 'Qiyâm', startMin: 3 * 60 + 30 }
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
    <Card className="overflow-hidden">
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
    </Card>
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
        <Button variant="ghost" size="icon-sm" onClick={() => onNavigate('taches')} style={{ color: 'var(--text-tertiary)' }}>
          <ChevronRight size={14} />
        </Button>
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
              <ProgressRing value={pct} size={40} strokeWidth={3} color={p.color} className="flex-shrink-0">
                <span className="text-[11px]" style={{ color: p.color }}>{p.emoji}</span>
              </ProgressRing>
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
    <Card
      className="p-4 flex flex-col gap-2"
      style={{ cursor: onClick ? 'pointer' : 'default' }}
      onClick={onClick}
    >
      <p className="text-[10px] uppercase tracking-wider font-medium" style={{ color: 'var(--text-tertiary)', letterSpacing: '0.06em' }}>{label}</p>
      <div className="font-mono text-xl font-semibold tabular" style={{ color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>{value}</div>
      {barPct !== undefined && (
        <Progress value={barPct} color={barColor} className="h-1" />
      )}
      {sub && <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>{sub}</p>}
    </Card>
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
      <Card className="p-4 flex flex-col gap-2">
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
      </Card>
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
  const [picking, setPicking] = useState(false)
  const [search, setSearch] = useState('')
  const [showCelebration, setShowCelebration] = useState(false)
  const prevNotDoneRef = useRef(null)

  const todayAll = tasks.filter(t => t.today)
  const todayNotDone = todayAll.filter(t => t.status !== 'done')
  const todayDone = todayAll.filter(t => t.status === 'done')
  const tooMany = todayNotDone.length > 5

  useEffect(() => {
    if (
      todayAll.length > 0 &&
      todayNotDone.length === 0 &&
      prevNotDoneRef.current > 0
    ) {
      setShowCelebration(true)
      const end = Date.now() + 3000
      const colors = ['#a786ff', '#fd8bbc', '#eca184', '#f8deb1']
      const frame = () => {
        if (Date.now() > end) return
        confetti({ particleCount: 2, angle: 60,  spread: 55, startVelocity: 60, origin: { x: 0, y: 0.5 }, colors })
        confetti({ particleCount: 2, angle: 120, spread: 55, startVelocity: 60, origin: { x: 1, y: 0.5 }, colors })
        requestAnimationFrame(frame)
      }
      frame()
      setTimeout(() => setShowCelebration(false), 3000)
    }
    prevNotDoneRef.current = todayNotDone.length
  }, [todayNotDone.length, todayAll.length])

  const available = tasks.filter(t => !t.today && t.status !== 'done')
  const filtered = search
    ? available.filter(t => t.title.toLowerCase().includes(search.toLowerCase()))
    : available

  const byProject = projects
    .map(p => ({ ...p, items: filtered.filter(t => t.projectId === p.id) }))
    .filter(p => p.items.length > 0)
  const orphaned = filtered.filter(t => !projects.find(p => p.id === t.projectId))

  const sortedToday = [
    ...todayNotDone.sort((a, b) => (a.impact === 'high' ? -1 : 1) - (b.impact === 'high' ? -1 : 1)),
    ...todayDone,
  ]

  return (
    <div className="relative">
    {showCelebration && (
      <div
        className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-2xl"
        style={{ background: 'rgba(10,8,20,0.82)', backdropFilter: 'blur(8px)' }}
      >
        <p className="text-3xl font-bold text-white" style={{ letterSpacing: '-0.02em' }}>Mission accomplie</p>
        <p className="text-4xl mt-2">🎉</p>
      </div>
    )}
    <WidgetCard
      title="Priorités du jour · 5 max"
      badge={
        <div className="flex items-center gap-1.5">
          {tooMany && (
            <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: 'var(--yellow-bg)', color: 'var(--yellow-deep)' }}>
              Trop chargé
            </span>
          )}
          <span className="text-xs font-mono" style={{ color: 'var(--text-tertiary)' }}>{todayDone.length}/{todayAll.length}</span>
        </div>
      }
      action={
        <button
          onClick={() => { setPicking(p => !p); setSearch('') }}
          className="w-5 h-5 rounded-full flex items-center justify-center transition-all"
          style={{ background: picking ? 'var(--violet-deep)' : 'var(--violet-bg)', color: picking ? '#fff' : 'var(--violet-deep)' }}
        >
          {picking ? <X size={10} /> : <Plus size={10} />}
        </button>
      }
    >
      {/* Current today tasks */}
      {sortedToday.length === 0 && !picking ? (
        <p className="text-sm text-center py-4" style={{ color: 'var(--text-tertiary)' }}>
          Clique <strong>+</strong> pour choisir tes priorités du jour
        </p>
      ) : (
        <div className="flex flex-col gap-1">
          {sortedToday.map(task => {
            const project = projects.find(p => p.id === task.projectId)
            const isDone = task.status === 'done'
            return (
              <div
                key={task.id}
                className="flex items-center gap-3 py-1.5 px-1 rounded-xl group"
                style={{ opacity: isDone ? 0.5 : 1 }}
              >
                <Checkbox
                  checked={isDone}
                  onCheckedChange={() => dispatch({ type: 'TOGGLE_TASK_DONE', payload: task.id })}
                  className="flex-shrink-0"
                />
                {project && <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: project.color }} />}
                <span
                  className="flex-1 text-sm truncate"
                  style={{ color: 'var(--text-primary)', textDecoration: isDone ? 'line-through' : 'none' }}
                >
                  {task.title}
                </span>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {task.impact === 'high' && <Zap size={10} style={{ color: 'var(--yellow-deep)' }} />}
                  {task.ship80 && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium" style={{ background: 'var(--pink-bg)', color: 'var(--pink-deep)' }}>80%</span>
                  )}
                  {!isDone && (
                    <button
                      onClick={() => onStartTask(task.projectId, task.id)}
                      className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg"
                      style={{ background: 'var(--violet-bg)', color: 'var(--violet-deep)' }}
                    >
                      <Play size={9} /> Go
                    </button>
                  )}
                  <button
                    onClick={() => dispatch({ type: 'UPDATE_TASK', payload: { id: task.id, today: false } })}
                    className="p-0.5 rounded transition-all opacity-0 group-hover:opacity-100"
                    style={{ color: 'var(--text-tertiary)' }}
                    title="Retirer des priorités"
                  >
                    <X size={11} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Picker */}
      {picking && (
        <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--border-soft)' }}>
          <Input
            autoFocus
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Chercher une tâche..."
            className="mb-2"
          />
          {filtered.length === 0 ? (
            <p className="text-sm text-center py-3" style={{ color: 'var(--text-tertiary)' }}>
              {search ? 'Aucun résultat' : 'Toutes les tâches sont épinglées ou terminées'}
            </p>
          ) : (
            <div className="flex flex-col gap-0.5 max-h-52 overflow-y-auto">
              {byProject.map(p => (
                <div key={p.id} className="mb-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wide px-2 py-1" style={{ color: 'var(--text-tertiary)' }}>
                    {p.emoji} {p.name}
                  </p>
                  {p.items.map(task => (
                    <button
                      key={task.id}
                      onClick={() => dispatch({ type: 'UPDATE_TASK', payload: { id: task.id, today: true } })}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-left"
                      style={{ color: 'var(--text-primary)' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--violet-bg)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <Plus size={10} style={{ color: 'var(--violet-deep)', flexShrink: 0 }} />
                      <span className="flex-1 truncate">{task.title}</span>
                      {task.impact === 'high' && <Zap size={10} style={{ color: 'var(--yellow-deep)', flexShrink: 0 }} />}
                      {task.ship80 && <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0" style={{ background: 'var(--pink-bg)', color: 'var(--pink-deep)' }}>80%</span>}
                    </button>
                  ))}
                </div>
              ))}
              {orphaned.map(task => (
                <button
                  key={task.id}
                  onClick={() => dispatch({ type: 'UPDATE_TASK', payload: { id: task.id, today: true } })}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-left"
                  style={{ color: 'var(--text-primary)' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--violet-bg)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <Plus size={10} style={{ color: 'var(--violet-deep)', flexShrink: 0 }} />
                  <span className="flex-1 truncate">{task.title}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </WidgetCard>
    </div>
  )
}

// ── Drag & drop widget wrapper ────────────────────────────────────────────────

const DEFAULT_WIDGET_ORDER = ['hero', 'capacity', 'stats', 'priorities']
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
          className="absolute top-3 left-3 z-10 p-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
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
      if (!saved) return DEFAULT_WIDGET_ORDER
      const parsed = JSON.parse(saved)
      const missing = DEFAULT_WIDGET_ORDER.filter(id => !parsed.includes(id))
      return missing.length ? [...parsed.slice(0, 1), ...missing, ...parsed.slice(1)] : parsed
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

  const nextPrayer = getNextPrayer(nowMinutes, state.settings?.prayerTimes)
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
      case 'capacity':
        return <CapacityWidget />
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

      {/* Sidebar widgets — mobile only (on desktop they live in RightSidebar) */}
      <div className="lg:hidden space-y-4">
        <StatistiqueWidget />
        <PrayerWidget nowMinutes={nowMinutes} />
      </div>

      {/* Capture bar */}
      <div
        className="rounded-2xl px-4 py-3 flex items-center gap-3"
        style={{ background: 'var(--violet-bg)', border: '1px solid var(--violet-solid)' }}
      >
        <Input
          value={captureText}
          onChange={e => setCaptureText(e.target.value)}
          onKeyDown={handleCapture}
          placeholder="Capture rapide — idée, tâche, à pas oublier..."
          className="flex-1 h-auto border-transparent bg-transparent px-0 focus:border-transparent focus:bg-transparent focus:ring-0"
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
