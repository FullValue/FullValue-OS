import { Columns3, LayoutGrid, Calendar, List, GanttChart } from 'lucide-react'

const VIEWS = [
  { id: 'kanban',  Icon: Columns3,     label: 'Kanban' },
  { id: 'trello',  Icon: LayoutGrid,   label: 'Cartes' },
  { id: 'calendar',Icon: Calendar,     label: 'Calendrier' },
  { id: 'list',    Icon: List,         label: 'Liste' },
  { id: 'gantt',   Icon: GanttChart,   label: 'Gantt' },
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
    <div className="flex items-center gap-0.5 p-0.5 rounded-lg" style={{ background: 'rgba(0,0,0,0.20)' }}>
      {VIEWS.map(({ id, Icon, label }) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          title={label}
          className="p-1.5 rounded-md transition-all"
          style={
            activeView === id
              ? { background: 'var(--c-card)', color: 'rgba(255,255,255,0.85)', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }
              : { color: 'rgba(255,255,255,0.30)' }
          }
        >
          <Icon size={14} />
        </button>
      ))}
    </div>
  )
}
