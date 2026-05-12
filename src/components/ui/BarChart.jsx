function formatDuration(seconds) {
  if (seconds === 0) return '0'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h${m > 0 ? m + 'm' : ''}`
  return `${m}m`
}

export default function BarChart({ data }) {
  const maxVal = Math.max(...data.map(d => d.seconds), 1)

  return (
    <div className="flex items-end gap-1.5 h-20 w-full">
      {data.map((d, i) => {
        const heightPct = (d.seconds / maxVal) * 100
        const label = new Date(d.date).toLocaleDateString('fr-FR', { weekday: 'short' }).slice(0, 2)
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
            <div className="w-full flex items-end h-14 relative">
              <div
                className="w-full rounded-t transition-all duration-300 relative"
                style={{
                  height: `${Math.max(heightPct, d.seconds > 0 ? 4 : 0)}%`,
                  backgroundColor: d.color || '#6366F1',
                  opacity: d.seconds > 0 ? 0.8 : 0.15,
                  minHeight: d.seconds > 0 ? '4px' : '2px',
                  maxHeight: '56px',
                }}
                title={formatDuration(d.seconds)}
              />
            </div>
            <span className="text-white/30 text-[10px] font-mono uppercase">{label}</span>
          </div>
        )
      })}
    </div>
  )
}
