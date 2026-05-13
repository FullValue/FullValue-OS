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

function PrayerWidget({ nowMinutes }) {
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
      <h2 className="font-semibold text-sm mb-3" style={{ color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
        Horaires de prière
      </h2>

      <div className="flex flex-col gap-0.5">
        {PRAYER_BLOCKS.map(block => {
          const isNext = nextPrayer?.label === block.label
          const isPast = nowMinutes > block.startMin + block.durationMin

          return (
            <div
              key={block.label}
              className="flex items-center justify-between px-3 py-2 rounded-xl transition-colors"
              style={{
                background: isNext ? 'var(--pink-bg)' : 'transparent',
                border: `1px solid ${isNext ? 'var(--pink-solid)' : 'transparent'}`,
              }}
            >
              <div className="flex items-center gap-2.5">
                <span
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ background: isNext ? 'var(--pink-deep)' : isPast ? 'var(--border-medium)' : 'var(--border-strong)' }}
                />
                <span
                  className="text-sm font-medium"
                  style={{ color: isNext ? 'var(--pink-deep)' : isPast ? 'var(--text-tertiary)' : 'var(--text-secondary)' }}
                >
                  {block.label}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {isNext && diffMin > 0 && (
                  <span
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                    style={{ background: 'var(--pink-deep)', color: '#fff' }}
                  >
                    {formatTimeUntil(diffMin)}
                  </span>
                )}
                <span
                  className="font-mono text-sm tabular-nums"
                  style={{ color: isNext ? 'var(--pink-deep)' : isPast ? 'var(--text-tertiary)' : 'var(--text-secondary)' }}
                >
                  {formatHHMM(block.startMin)}
                </span>
              </div>
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
      className="hidden lg:block fixed top-14 bottom-6 right-6 overflow-y-auto"
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
