import { useState } from 'react'
import { Sunrise, Sun, Sunset, Moon, CloudSun, Settings } from 'lucide-react'
import StatistiqueWidget from '@/components/widgets/StatistiqueWidget'
import PrayerTimesEditor from '@/components/PrayerTimesEditor'
import { useStore } from '@/store/useStore'
import { Button } from '@/components/ui/button'

function hhmmToMin(s) {
  if (!s || typeof s !== 'string') return 0
  const [h, m] = s.split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

function buildPrayerBlocks(prayerTimes) {
  return [
    { label: 'Fajr',    startMin: hhmmToMin(prayerTimes?.fajr    || '05:30'), durationMin: 30 },
    { label: 'Dhuhr',   startMin: hhmmToMin(prayerTimes?.dhuhr   || '13:15'), durationMin: 30 },
    { label: 'Asr',     startMin: hhmmToMin(prayerTimes?.asr     || '17:00'), durationMin: 30 },
    { label: 'Maghrib', startMin: hhmmToMin(prayerTimes?.maghrib || '20:30'), durationMin: 20 },
    { label: 'Isha',    startMin: hhmmToMin(prayerTimes?.isha    || '21:30'), durationMin: 30 },
  ]
}

const STRIP_ICONS = { fajr: Sunrise, shuruq: Sun, dhuhr: Sun, asr: CloudSun, maghrib: Sunset, isha: Moon }
const STRIP_LABELS = { fajr: 'Fajr', shuruq: 'Shuruq', dhuhr: 'Dhuhr', asr: 'Asr', maghrib: 'Maghrib', isha: 'Isha' }
const STRIP_ORDER = ['fajr', 'shuruq', 'dhuhr', 'asr', 'maghrib', 'isha']

function buildStrip(prayerTimes) {
  return STRIP_ORDER.map(key => ({
    label: STRIP_LABELS[key],
    startMin: hhmmToMin(prayerTimes?.[key] || ''),
    Icon: STRIP_ICONS[key],
  }))
}

function getNextPrayer(nowMin, blocks) {
  return blocks.find(p => p.startMin > nowMin) || blocks[0]
}

function formatHHMM(min) {
  const h = Math.floor(min / 60) % 24
  const m = min % 60
  return `${String(h).padStart(2, '0')}h${String(m).padStart(2, '0')}`
}

function formatTimeUntil(diff) {
  if (diff <= 0) return '0m'
  const h = Math.floor(diff / 60)
  const m = diff % 60
  if (h > 0 && m > 0) return `${h}h${m}m`
  if (h > 0) return `${h}h`
  return `${m}m`
}

// ── Prayer arc helpers ────────────────────────────────────────────────────────
// Quadratic bezier: M 10 108 Q 140 -18 270 108
const P0 = { x: 10,  y: 108 }
const P1 = { x: 140, y: -18 }
const P2 = { x: 270, y: 108 }

function tFromMin(min, fajrMin, ishaMin) {
  const span = Math.max(1, ishaMin - fajrMin)
  return Math.max(0, Math.min(1, (min - fajrMin) / span))
}

function bezierPt(t) {
  const mt = 1 - t
  return {
    x: mt * mt * P0.x + 2 * t * mt * P1.x + t * t * P2.x,
    y: mt * mt * P0.y + 2 * t * mt * P1.y + t * t * P2.y,
  }
}

// ── Label offsets per prayer (avoid overlap) ─────────────────────────────────
const LABEL_CFG = {
  Fajr:    { dx:  4,  dy: -13, anchor: 'start',  short: 'Fajr'  },
  Dhuhr:   { dx:  0,  dy: -13, anchor: 'middle', short: 'Dhuhr' },
  Asr:     { dx:  0,  dy: -13, anchor: 'middle', short: 'Asr'   },
  Maghrib: { dx: -4,  dy: -13, anchor: 'end',    short: 'Magh.' },
  Isha:    { dx:  2,  dy:  17, anchor: 'end',    short: 'Isha'  },
}

function PrayerWidget({ nowMinutes }) {
  const { state } = useStore()
  const [editorOpen, setEditorOpen] = useState(false)
  const prayerTimes = state.settings?.prayerTimes
  const blocks = buildPrayerBlocks(prayerTimes)
  const strip = buildStrip(prayerTimes)

  const nextPrayer = getNextPrayer(nowMinutes, blocks)
  const diffMin = nextPrayer ? nextPrayer.startMin - nowMinutes : 0

  const FAJR_MIN = blocks[0].startMin
  const ISHA_MIN = blocks[blocks.length - 1].startMin

  const prayers = blocks.map(b => ({
    ...b,
    pt:     bezierPt(tFromMin(b.startMin, FAJR_MIN, ISHA_MIN)),
    isNext: nextPrayer?.label === b.label,
    isPast: nowMinutes > b.startMin + b.durationMin,
  }))

  const nowT   = tFromMin(nowMinutes, FAJR_MIN, ISHA_MIN)
  const nowPt  = bezierPt(nowT)
  const showNow = nowMinutes >= FAJR_MIN && nowMinutes <= ISHA_MIN + 90

  return (
    <div
      className="rounded-3xl p-5"
      style={{ background: 'var(--bg-card)', border: '0.5px solid var(--border-soft)', boxShadow: 'var(--shadow-card)' }}
    >
      <div className="flex items-start justify-between mb-1">
        <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
          Horaires de prière
        </p>
        <Button variant="ghost" size="icon-sm" onClick={() => setEditorOpen(true)}
          className="text-[var(--text-tertiary)]"
          title="Modifier les horaires">
          <Settings size={12} />
        </Button>
      </div>
      <p className="text-[10px] font-mono mb-4" style={{ color: 'var(--text-tertiary)' }}>
        {formatHHMM(nowMinutes)} · aujourd'hui
      </p>

      <PrayerTimesEditor isOpen={editorOpen} onClose={() => setEditorOpen(false)} />

      {/* ── Arc SVG ── */}
      <svg viewBox="0 0 280 132" width="100%" style={{ display: 'block', overflow: 'visible', marginBottom: 14 }}>
        {/* Gradient defs */}
        <defs>
          <linearGradient id="arcGradPast" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="var(--violet-deep)" stopOpacity="0.5" />
            <stop offset="100%" stopColor="var(--violet-deep)" stopOpacity="0.2" />
          </linearGradient>
        </defs>

        {/* Background arc track */}
        <path
          d="M 10 108 Q 140 -18 270 108"
          fill="none"
          stroke="var(--border-soft)"
          strokeWidth="2.5"
          strokeLinecap="round"
        />

        {/* Sunrise / sunset fill under arc */}
        <path
          d="M 10 108 Q 140 -18 270 108 Z"
          fill="var(--violet-deep)"
          opacity="0.03"
        />

        {/* Prayer markers + labels */}
        {prayers.map(p => {
          const cfg = LABEL_CFG[p.label]
          const color = p.isNext
            ? 'var(--pink-deep)'
            : p.isPast
            ? 'var(--text-tertiary)'
            : 'var(--border-strong)'

          return (
            <g key={p.label}>
              {/* Glow ring for next */}
              {p.isNext && (
                <>
                  <circle cx={p.pt.x} cy={p.pt.y} r={14} fill="var(--pink-deep)" opacity={0.10} />
                  <circle cx={p.pt.x} cy={p.pt.y} r={8}  fill="var(--pink-deep)" opacity={0.15} />
                </>
              )}
              {/* Dot */}
              <circle
                cx={p.pt.x}
                cy={p.pt.y}
                r={p.isNext ? 5 : 3}
                fill={color}
              />
              {/* Vertical tick */}
              <line
                x1={p.pt.x} y1={p.pt.y + (p.isNext ? 6 : 4)}
                x2={p.pt.x} y2={p.pt.y + (p.isNext ? 6 : 4)}
                stroke={color}
                strokeWidth="1"
                opacity="0.4"
              />
              {/* Label */}
              <text
                x={p.pt.x + cfg.dx}
                y={p.pt.y + cfg.dy}
                textAnchor={cfg.anchor}
                fontSize={9}
                fontFamily="JetBrains Mono, monospace"
                fontWeight={p.isNext ? '700' : '400'}
                fill={p.isNext ? 'var(--pink-deep)' : 'var(--text-tertiary)'}
              >
                {cfg.short}
              </text>
              {/* Time below label for next prayer */}
              {p.isNext && (
                <text
                  x={p.pt.x + cfg.dx}
                  y={p.pt.y + cfg.dy - 10}
                  textAnchor={cfg.anchor}
                  fontSize={8}
                  fontFamily="JetBrains Mono, monospace"
                  fill="var(--pink-deep)"
                  opacity={0.7}
                >
                  {formatHHMM(p.startMin)}
                </text>
              )}
            </g>
          )
        })}

        {/* Current time dot */}
        {showNow && (
          <g>
            <circle cx={nowPt.x} cy={nowPt.y} r={7} fill="var(--violet-deep)" opacity={0.12} />
            <circle cx={nowPt.x} cy={nowPt.y} r={3.5} fill="var(--violet-deep)" />
          </g>
        )}

        {/* Time axis labels */}
        <text x="10"  y="124" fontSize={8} fill="var(--text-tertiary)" fontFamily="JetBrains Mono, monospace" textAnchor="start">5h</text>
        <text x="140" y="124" fontSize={8} fill="var(--text-tertiary)" fontFamily="JetBrains Mono, monospace" textAnchor="middle">13h</text>
        <text x="270" y="124" fontSize={8} fill="var(--text-tertiary)" fontFamily="JetBrains Mono, monospace" textAnchor="end">21h</text>
      </svg>

      {/* ── All prayers strip ── */}
      <div className="flex items-stretch gap-0.5 rounded-2xl p-1"
        style={{ background: 'rgba(0,0,0,0.15)' }}>
        {strip.map(p => {
          const isNext = nextPrayer?.label === p.label
          return (
            <div key={p.label}
              className="flex-1 flex flex-col items-center gap-1 py-2.5 px-0.5 rounded-xl"
              style={isNext ? { background: 'var(--pink-bg)', border: '1px solid var(--pink-solid)' } : {}}>
              <p.Icon size={12} style={{ color: isNext ? 'var(--pink-deep)' : 'var(--text-tertiary)' }} strokeWidth={isNext ? 2.5 : 1.5} />
              <span className="text-[7px] uppercase font-semibold tracking-wide leading-none"
                style={{ color: isNext ? 'var(--pink-deep)' : 'var(--text-tertiary)' }}>
                {p.label}
              </span>
              <span className="font-mono text-[9px] font-semibold tabular-nums leading-none"
                style={{ color: isNext ? 'var(--pink-deep)' : 'var(--text-secondary)' }}>
                {formatHHMM(p.startMin)}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function RightSidebar({ nowMinutes }) {
  return (
    <aside
      className="hidden lg:block fixed top-20 bottom-6 right-6 overflow-y-auto"
      style={{ width: 300 }}
    >
      <div className="flex flex-col gap-4">
        <StatistiqueWidget />
        <PrayerWidget nowMinutes={nowMinutes} />
      </div>
    </aside>
  )
}

// Exported for inline use on mobile
export { PrayerWidget }
