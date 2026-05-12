import { useState, useMemo } from 'react'
import { ChevronUp, ChevronDown, Trash2, CheckSquare, Square } from 'lucide-react'
import { ImpactBadge, StatusBadge, DueDateBadge, TagBadge } from './shared/TaskBadge'
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
    selected.forEach(id => onTaskDelete?.(id))
    setSelected(new Set())
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
        <button
          onClick={() => setCompact(c => !c)}
          className="text-[11px] px-2.5 py-1 rounded-lg transition-colors"
          style={compact ? { background: 'rgba(139,124,255,0.18)', color: '#8B7CFF' } : { background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.35)' }}
        >
          Compact
        </button>

        {selected.size > 0 && (
          <div className="flex items-center gap-2 ml-auto px-3 py-1 rounded-lg" style={{ background: 'rgba(139,124,255,0.12)', border: '1px solid rgba(139,124,255,0.25)' }}>
            <span className="text-[11px] text-white/60">{selected.size} sélectionnée{selected.size > 1 ? 's' : ''}</span>
            <button onClick={() => bulkStatus('done')} className="text-[11px] text-green/70 hover:text-green transition-colors">Livré</button>
            <button onClick={() => bulkStatus('inprogress')} className="text-[11px] text-yellow/70 hover:text-yellow transition-colors">En cours</button>
            <button onClick={bulkDelete} className="text-[11px] text-red/70 hover:text-red transition-colors flex items-center gap-1"><Trash2 size={11} /> Supprimer</button>
            <button onClick={() => setSelected(new Set())} className="text-[11px] text-white/30 hover:text-white/60 transition-colors">✕</button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--c-border)' }}>
        {/* Header */}
        <div
          className="grid text-[10px] uppercase tracking-wider text-white/30 font-semibold px-3"
          style={{
            gridTemplateColumns: colTemplate,
            background: 'rgba(255,255,255,0.03)',
            borderBottom: '1px solid var(--c-border)',
            paddingTop: 8,
            paddingBottom: 8,
          }}
        >
          <button onClick={toggleAll} className="flex items-center justify-center text-white/25 hover:text-white/60 transition-colors">
            {allSelected ? <CheckSquare size={13} /> : <Square size={13} />}
          </button>
          {COLUMNS.map(col => (
            <button
              key={col.key}
              onClick={() => toggleSort(col.key)}
              className="flex items-center gap-1 hover:text-white/60 transition-colors text-left"
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
          <div className="py-12 text-center text-xs text-white/25">Aucune tâche</div>
        ) : (
          sorted.map((task, i) => {
            const project = projects.find(p => p.id === task.projectId)
            const isSelected = selected.has(task.id)
            return (
              <div
                key={task.id}
                className={`grid items-center px-3 cursor-pointer transition-colors group ${rowPy}`}
                style={{
                  gridTemplateColumns: colTemplate,
                  background: isSelected ? 'rgba(139,124,255,0.06)' : i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
                  borderBottom: i < sorted.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                }}
                onClick={() => setDetailTask(task)}
              >
                {/* Checkbox */}
                <button
                  onClick={e => { e.stopPropagation(); toggleSelect(task.id) }}
                  className="flex items-center justify-center text-white/20 hover:text-white/60 transition-colors"
                >
                  {isSelected ? <CheckSquare size={13} className="text-violet" /> : <Square size={13} />}
                </button>

                {/* Status */}
                <div><StatusBadge status={task.status} /></div>

                {/* Title */}
                <div className={`text-xs font-medium truncate pr-2 ${task.status === 'done' ? 'line-through text-white/30' : 'text-white/80'}`}>
                  {task.title}
                </div>

                {/* Project */}
                <div>
                  {project ? (
                    <span className="flex items-center gap-1.5 text-[11px] text-white/50 truncate">
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
                <div><DueDateBadge dueDate={task.dueDate} /></div>
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
