import { useState } from 'react'
import { Search, X } from 'lucide-react'

const STATUS_OPTIONS = [
  { value: 'all', label: 'Tous' },
  { value: 'todo', label: 'À faire' },
  { value: 'inprogress', label: 'En cours' },
  { value: 'done', label: 'Livrés' },
]

export const DEFAULT_FILTERS = { search: '', status: 'all', impact: 'all', hideCompleted: false }

export function applyFilters(tasks, filters) {
  let result = tasks
  if (filters.search) {
    const q = filters.search.toLowerCase()
    result = result.filter(t => t.title.toLowerCase().includes(q) || t.notes?.toLowerCase().includes(q))
  }
  if (filters.status && filters.status !== 'all') result = result.filter(t => t.status === filters.status)
  if (filters.impact && filters.impact !== 'all') result = result.filter(t => t.impact === filters.impact)
  if (filters.hideCompleted) result = result.filter(t => t.status !== 'done')
  return result
}

export default function ViewFilters({ filters, onChange, compact = false }) {
  return (
    <div className={`flex items-center gap-2 flex-wrap ${compact ? '' : 'mb-3'}`}>
      {/* Search */}
      <div className="relative flex-1 min-w-[160px]">
        <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/25" />
        <input
          value={filters.search}
          onChange={e => onChange({ ...filters, search: e.target.value })}
          placeholder="Rechercher..."
          className="w-full bg-white/5 rounded-lg pl-7 pr-8 py-1.5 text-xs text-white/80 placeholder-white/25 focus:outline-none focus:ring-1 focus:ring-violet/40"
        />
        {filters.search && (
          <button onClick={() => onChange({ ...filters, search: '' })} className="absolute right-2 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/60">
            <X size={11} />
          </button>
        )}
      </div>

      {/* Status filter */}
      {STATUS_OPTIONS.map(opt => (
        <button
          key={opt.value}
          onClick={() => onChange({ ...filters, status: opt.value })}
          className="text-[11px] px-2.5 py-1.5 rounded-lg transition-colors whitespace-nowrap"
          style={filters.status === opt.value ? { background: 'rgba(139,124,255,0.18)', color: '#8B7CFF' } : { color: 'rgba(255,255,255,0.35)', background: 'rgba(255,255,255,0.04)' }}
        >
          {opt.label}
        </button>
      ))}

      {/* Impact filter */}
      <button
        onClick={() => onChange({ ...filters, impact: filters.impact === 'high' ? 'all' : 'high' })}
        className="text-[11px] px-2.5 py-1.5 rounded-lg transition-colors"
        style={filters.impact === 'high' ? { background: '#F59E0B18', color: '#F59E0B' } : { color: 'rgba(255,255,255,0.35)', background: 'rgba(255,255,255,0.04)' }}
      >
        ⚡ High only
      </button>
    </div>
  )
}
