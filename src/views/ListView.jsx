import { useState, useMemo } from 'react'
import { ChevronUp, ChevronDown, Trash2, X, ClipboardList } from 'lucide-react'
import { ImpactBadge, StatusBadge, DueDateBadge, TagBadge } from './shared/TaskBadge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { EmptyState } from '@/components/ui/empty-state'
import { useStore } from '@/store/useStore'
import { toastUndo } from '@/lib/toast'
import TaskDetailModal from './shared/TaskDetailModal'

const COLUMNS = [
  { key: 'status',    label: 'Statut',   width: '100px' },
  { key: 'title',     label: 'Tâche',    width: '1fr' },
  { key: 'project',   label: 'Projet',   width: '110px' },
  { key: 'impact',    label: 'Impact',   width: '80px' },
  { key: 'tags',      label: 'Tags',     width: '120px' },
  { key: 'dueDate',   label: 'Échéance', width: '100px' },
]

function sortTasks(tasks, sortKey, sortDir, projects) {
  return [...tasks].sort((a, b) => {
    let va, vb
    if (sortKey === 'project') {
      va = projects.find(p => p.id === a.projectId)?.name || ''
      vb = projects.find(p => p.id === b.projectId)?.name || ''
    } else if (sortKey === 'impact') {
      va = a.impact === 'high' ? 0 : 1
      vb = b.impact === 'high' ? 0 : 1
    } else if (sortKey === 'dueDate') {
      va = a.dueDate ? new Date(a.dueDate).getTime() : Infinity
      vb = b.dueDate ? new Date(b.dueDate).getTime() : Infinity
    } else if (sortKey === 'status') {
      const order = { todo: 0, inprogress: 1, done: 2 }
      va = order[a.status] ?? 0
      vb = order[b.status] ?? 0
    } else {
      va = (a[sortKey] || '').toString().toLowerCase()
      vb = (b[sortKey] || '').toString().toLowerCase()
    }
    if (va < vb) return sortDir === 'asc' ? -1 : 1
    if (va > vb) return sortDir === 'asc' ? 1 : -1
    return 0
  })
}

export default function ListView({ tasks = [], projects = [], onTaskUpdate, onTaskDelete }) {
  const { dispatch } = useStore()
  const [sortKey, setSortKey] = useState('status')
  const [sortDir, setSortDir] = useState('asc')
  const [compact, setCompact] = useState(false)
  const [selected, setSelected] = useState(new Set())
  const [detailTask, setDetailTask] = useState(null)

  const sorted = useMemo(() => sortTasks(tasks, sortKey, sortDir, projects), [tasks, sortKey, sortDir, projects])

  function toggleSort(key) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  function toggleSelect(id) {
    setSelected(s => {
      const n = new Set(s)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  }

  function toggleAll() {
    setSelected(s => s.size === sorted.length ? new Set() : new Set(sorted.map(t => t.id)))
  }

  function bulkDelete() {
    const snaps = [...selected].map(id => tasks.find(t => t.id === id)).filter(Boolean)
    selected.forEach(id => onTaskDelete?.(id))
    setSelected(new Set())
    if (snaps.length) {
      const plural = snaps.length > 1 ? 's' : ''
      toastUndo(`${snaps.length} tâche${plural} supprimée${plural}`, () =>
        dispatch({ type: 'RESTORE_ITEMS', payload: { tasks: snaps } })
      )
    }
  }

  function bulkStatus(status) {
    selected.forEach(id => onTaskUpdate?.(id, { status }))
    setSelected(new Set())
  }

  const allSelected = sorted.length > 0 && selected.size === sorted.length

  const colTemplate = `28px ${COLUMNS.map(c => c.width).join(' ')}`

  const rowPy = compact ? 'py-1.5' : 'py-2.5'

  return (
    <>
      {/* Density toggle + bulk bar */}
      <div className="flex items-center gap-2 mb-2">
        <Button
          variant={compact ? 'secondary' : 'subtle'}
          size="xs"
          onClick={() => setCompact(c => !c)}
        >
          Compact
        </Button>

        {selected.size > 0 && (
          <div className="flex items-center gap-1 ml-auto pl-3 pr-1 py-1 rounded-xl bg-[var(--violet-bg)] border border-[var(--border-soft)]">
            <span className="tabular text-[11px] font-medium text-[var(--text-secondary)]">{selected.size} sélectionnée{selected.size > 1 ? 's' : ''}</span>
            <Button variant="ghost" size="xs" onClick={() => bulkStatus('done')} className="text-[var(--green-deep)] hover:text-[var(--green-deep)]">Livré</Button>
            <Button variant="ghost" size="xs" onClick={() => bulkStatus('inprogress')} className="text-[var(--yellow-deep)] hover:text-[var(--yellow-deep)]">En cours</Button>
            <Button variant="ghost" size="xs" onClick={bulkDelete} className="text-[var(--red-deep)] hover:text-[var(--red-deep)]"><Trash2 size={11} /> Supprimer</Button>
            <Button variant="ghost" size="icon-sm" onClick={() => setSelected(new Set())} aria-label="Effacer la sélection" className="h-6 w-6"><X size={12} /></Button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="rounded-2xl overflow-hidden bg-[var(--bg-card)] border border-[var(--border-soft)] shadow-[var(--shadow-card)]">
        {/* Header */}
        <div
          className="grid items-center text-[10px] uppercase tracking-[0.08em] text-[var(--text-tertiary)] font-semibold px-3 py-2 bg-[rgba(var(--ink),0.03)] border-b border-[var(--border-soft)]"
          style={{ gridTemplateColumns: colTemplate }}
        >
          <div className="flex items-center justify-center">
            <Checkbox
              checked={allSelected ? true : selected.size > 0 ? 'indeterminate' : false}
              onCheckedChange={toggleAll}
              aria-label="Tout sélectionner"
            />
          </div>
          {COLUMNS.map(col => (
            <button
              key={col.key}
              onClick={() => toggleSort(col.key)}
              className="flex items-center gap-1 hover:text-[var(--text-secondary)] transition-colors text-left"
            >
              {col.label}
              {sortKey === col.key ? (
                sortDir === 'asc' ? <ChevronUp size={10} /> : <ChevronDown size={10} />
              ) : null}
            </button>
          ))}
        </div>

        {/* Rows */}
        {sorted.length === 0 ? (
          <EmptyState
            compact
            icon={ClipboardList}
            title="Aucune tâche"
            description="Les tâches de ce contexte apparaîtront ici."
          />
        ) : (
          sorted.map((task, i) => {
            const project = projects.find(p => p.id === task.projectId)
            const isSelected = selected.has(task.id)
            return (
              <div
                key={task.id}
                className={`grid items-center px-3 cursor-pointer transition-colors group ${rowPy} ${isSelected ? 'bg-[var(--violet-bg)]' : 'hover:bg-[rgba(var(--ink),0.03)]'}`}
                style={{
                  gridTemplateColumns: colTemplate,
                  borderBottom: i < sorted.length - 1 ? '1px solid var(--border-soft)' : 'none',
                }}
                onClick={() => setDetailTask(task)}
              >
                {/* Checkbox */}
                <span className="flex items-center justify-center" onClick={e => e.stopPropagation()}>
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => toggleSelect(task.id)}
                    aria-label="Sélectionner la tâche"
                  />
                </span>

                {/* Status */}
                <div><StatusBadge status={task.status} /></div>

                {/* Title */}
                <div className={`text-xs font-medium truncate pr-2 ${task.status === 'done' ? 'line-through text-[var(--text-tertiary)]' : 'text-[var(--text-primary)]'}`}>
                  {task.title}
                </div>

                {/* Project */}
                <div>
                  {project ? (
                    <span className="flex items-center gap-1.5 text-[11px] text-[var(--text-secondary)] truncate">
                      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: project.color }} />
                      <span className="truncate">{project.name}</span>
                    </span>
                  ) : null}
                </div>

                {/* Impact */}
                <div><ImpactBadge impact={task.impact} /></div>

                {/* Tags */}
                <div className="flex gap-1 flex-wrap">
                  {(task.tags || []).slice(0, 2).map(tag => <TagBadge key={tag} tag={tag} />)}
                </div>

                {/* Due date */}
                <div className="tabular"><DueDateBadge dueDate={task.dueDate} /></div>
              </div>
            )
          })
        )}
      </div>

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
