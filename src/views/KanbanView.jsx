import { useState } from 'react'
import { Plus } from 'lucide-react'
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragOverlay,
} from '@dnd-kit/core'
import {
  SortableContext, useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useStore } from '@/store/useStore'
import { TrelloCard } from './TrelloCardsView'
import TaskDetailModal from './shared/TaskDetailModal'

const COLUMNS = [
  { id: 'todo',       label: 'À faire',  color: '#A8D4F0' },
  { id: 'inprogress', label: 'En cours', color: '#FFD66B' },
  { id: 'done',       label: 'Livré',    color: '#A8E6BD' },
]

// ─── Sortable task card ────────────────────────────────────────────────────────

function SortableTaskCard({ task, project, onOpen, tagStyles }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id })

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.3 : 1 }}
      {...attributes}
      {...listeners}
    >
      <TrelloCard
        task={task}
        project={project}
        onOpen={onOpen}
        tagStyles={tagStyles}
        isDragging={isDragging}
      />
    </div>
  )
}

// ─── Droppable column ──────────────────────────────────────────────────────────

function KanbanColumn({ col, tasks, projects, onOpen, onAddTask, isOver, tagStyles }) {
  const [adding, setAdding] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const taskIds = tasks.map(t => t.id)

  function submitAdd(e) {
    e?.preventDefault()
    if (!newTitle.trim()) { setAdding(false); return }
    onAddTask({ title: newTitle.trim(), status: col.id })
    setNewTitle(''); setAdding(false)
  }

  return (
    <div
      className="flex flex-col flex-1 min-w-0 rounded-xl p-3 transition-colors"
      style={{
        background: isOver ? col.color + '08' : 'rgba(255,255,255,0.02)',
        border: `1px solid ${isOver ? col.color + '30' : 'rgba(255,255,255,0.04)'}`,
        minHeight: 300,
      }}
    >
      {/* Column header */}
      <div className="flex items-center gap-2 mb-3">
        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: col.color }} />
        <span className="text-xs font-semibold text-white/60 uppercase tracking-wider">{col.label}</span>
        <span className="text-[10px] bg-white/6 text-white/30 rounded-full px-1.5 py-0.5">{tasks.length}</span>
        <button
          onClick={() => setAdding(true)}
          className="ml-auto p-1 rounded text-white/20 hover:text-white/60 hover:bg-white/8 transition-all"
        >
          <Plus size={13} />
        </button>
      </div>

      {/* Tasks */}
      <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-2 flex-1">
          {tasks.map(task => (
            <SortableTaskCard
              key={task.id}
              task={task}
              project={projects.find(p => p.id === task.projectId)}
              onOpen={onOpen}
              tagStyles={tagStyles}
            />
          ))}

          {/* Quick add */}
          {adding ? (
            <form onSubmit={submitAdd} className="mt-1">
              <input
                autoFocus
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                onKeyDown={e => { if (e.key === 'Escape') { setAdding(false); setNewTitle('') } }}
                placeholder="Titre de la tâche..."
                className="w-full bg-white/8 border border-white/15 rounded-lg px-3 py-2 text-xs text-white/80 placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-violet/40"
              />
              <div className="flex gap-1.5 mt-1.5">
                <button type="submit" className="flex-1 py-1.5 rounded-lg text-[11px] font-medium text-white" style={{ background: col.color + '30', color: col.color }}>Ajouter</button>
                <button type="button" onClick={() => { setAdding(false); setNewTitle('') }} className="flex-1 py-1.5 rounded-lg bg-white/5 text-white/35 text-[11px]">Annuler</button>
              </div>
            </form>
          ) : (
            <button onClick={() => setAdding(true)} className="flex items-center gap-1.5 text-[11px] text-white/20 hover:text-white/50 py-1.5 px-1 transition-colors mt-auto">
              <Plus size={11} /> Ajouter une tâche
            </button>
          )}
        </div>
      </SortableContext>
    </div>
  )
}

// ─── KanbanView ───────────────────────────────────────────────────────────────

export default function KanbanView({ tasks = [], projects = [], onTaskUpdate, onTaskCreate, onTaskDelete }) {
  const { state } = useStore()
  const tagStyles = state.tagStyles || {}
  const [activeTask, setActiveTask] = useState(null)
  const [detailTask, setDetailTask] = useState(null)
  const [overColumn, setOverColumn] = useState(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  const colTasks = (colId) =>
    tasks
      .filter(t => t.status === colId)
      .sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0))

  function findColumnForTask(taskId) {
    return COLUMNS.find(c => c.tasks?.some?.(t => t.id === taskId))?.id ||
      tasks.find(t => t.id === taskId)?.status
  }

  function onDragStart({ active }) {
    setActiveTask(tasks.find(t => t.id === active.id) || null)
  }

  function onDragOver({ active, over }) {
    if (!over) { setOverColumn(null); return }
    const overId = over.id
    const isCol = COLUMNS.some(c => c.id === overId)
    setOverColumn(isCol ? overId : tasks.find(t => t.id === overId)?.status || null)
  }

  function onDragEnd({ active, over }) {
    setActiveTask(null); setOverColumn(null)
    if (!over) return

    const draggedTask = tasks.find(t => t.id === active.id)
    if (!draggedTask) return

    const overId = over.id
    const overIsCol = COLUMNS.some(c => c.id === overId)
    const overTask = tasks.find(t => t.id === overId)

    const newStatus = overIsCol ? overId : overTask?.status || draggedTask.status

    if (newStatus !== draggedTask.status) {
      onTaskUpdate?.(draggedTask.id, { status: newStatus })
    } else if (overTask && overTask.id !== draggedTask.id) {
      // Reorder within same column
      const colT = colTasks(draggedTask.status)
      const oldIdx = colT.findIndex(t => t.id === draggedTask.id)
      const newIdx = colT.findIndex(t => t.id === overTask.id)
      if (oldIdx !== -1 && newIdx !== -1) {
        const reordered = [...colT]
        reordered.splice(oldIdx, 1)
        reordered.splice(newIdx, 0, draggedTask)
        reordered.forEach((t, i) => onTaskUpdate?.(t.id, { orderIndex: i }))
      }
    }
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {COLUMNS.map(col => (
            <KanbanColumn
              key={col.id}
              col={col}
              tasks={colTasks(col.id)}
              projects={projects}
              onOpen={setDetailTask}
              isOver={overColumn === col.id}
              onAddTask={data => onTaskCreate?.({ ...data, projectId: projects[0]?.id })}
              tagStyles={tagStyles}
            />
          ))}
        </div>

        <DragOverlay>
          {activeTask ? (
            <TrelloCard
              task={activeTask}
              project={projects.find(p => p.id === activeTask.projectId)}
              onOpen={() => {}}
              tagStyles={tagStyles}
              isDragging={true}
            />
          ) : null}
        </DragOverlay>
      </DndContext>

      {detailTask && (
        <TaskDetailModal
          task={detailTask}
          onClose={() => setDetailTask(null)}
          onUpdate={(id, updates) => { onTaskUpdate?.(id, updates); setDetailTask(t => ({ ...t, ...updates })) }}
          onDelete={id => { onTaskDelete?.(id); setDetailTask(null) }}
        />
      )}
    </>
  )
}
