import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

const STATUS_OPTIONS = [
  { value: 'all', label: 'Tous' },
  { value: 'todo', label: 'À faire' },
  { value: 'inprogress', label: 'En cours' },
  { value: 'done', label: 'Livrés' },
]

const URGENCY_OPTIONS = [
  { value: 'urgent',      label: '⚡ Urgent',      activeClass: 'bg-[var(--yellow-bg)] text-[var(--yellow-deep)]' },
  { value: 'very-urgent', label: '🔥 Très urgent', activeClass: 'bg-[var(--orange-bg)] text-[var(--orange-deep)]' },
  { value: 'critical',    label: '🚨 Critique',    activeClass: 'bg-[var(--red-bg)] text-[var(--red-deep)]' },
]

const CHIP_BASE = 'text-[11px] font-medium px-2.5 py-1.5 rounded-lg whitespace-nowrap transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]'
const CHIP_INACTIVE = 'bg-[rgba(var(--ink),0.05)] text-[var(--text-tertiary)] hover:bg-[rgba(var(--ink),0.09)] hover:text-[var(--text-secondary)]'
const CHIP_ACTIVE = 'bg-[var(--active-bg)] text-[var(--active-text)]'

export const DEFAULT_FILTERS = { search: '', status: 'all', urgency: null, hideCompleted: false }

export function applyFilters(tasks, filters) {
  let result = tasks
  if (filters.search) {
    const q = filters.search.toLowerCase()
    result = result.filter(t => t.title.toLowerCase().includes(q) || t.notes?.toLowerCase().includes(q))
  }
  if (filters.status && filters.status !== 'all') result = result.filter(t => t.status === filters.status)
  if (filters.urgency) result = result.filter(t => t.urgency === filters.urgency)
  if (filters.hideCompleted) result = result.filter(t => t.status !== 'done')
  return result
}

export default function ViewFilters({ filters, onChange, compact = false }) {
  return (
    <div className={`flex items-center gap-2 flex-wrap ${compact ? '' : 'mb-3'}`}>
      {/* Search */}
      <div className="relative flex-1 min-w-[160px]">
        <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] pointer-events-none z-10" />
        <Input
          value={filters.search}
          onChange={e => onChange({ ...filters, search: e.target.value })}
          placeholder="Rechercher..."
          className="h-8 pl-8 pr-8 text-xs"
        />
        {filters.search && (
          <button
            onClick={() => onChange({ ...filters, search: '' })}
            aria-label="Effacer la recherche"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
          >
            <X size={12} />
          </button>
        )}
      </div>

      {/* Status filter */}
      {STATUS_OPTIONS.map(opt => (
        <Button
          key={opt.value}
          variant="ghost"
          onClick={() => onChange({ ...filters, status: opt.value })}
          className={`${CHIP_BASE} h-auto ${filters.status === opt.value ? CHIP_ACTIVE : CHIP_INACTIVE}`}
        >
          {opt.label}
        </Button>
      ))}

      {/* Urgency filter */}
      {URGENCY_OPTIONS.map(opt => (
        <Button
          key={opt.value}
          variant="ghost"
          onClick={() => onChange({ ...filters, urgency: filters.urgency === opt.value ? null : opt.value })}
          className={`${CHIP_BASE} h-auto ${filters.urgency === opt.value ? opt.activeClass : CHIP_INACTIVE}`}
        >
          {opt.label}
        </Button>
      ))}
    </div>
  )
}
