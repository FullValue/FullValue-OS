import { useState, useEffect } from 'react'
import { Plus, Check, MessageCircle, Paperclip } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragOverlay,
} from '@dnd-kit/core'
import {
  SortableContext, useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useStore } from '@/store/useStore'
import TaskDetailModal from './shared/TaskDetailModal'
import { TAG_PALETTE, getTagColor, computeProgress, getUrgencyStyle } from './shared/taskColors'

export { TAG_PALETTE, getTagColor, computeProgress, TrelloCard }

// ─── Constants ────────────────────────────────────────────────────────────────

const COLUMNS = [
  { id: 'todo',       label: 'À faire',  color: '#A8D4F0' },
  { id: 'inprogress', label: 'En cours', color: '#FFD66B' },
  { id: 'done',       label: 'Livré',    color: '#A8E6BD' },
]

// Maps cardColor (rgba string from CARD_BG_OPTIONS) to a vivid accent color
const CARD_COLOR_ACCENT = {
  'rgba(139,124,255,0.1)': '#8B7CFF',
  'rgba(168,230,189,0.1)': '#5DAA7C',
  'rgba(255,214,107,0.1)': '#C8930F',
  'rgba(255,176,136,0.1)': '#CC7A45',
  'rgba(255,193,224,0.1)': '#CC6699',
  'rgba(168,212,240,0.1)': '#5A9EC4',
  'rgba(248,113,113,0.1)': '#E05555',
}

function getCardAccent(cardColor) {
  if (!cardColor) return null
  return CARD_COLOR_ACCENT[cardColor] ?? '#8B7CFF'
}

function getProgressColor(pct) {
  if (pct >= 80) return '#5DAA7C'
  if (pct >= 40) return '#C8930F'
  if (pct >= 15) return '#8B7CFF'
  return '#9B9895'
}

// ─── ProgressDots ─────────────────────────────────────────────────────────────

function ProgressDots({ percentage, accentColor, totalDots = 16 }) {
  const filled = Math.round((percentage / 100) * totalDots)
  const color = accentColor || getProgressColor(percentage)

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium" style={{ color: 'var(--text-tertiary)' }}>Progress</span>
        <span className="text-[10px] font-mono font-semibold" style={{ color }}>{percentage}%</span>
      </div>
      <div className="flex gap-0.5">
        {Array.from({ length: totalDots }).map((_, i) => (
          <div key={i} className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ background: i < filled ? color : color + '28' }} />
        ))}
      </div>
    </div>
  )
}

// ─── ChecklistInline ──────────────────────────────────────────────────────────

function ChecklistInline({ items, onToggle }) {
  const visible = items.slice(0, 4)
  const rest = items.length - 4

  return (
    <div className="space-y-1.5">
      {visible.map(item => (
        <button key={item.id} onClick={e => { e.stopPropagation(); onToggle(item.id) }}
          className="flex items-center gap-2 w-full text-left">
          <div className="w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all"
            style={item.done
              ? { background: '#5DAA7C', borderColor: '#5DAA7C' }
              : { background: 'transparent', borderColor: 'var(--text-tertiary)' }
            }>
            {item.done && <Check size={8} strokeWidth={3} color="white" />}
          </div>
          <span className="text-[11px] flex-1 leading-tight truncate"
            style={{
              color: item.done ? 'var(--text-tertiary)' : 'var(--text-secondary)',
              textDecoration: item.done ? 'line-through' : 'none',
            }}>
            {item.label}
          </span>
        </button>
      ))}
      {rest > 0 && (
        <p className="text-[10px] pl-5" style={{ color: 'var(--text-tertiary)' }}>+{rest} de plus</p>
      )}
    </div>
  )
}

// ─── DueDateMini ──────────────────────────────────────────────────────────────

function DueDateMini({ dueDate }) {
  const d = new Date(dueDate)
  const diff = Math.ceil((d - new Date()) / 86400000)
  const color = diff < 0 ? '#F87171' : diff <= 2 ? '#FFB088' : 'var(--text-tertiary)'
  return (
    <span className="font-mono text-[10px]" style={{ color }}>
      {diff < 0 ? '⚠ ' : ''}{d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
    </span>
  )
}

// ─── TrelloTag ────────────────────────────────────────────────────────────────

function TrelloTag({ tag, tagStyles }) {
  const c = getTagColor(tagStyles, tag)
  return (
    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full flex-shrink-0"
      style={{ background: c.bg, color: c.text }}>
      #{tag}
    </span>
  )
}

// ─── CardImage — resolves both URL and Supabase path ─────────────────────────

function CardImage({ task }) {
  const [displayUrl, setDisplayUrl] = useState(task.cardImageUrl || null)

  useEffect(() => {
    if (task.cardImagePath) {
      supabase.storage
        .from('task-attachments')
        .createSignedUrl(task.cardImagePath, 3600)
        .then(({ data }) => { if (data?.signedUrl) setDisplayUrl(data.signedUrl) })
        .catch(() => {})
    } else {
      setDisplayUrl(task.cardImageUrl || null)
    }
  }, [task.cardImagePath, task.cardImageUrl])

  if (!displayUrl) return null

  return (
    <div className="h-28 overflow-hidden">
      <img src={displayUrl} alt=""
        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        onError={() => setDisplayUrl(null)}
      />
    </div>
  )
}

// ─── TrelloCard ───────────────────────────────────────────────────────────────

function TrelloCard({ task, project, onOpen, tagStyles, isDragging }) {
  const { dispatch } = useStore()
  const isDone = task.status === 'done'
  const progress = computeProgress(task)
  const hasProgress = (task.checklist?.length > 0) || (task.progressPercentage != null && task.progressPercentage > 0)
  const hasImage = !!(task.cardImagePath || task.cardImageUrl)
  const urgencyStyle = getUrgencyStyle(task.urgency, project?.color)
  // Card background: ONLY urgency determines card color — default gray otherwise
  const cardBg = urgencyStyle?.cardBg || 'var(--c-card)'
  // Title accent: urgency color when set, else default text
  const accentColor = isDone ? null : urgencyStyle?.text || null

  function toggleChecklistItem(itemId) {
    const updated = (task.checklist || []).map(i =>
      i.id === itemId ? { ...i, done: !i.done } : i
    )
    const doneCnt = updated.filter(i => i.done).length
    const pct = updated.length > 0 ? Math.round((doneCnt / updated.length) * 100) : 0
    const updates = { checklist: updated, progressPercentage: pct }
    if (updated.length > 0 && doneCnt === updated.length) {
      updates.status = 'done'
      updates.completedAt = new Date().toISOString()
    } else if (task.status === 'todo' && doneCnt > 0) {
      updates.status = 'inprogress'
    }
    dispatch({ type: 'UPDATE_TASK', payload: { id: task.id, ...updates } })
  }

  return (
    <div
      onClick={() => !isDragging && onOpen(task)}
      className="rounded-2xl overflow-hidden cursor-pointer group transition-all hover:-translate-y-0.5"
      style={{
        background: cardBg,
        border: '1px solid var(--c-border)',
        opacity: isDone ? 0.65 : 1,
        boxShadow: isDragging
          ? '0 20px 40px rgba(0,0,0,0.3), 0 0 0 2px rgba(139,124,255,0.4)'
          : '0 2px 10px rgba(0,0,0,0.07)',
        transform: isDragging ? 'rotate(2deg) scale(1.03)' : 'none',
      }}
    >
      {/* Cover image (supports both URL and Supabase path) */}
      {hasImage && <CardImage task={task} />}

      <div className="p-3.5">
        {/* Urgency pill */}
        {urgencyStyle && (
          <div className="mb-2">
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
              style={{ background: urgencyStyle.bg, color: urgencyStyle.text }}>
              {urgencyStyle.label}
            </span>
          </div>
        )}

        {/* Tags */}
        {(task.tags || []).length > 0 && (
          <div className="flex items-center gap-1 flex-wrap mb-2.5">
            {(task.tags || []).slice(0, 4).map(tag => (
              <TrelloTag key={tag} tag={tag} tagStyles={tagStyles} />
            ))}
          </div>
        )}

        {/* Title */}
        <p className="font-semibold leading-snug mb-2"
          style={{
            fontSize: 14,
            color: isDone ? 'var(--text-tertiary)' : (accentColor || 'var(--text-primary)'),
            textDecoration: isDone ? 'line-through' : 'none',
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}>
          {task.title}
        </p>

        {/* Inline note — styled with "Note:" prefix */}
        {task.inlineNote && (
          <p className="text-[11px] mb-2.5 leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
            <span className="font-semibold" style={{ opacity: 0.7 }}>Note:</span>{' '}
            <span className="italic">{task.inlineNote}</span>
          </p>
        )}

        {/* Checklist — inline and togglable, stopPropagation prevents opening modal */}
        {task.checklist && task.checklist.length > 0 && (
          <div className="mb-3" onClick={e => e.stopPropagation()}>
            <ChecklistInline items={task.checklist} onToggle={toggleChecklistItem} />
          </div>
        )}

        {/* Progress dots — uses card accent color when available */}
        {hasProgress && (
          <div className="mb-3">
            <ProgressDots percentage={progress} accentColor={accentColor} />
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between mt-1.5 gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {project && (
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: project.color }} />
            )}
            {task.dueDate && <DueDateMini dueDate={task.dueDate} />}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0" style={{ color: 'var(--text-tertiary)' }}>
            {(task.commentsCount ?? 0) > 0 && (
              <span className="flex items-center gap-0.5 text-[10px]">
                <MessageCircle size={11} strokeWidth={1.5} />{task.commentsCount}
              </span>
            )}
            {(task.attachmentsCount ?? 0) > 0 && (
              <span className="flex items-center gap-0.5 text-[10px]">
                <Paperclip size={11} strokeWidth={1.5} />{task.attachmentsCount}
              </span>
            )}
            {task.ship80 && !task.ship80Delivered && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full"
                style={{ background: 'rgba(255,193,224,0.18)', color: '#CC6699' }}>80%</span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── SortableTrelloCard ───────────────────────────────────────────────────────

function SortableTrelloCard({ task, project, onOpen, tagStyles }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id })

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0 : 1 }}
      {...attributes}
      {...listeners}
    >
      <TrelloCard task={task} project={project} onOpen={onOpen} tagStyles={tagStyles} isDragging={false} />
    </div>
  )
}

// ─── TrelloColumn ─────────────────────────────────────────────────────────────

function TrelloColumn({ col, tasks, projects, onOpen, onAddTask, isOver, tagStyles }) {
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
    <div className="flex flex-col">
      {/* Column header */}
      <div className="flex items-center gap-2 mb-3 px-0.5">
        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: col.color }} />
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
          {col.label}
        </span>
        <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: 'var(--c-card)', color: 'var(--text-tertiary)' }}>
          {tasks.length}
        </span>
        <button onClick={() => setAdding(true)}
          className="ml-auto p-1 rounded transition-colors"
          style={{ color: 'var(--text-tertiary)' }}>
          <Plus size={13} />
        </button>
      </div>

      {/* Drop zone */}
      <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-3 flex-1 rounded-xl p-2 transition-all min-h-[160px]"
          style={{
            background: isOver ? col.color + '0A' : 'transparent',
            border: `1px dashed ${isOver ? col.color + '50' : 'transparent'}`,
          }}>
          {tasks.map(task => (
            <SortableTrelloCard
              key={task.id}
              task={task}
              project={projects.find(p => p.id === task.projectId)}
              onOpen={onOpen}
              tagStyles={tagStyles}
            />
          ))}

          {/* Quick add */}
          {adding ? (
            <form onSubmit={submitAdd} className="rounded-2xl p-3"
              style={{ background: 'var(--c-card)', border: '1px solid var(--c-border)' }}>
              <input
                autoFocus
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                onKeyDown={e => { if (e.key === 'Escape') { setAdding(false); setNewTitle('') } }}
                placeholder="Titre de la tâche..."
                className="w-full rounded-xl px-3 py-2 text-xs placeholder-white/25 focus:outline-none mb-2"
                style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: 'var(--text-secondary)' }}
              />
              <div className="flex gap-1.5">
                <button type="submit" className="flex-1 py-1.5 rounded-xl text-[11px] font-medium"
                  style={{ background: col.color + '28', color: col.color }}>
                  Ajouter
                </button>
                <button type="button" onClick={() => { setAdding(false); setNewTitle('') }}
                  className="flex-1 py-1.5 rounded-xl text-[11px]"
                  style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-tertiary)' }}>
                  Annuler
                </button>
              </div>
            </form>
          ) : (
            <button onClick={() => setAdding(true)}
              className="flex items-center gap-1.5 text-[11px] py-2 px-1 transition-colors"
              style={{ color: 'var(--text-tertiary)' }}>
              <Plus size={11} /> Ajouter une carte
            </button>
          )}
        </div>
      </SortableContext>
    </div>
  )
}

// ─── TrelloCardsView ─────────────────────────────────────────────────────────

export default function TrelloCardsView({ tasks = [], projects = [], onTaskUpdate, onTaskCreate, onTaskDelete }) {
  const { state } = useStore()
  const [activeTask, setActiveTask] = useState(null)
  const [detailTask, setDetailTask] = useState(null)
  const [overColumn, setOverColumn] = useState(null)

  const tagStyles = state.tagStyles || {}

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  const colTasks = (colId) =>
    tasks
      .filter(t => t.status === colId)
      .sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0))

  function onDragStart({ active }) {
    setActiveTask(tasks.find(t => t.id === active.id) || null)
  }

  function onDragOver({ active, over }) {
    if (!over) { setOverColumn(null); return }
    const isCol = COLUMNS.some(c => c.id === over.id)
    setOverColumn(isCol ? over.id : tasks.find(t => t.id === over.id)?.status || null)
  }

  function onDragEnd({ active, over }) {
    setActiveTask(null); setOverColumn(null)
    if (!over) return

    const dragged = tasks.find(t => t.id === active.id)
    if (!dragged) return

    const overIsCol = COLUMNS.some(c => c.id === over.id)
    const overTask = tasks.find(t => t.id === over.id)
    const newStatus = overIsCol ? over.id : (overTask?.status || dragged.status)

    if (newStatus !== dragged.status) {
      onTaskUpdate?.(dragged.id, { status: newStatus })
    } else if (overTask && overTask.id !== dragged.id) {
      const colT = colTasks(dragged.status)
      const oldIdx = colT.findIndex(t => t.id === dragged.id)
      const newIdx = colT.findIndex(t => t.id === overTask.id)
      if (oldIdx !== -1 && newIdx !== -1) {
        const reordered = [...colT]
        reordered.splice(oldIdx, 1)
        reordered.splice(newIdx, 0, dragged)
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {COLUMNS.map(col => (
            <TrelloColumn
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

        <DragOverlay dropAnimation={{ duration: 150 }}>
          {activeTask ? (
            <TrelloCard
              task={activeTask}
              project={projects.find(p => p.id === activeTask.projectId)}
              onOpen={() => {}}
              tagStyles={tagStyles}
              isDragging
            />
          ) : null}
        </DragOverlay>
      </DndContext>

      {detailTask && (
        <TaskDetailModal
          task={detailTask}
          onClose={() => setDetailTask(null)}
          onUpdate={(id, updates) => {
            onTaskUpdate?.(id, updates)
            setDetailTask(t => ({ ...t, ...updates }))
          }}
          onDelete={id => { onTaskDelete?.(id); setDetailTask(null) }}
        />
      )}
    </>
  )
}
