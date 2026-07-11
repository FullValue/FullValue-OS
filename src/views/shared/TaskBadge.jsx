// Impact, status and tag badges used across all views

const STATUS_META = {
  todo:       { label: 'À faire',  color: 'var(--blue-deep)',  bg: 'var(--blue-bg)' },
  inprogress: { label: 'En cours', color: 'var(--yellow-deep)', bg: 'var(--yellow-bg)' },
  done:       { label: 'Livré',    color: 'var(--green-deep)',  bg: 'var(--green-bg)' },
}

export function ImpactBadge({ impact }) {
  if (impact !== 'high') return null
  return (
    <span className="inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-medium" style={{ background: 'var(--orange-bg)', color: 'var(--orange-deep)' }}>
      ⚡ Fort
    </span>
  )
}

export function Ship80Badge() {
  return (
    <span className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium" style={{ background: 'var(--pink-bg)', color: 'var(--pink-deep)' }}>
      🚀 80%
    </span>
  )
}

export function StatusBadge({ status }) {
  const meta = STATUS_META[status] || STATUS_META.todo
  return (
    <span className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium" style={{ background: meta.bg, color: meta.color }}>
      {meta.label}
    </span>
  )
}

export function TagBadge({ tag }) {
  return (
    <span className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px]" style={{ background: 'rgba(var(--ink),0.06)', color: 'var(--text-tertiary)' }}>
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

  const color = isOverdue ? 'var(--red-deep)' : isUrgent ? 'var(--orange-deep)' : isNear ? 'var(--yellow-deep)' : 'var(--text-tertiary)'

  return (
    <span className="font-mono text-[10px] tabular" style={{ color }}>
      {isOverdue ? '⚠ ' : ''}{d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
    </span>
  )
}
