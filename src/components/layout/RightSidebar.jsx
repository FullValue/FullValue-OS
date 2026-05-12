import StatistiqueWidget from '@/components/widgets/StatistiqueWidget'

const PRAYER_BLOCKS = [
  { label: 'Fajr',    startMin: 5 * 60 + 30,  durationMin: 30 },
  { label: 'Dhuhr',   startMin: 13 * 60 + 15, durationMin: 30 },
  { label: 'Asr',     startMin: 17 * 60,       durationMin: 30 },
  { label: 'Maghrib', startMin: 20 * 60 + 30,  durationMin: 20 },
  { label: 'Isha',    startMin: 21 * 60 + 30,  durationMin: 30 },
]
const START = 5 * 60 + 30   // 5h30
const END   = 22 * 60        // 22h
const SPAN  = END - START

function getNextPrayer(nowMin) {
  const upcoming = PRAYER_BLOCKS.filter(p => p.startMin > nowMin)
  return upcoming[0] || PRAYER_BLOCKS[0]
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

function PrayerWidget({ nowMinutes }) {
  const displayBlocks = PRAYER_BLOCKS
  const nextPrayer = getNextPrayer(nowMinutes)
  const diffMin = nextPrayer ? nextPrayer.startMin - nowMinutes : 0

  return (
    <div
      className="rounded-3xl p-5"
      style={{
        background: 'var(--bg-card)',
        border: '0.5px solid var(--border-soft)',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      <h2 className="font-semibold text-base mb-4" style={{ color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
        Créneaux protégés 🕌
      </h2>

      {/* Timeline */}
      <div
        className="relative rounded-xl overflow-hidden mb-3"
        style={{
          height: 36,
          background: 'var(--bg-card-soft)',
          border: '1px solid var(--border-soft)',
        }}
      >
        {displayBlocks.map(block => {
          const left = Math.max(0, ((block.startMin - START) / SPAN) * 100)
          const width = (block.durationMin / SPAN) * 100
          return (
            <div
              key={block.label}
              className="absolute top-0 bottom-0 flex items-center justify-center"
              style={{
                left: `${left}%`,
                width: `${width}%`,
                background: 'var(--pink-bg)',
                borderLeft: '1px solid var(--pink-solid)',
                borderRight: '1px solid var(--pink-solid)',
              }}
              title={block.label}
            >
              {block.durationMin >= 20 && (
                <span className="text-[8px] font-medium" style={{ color: 'var(--pink-deep)' }}>{block.label}</span>
              )}
            </div>
          )
        })}

        {/* Now marker */}
        {nowMinutes >= START && nowMinutes <= END && (
          <div
            className="absolute top-0 bottom-0 w-0.5 z-10"
            style={{
              left: `${((nowMinutes - START) / SPAN) * 100}%`,
              background: 'var(--pink-deep)',
            }}
          >
            <div
              className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full"
              style={{ background: 'var(--pink-deep)' }}
            />
          </div>
        )}

        {/* Hour labels */}
        {[6, 12, 17, 21].map(h => {
          const leftPct = ((h * 60 - START) / SPAN) * 100
          return leftPct >= 0 && leftPct <= 100 ? (
            <span
              key={h}
              className="absolute bottom-0.5 font-mono text-[8px]"
              style={{ left: `${leftPct}%`, transform: 'translateX(-50%)', color: 'var(--text-tertiary)' }}
            >
              {h}h
            </span>
          ) : null
        })}
      </div>

      {/* Next prayer info */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-mono" style={{ color: 'var(--text-tertiary)' }}>
          {formatHHMM(nowMinutes)} · {nextPrayer?.label} à {nextPrayer ? formatHHMM(nextPrayer.startMin) : '—'}
        </p>
        {nextPrayer && diffMin > 0 && (
          <span
            className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full"
            style={{ background: 'var(--pink-bg)', color: 'var(--pink-deep)' }}
          >
            dans {formatTimeUntil(diffMin)}
          </span>
        )}
      </div>
    </div>
  )
}

export default function RightSidebar({ nowMinutes }) {
  return (
    <aside
      className="hidden lg:flex flex-col gap-4 fixed top-6 bottom-6 right-6"
      style={{ width: 300 }}
    >
      <StatistiqueWidget />
      <PrayerWidget nowMinutes={nowMinutes} />
    </aside>
  )
}

// Exported for inline use on mobile
export { PrayerWidget }
