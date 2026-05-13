import StatistiqueWidget from '@/components/widgets/StatistiqueWidget'

const PRAYER_BLOCKS = [
  { label: 'Fajr',    startMin: 5 * 60 + 30,  durationMin: 30 },
  { label: 'Dhuhr',   startMin: 13 * 60 + 15, durationMin: 30 },
  { label: 'Asr',     startMin: 17 * 60,       durationMin: 30 },
  { label: 'Maghrib', startMin: 20 * 60 + 30,  durationMin: 20 },
  { label: 'Isha',    startMin: 21 * 60 + 30,  durationMin: 30 },
]

function getNextPrayer(nowMin) {
  return PRAYER_BLOCKS.find(p => p.startMin > nowMin) || PRAYER_BLOCKS[0]
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

const FAJR_MIN = PRAYER_BLOCKS[0].startMin   // 330
const ISHA_MIN  = PRAYER_BLOCKS[4].startMin  // 1290
const DAY_SPAN  = ISHA_MIN - FAJR_MIN        // 960

function tFromMin(min) {
  return Math.max(0, Math.min(1, (min - FAJR_MIN) / DAY_SPAN))
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
  const nextPrayer = getNextPrayer(nowMinutes)
  const diffMin = nextPrayer ? nextPrayer.startMin - nowMinutes : 0

  const prayers = PRAYER_BLOCKS.map(b => ({
    ...b,
    pt:     bezierPt(tFromMin(b.startMin)),
    isNext: nextPrayer?.label === b.label,
    isPast: nowMinutes > b.startMin + b.durationMin,
  }))

  const nowT   = tFromMin(nowMinutes)
  const nowPt  = bezierPt(nowT)
  const showNow = nowMinutes >= FAJR_MIN && nowMinutes <= ISHA_MIN + 90

  return (
    <div
      className="rounded-3xl p-5"
      style={{ background: 'var(--bg-card)', border: '0.5px solid var(--border-soft)', boxShadow: 'var(--shadow-card)' }}
    >
      <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
        Horaires de prière
      </p>
      <p className="text-[10px] font-mono mb-4" style={{ color: 'var(--text-tertiary)' }}>
        {formatHHMM(nowMinutes)} · aujourd'hui
      </p>

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

      {/* ── Next prayer banner ── */}
      {nextPrayer && (
        <div
          className="flex items-center justify-between px-4 py-3 rounded-2xl"
          style={{ background: 'var(--pink-bg)', border: '1px solid var(--pink-solid)' }}
        >
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--pink-deep)' }}>
              {nextPrayer.label}
            </p>
            {diffMin > 0 && (
              <p className="text-[11px] mt-0.5" style={{ color: 'var(--pink-deep)', opacity: 0.7 }}>
                dans {formatTimeUntil(diffMin)}
              </p>
            )}
          </div>
          <span className="font-mono text-base font-semibold tabular-nums" style={{ color: 'var(--pink-deep)' }}>
            {formatHHMM(nextPrayer.startMin)}
          </span>
        </div>
      )}
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
