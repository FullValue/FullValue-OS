// Impact, status and tag badges used across all views

const STATUS_META = {
  todo:       { label: 'À faire',  color: '#A8D4F0' },
  inprogress: { label: 'En cours', color: '#FFD66B' },
  done:       { label: 'Livré',    color: '#A8E6BD' },
}

export function ImpactBadge({ impact }) {
  if (impact !== 'high') return null
  return (
    <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{ background: '#F59E0B18', color: '#F59E0B' }}>
      ⚡ High
    </span>
  )
}

export function Ship80Badge() {
  return (
    <span className="inline-flex items-center text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{ background: '#FFC1E018', color: '#FFC1E0' }}>
      🚀 80%
    </span>
  )
}

export function StatusBadge({ status }) {
  const meta = STATUS_META[status] || STATUS_META.todo
  return (
    <span className="inline-flex items-center text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{ background: meta.color + '18', color: meta.color }}>
      {meta.label}
    </span>
  )
}

export function TagBadge({ tag }) {
  return (
    <span className="inline-flex items-center text-[10px] px-1.5 py-0.5 rounded-full bg-white/8 text-white/50">
      {tag}
    </span>
  )
}

export function DueDateBadge({ dueDate }) {
  if (!dueDate) return null
  const d = new Date(dueDate)
  const now = new Date()
  const diffDays = Math.ceil((d - now) / 86400000)
  const isOverdue = diffDays < 0
  const isUrgent = diffDays >= 0 && diffDays <= 2
  const isNear = diffDays > 2 && diffDays <= 7

  const color = isOverdue ? '#F87171' : isUrgent ? '#FFB088' : isNear ? '#FFD66B' : 'rgba(255,255,255,0.30)'

  return (
    <span className="font-mono text-[10px]" style={{ color }}>
      {isOverdue ? '⚠ ' : ''}{d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
    </span>
  )
}
