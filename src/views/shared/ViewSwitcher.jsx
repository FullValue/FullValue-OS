import { Columns3, Calendar, List, GanttChart } from 'lucide-react'
import { Button } from '@/components/ui/button'

const VIEWS = [
  { id: 'kanban',  Icon: Columns3,   label: 'Kanban' },
  { id: 'calendar',Icon: Calendar,   label: 'Calendrier' },
  { id: 'list',    Icon: List,       label: 'Liste' },
  { id: 'gantt',   Icon: GanttChart, label: 'Gantt' },
]

const STORAGE_PREFIX = 'cockpit:view:'

export function getStoredView(contextId) {
  try { return localStorage.getItem(STORAGE_PREFIX + contextId) || 'kanban' } catch { return 'kanban' }
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
