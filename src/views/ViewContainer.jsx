import { useState } from 'react'
import ViewSwitcher, { getStoredView, setStoredView } from './shared/ViewSwitcher'
import ViewFilters, { DEFAULT_FILTERS, applyFilters } from './shared/ViewFilters'
import KanbanView from './KanbanView'
import CalendarView from './CalendarView'
import ListView from './ListView'
import GanttView from './GanttView'

export default function ViewContainer({
  contextId,
  tasks = [],
  projects = [],
  onTaskUpdate,
  onTaskCreate,
  onTaskDelete,
}) {
  const [activeView, setActiveView] = useState(() => getStoredView(contextId))
  const [filters, setFilters] = useState(DEFAULT_FILTERS)

  function handleViewChange(viewId) {
    setActiveView(viewId)
    setStoredView(contextId, viewId)
  }

  const filtered = applyFilters(tasks, filters)

  const sharedProps = {
    tasks: filtered,
    projects,
    onTaskUpdate,
    onTaskCreate,
    onTaskDelete,
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Toolbar: filters + view switcher */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex-1 min-w-0">
          <ViewFilters filters={filters} onChange={setFilters} compact />
        </div>
        <ViewSwitcher activeView={activeView} onChange={handleViewChange} />
      </div>

      {/* Active view */}
      {activeView === 'kanban'   && <KanbanView {...sharedProps} />}
      {activeView === 'calendar' && <CalendarView {...sharedProps} />}
      {activeView === 'list'     && <ListView {...sharedProps} />}
      {activeView === 'gantt'    && <GanttView {...sharedProps} />}
    </div>
  )
}
