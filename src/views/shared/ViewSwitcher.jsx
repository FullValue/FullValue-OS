import { LayoutGrid, Calendar, List, GanttChart } from 'lucide-react'
import { Button } from '@/components/ui/button'

const VIEWS = [
  { id: 'board',   Icon: LayoutGrid, label: 'Board' },
  { id: 'calendar',Icon: Calendar,   label: 'Calendrier' },
  { id: 'list',    Icon: List,       label: 'Liste' },
  { id: 'gantt',   Icon: GanttChart, label: 'Gantt' },
]

const STORAGE_PREFIX = 'cockpit:view:'

export function getStoredView(contextId) {
  try {
    const v = localStorage.getItem(STORAGE_PREFIX + contextId)
    // L'ancienne vue Kanban a été remplacée par le Board.
    return !v || v === 'kanban' ? 'board' : v
  } catch { return 'board' }
}

export function setStoredView(contextId, viewId) {
  try { localStorage.setItem(STORAGE_PREFIX + contextId, viewId) } catch {}
}

export default function ViewSwitcher({ activeView, onChange }) {
  return (
    <div className="inline-flex items-center gap-0.5 rounded-xl bg-[rgba(var(--ink),0.05)] p-1">
      {VIEWS.map(({ id, Icon, label }) => {
        const isActive = activeView === id
        return (
          <Button
            key={id}
            variant="ghost"
            size="icon-sm"
            onClick={() => onChange(id)}
            title={label}
            aria-label={label}
            className={
              isActive
                ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm hover:bg-[var(--bg-card)]'
                : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
            }
          >
            <Icon size={14} />
          </Button>
        )
      })}
    </div>
  )
}
