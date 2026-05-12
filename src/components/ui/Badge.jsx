export default function Badge({ color, name, size = 'sm' }) {
  const sizeClass = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-2.5 py-1'
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium ${sizeClass}`}
      style={{ backgroundColor: color + '22', color, border: `1px solid ${color}44` }}
    >
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
      {name}
    </span>
  )
}
