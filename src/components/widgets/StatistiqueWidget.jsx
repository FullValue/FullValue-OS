import { useMemo } from 'react'
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { useStore } from '@/store/useStore'

// Build 30-day completion percentage data from tasks
function build30DayData(tasks) {
  const data = []
  const now = new Date()
  for (let i = 29; i >= 0; i--) {
    const day = new Date(now)
    day.setDate(day.getDate() - i)
    const iso = day.toISOString().slice(0, 10)

    const completed = tasks.filter(t =>
      t.completedAt && t.completedAt.slice(0, 10) === iso
    ).length

    data.push({
      date: iso,
      label: i === 0 ? "Auj." : i % 7 === 0 ? `J-${i}` : '',
      value: completed,
    })
  }
  return data
}

// SVG progress ring
function ProgressRing({ pct, size = 148 }) {
  const r = (size - 10) / 2
  const cx = size / 2
  const cy = size / 2
  const circ = 2 * Math.PI * r
  const fill = Math.min(100, Math.max(0, pct))
  const dash = (fill / 100) * circ

  // Position the percentage pill at top (12 o'clock = -90deg offset)
  const angle = (fill / 100) * 360 - 90
  const rad = (angle * Math.PI) / 180
  const pillX = cx + r * Math.cos(rad)
  const pillY = cy + r * Math.sin(rad)

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="absolute inset-0" style={{ transform: 'rotate(-90deg)' }}>
        {/* Track */}
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--border-soft)" strokeWidth={3} />
        {/* Progress */}
        <circle
          cx={cx} cy={cy} r={r} fill="none"
          stroke="var(--violet-deep)"
          strokeWidth={3}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`}
          style={{ transition: 'stroke-dasharray 0.6s ease' }}
        />
      </svg>

      {/* Pill on arc */}
      {fill > 5 && (
        <div
          className="absolute text-[11px] font-semibold px-2 py-0.5 rounded-full select-none pointer-events-none"
          style={{
            left: pillX,
            top: pillY,
            transform: 'translate(-50%, -50%)',
            background: 'var(--violet-solid)',
            color: 'var(--violet-deep)',
            fontSize: 11,
            whiteSpace: 'nowrap',
          }}
        >
          {fill}%
        </div>
      )}

      {/* Center avatar */}
      <div
        className="relative z-10 flex items-center justify-center rounded-full select-none"
        style={{
          width: size - 28,
          height: size - 28,
          background: 'var(--violet-bg)',
          fontSize: size * 0.44,
        }}
      >
        🧠
      </div>
    </div>
  )
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div
      className="text-xs px-2.5 py-1.5 rounded-lg"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border-soft)', color: 'var(--text-primary)', boxShadow: 'var(--shadow-card)' }}
    >
      <span className="font-semibold">{payload[0].value}</span>
      <span style={{ color: 'var(--text-tertiary)' }}> tâches</span>
    </div>
  )
}

function getGreeting() {
  const h = new Date().getHours()
  if (h >= 3 && h < 12) return 'Bonjour 👋'
  if (h >= 12 && h < 18) return 'Bon après-midi ☀️'
  if (h >= 18 && h < 21) return 'Bonne soirée 🌅'
  return 'Bonne nuit 🌙'
}

export default function StatistiqueWidget() {
  const { state } = useStore()

  // Weekly completion %
  const weekStart = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
    return d
  }, [])

  const weekTasks = state.tasks.filter(t => {
    const created = t.createdAt ? new Date(t.createdAt) : null
    return !created || created >= weekStart
  })
  const weekDone = state.tasks.filter(t => t.completedAt && new Date(t.completedAt) >= weekStart).length
  const weekTotal = state.tasks.filter(t => {
    const created = t.createdAt ? new Date(t.createdAt) : null
    return !created || created >= weekStart
  }).length
  const weekPct = weekTotal > 0 ? Math.round((weekDone / weekTotal) * 100) : 0

  const chartData = useMemo(() => build30DayData(state.tasks), [state.tasks])

  const xLabels = chartData.filter(d => d.label).map(d => d.date)

  return (
    <div
      className="rounded-3xl p-6 flex flex-col gap-5"
      style={{
        background: 'var(--bg-card)',
        border: '0.5px solid var(--border-soft)',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      {/* Progress ring + greeting */}
      <div className="flex flex-col items-center gap-3">
        <ProgressRing pct={weekPct} size={148} />
        <div className="text-center">
          <p className="font-semibold text-lg" style={{ color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
            {getGreeting()}
          </p>
          <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
            {weekPct >= 80
              ? 'Excellent rythme cette semaine ! 🔥'
              : weekPct >= 50
              ? 'Continue d\'avancer pour ton objectif !'
              : weekPct > 0
              ? 'Lance-toi, chaque tâche compte !'
              : 'Aucune tâche complétée cette semaine.'}
          </p>
        </div>
      </div>

      {/* 30-day chart */}
      <div>
        <p className="text-[10px] uppercase tracking-wider font-medium mb-2" style={{ color: 'var(--text-tertiary)' }}>
          Tâches terminées · 30 jours
        </p>
        <div style={{ height: 90 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="violetGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--violet-deep)" stopOpacity={0.18} />
                  <stop offset="100%" stopColor="var(--violet-deep)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 9, fill: 'var(--text-tertiary)', fontFamily: 'JetBrains Mono, monospace' }}
                tickFormatter={v => {
                  const idx = chartData.findIndex(d => d.date === v)
                  if (idx === 0) return chartData[0].date.slice(8)
                  if (idx === 14) return chartData[14].date.slice(8)
                  if (idx === 29) return 'Auj.'
                  return ''
                }}
                interval={0}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="value"
                stroke="var(--violet-deep)"
                strokeWidth={1.5}
                fill="url(#violetGrad)"
                dot={false}
                activeDot={{ r: 3, fill: 'var(--violet-deep)', strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
