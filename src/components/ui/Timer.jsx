function formatTime(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0')
  const s = (seconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

export default function Timer({ elapsed, isRunning }) {
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative flex items-center justify-center">
        {isRunning && (
          <span className="absolute inset-0 rounded-full animate-pulse_ring" />
        )}
        <span
          className="font-mono text-7xl md:text-8xl font-medium tracking-tight"
          style={{ color: isRunning ? '#6366F1' : '#e2e8f0', letterSpacing: '-2px' }}
        >
          {formatTime(elapsed)}
        </span>
      </div>
      {isRunning && (
        <span className="text-accent text-xs font-medium uppercase tracking-widest animate-pulse">
          En cours
        </span>
      )}
    </div>
  )
}

export { formatTime }
