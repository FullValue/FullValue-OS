import { useState } from 'react'
import { Plus, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react'
import { useStore } from '@/store/useStore'

const COLUMNS = [
  { id: 'todo', label: 'À faire' },
  { id: 'inprogress', label: 'En cours' },
  { id: 'done', label: 'Livré' },
]

function AddTaskForm({ projectId, status, onDone }) {
  const { dispatch } = useStore()
  const [title, setTitle] = useState('')

  function submit(e) {
    e.preventDefault()
    if (!title.trim()) return
    dispatch({ type: 'ADD_TASK', payload: { title: title.trim(), projectId, status, impact: 'low', ship80: false, today: false, dueDate: null, notes: '' } })
    setTitle('')
    onDone()
  }

  return (
    <form onSubmit={submit} className="mt-2">
      <input
        autoFocus
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder="Titre de la tâche..."
        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-accent/50"
      />
      <div className="flex gap-2 mt-2">
        <button type="submit" className="flex-1 bg-accent/20 hover:bg-accent/30 text-accent text-xs py-1.5 rounded-lg transition-colors">Ajouter</button>
        <button type="button" onClick={onDone} className="flex-1 bg-white/5 hover:bg-white/10 text-white/50 text-xs py-1.5 rounded-lg transition-colors">Annuler</button>
      </div>
    </form>
  )
}

export default function KanbanBoard({ projectId, tasks }) {
  const { dispatch } = useStore()
  const [adding, setAdding] = useState(null)

  function move(task, dir) {
    const order = ['todo', 'inprogress', 'done']
    const idx = order.indexOf(task.status)
    const next = order[idx + dir]
    if (!next) return
    dispatch({ type: 'UPDATE_TASK', payload: { id: task.id, status: next } })
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {COLUMNS.map(col => {
        const colTasks = tasks.filter(t => t.status === col.id)
        return (
          <div key={col.id} className="bg-white/3 border border-white/5 rounded-xl p-4 min-h-[200px] flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-white/50 uppercase tracking-wider">{col.label}</span>
              <span className="text-xs bg-white/5 text-white/30 rounded-full px-2 py-0.5">{colTasks.length}</span>
            </div>

            <div className="flex-1 flex flex-col gap-2">
              {colTasks.map(task => (
                <div key={task.id} className="bg-surface border border-white/5 rounded-lg p-3 group hover:border-white/10 transition-colors">
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white/80 leading-snug break-words">{task.title}</p>
                      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                        {task.impact === 'high' && <span className="text-[10px] text-amber">⚡ High</span>}
                        {task.ship80 && !task.ship80Delivered && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{ background: '#FFC1E020', color: '#FFC1E0' }}>🚀 80%</span>
                        )}
                        {task.ship80Delivered && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium text-white/30 bg-white/5">✓ livré 80%</span>
                        )}
                      </div>
                    </div>
                    <button onClick={() => dispatch({ type: 'DELETE_TASK', payload: task.id })} className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 text-white/30 transition-all flex-shrink-0">
                      <Trash2 size={12} />
                    </button>
                  </div>
                  <div className="flex items-center gap-1 mt-2 pt-2 border-t border-white/5">
                    <button
                      onClick={() => move(task, -1)}
                      disabled={task.status === 'todo'}
                      className="p-1 rounded hover:bg-white/5 text-white/30 disabled:opacity-20 transition-colors"
                    >
                      <ChevronLeft size={12} />
                    </button>
                    <button
                      onClick={() => move(task, 1)}
                      disabled={task.status === 'done'}
                      className="p-1 rounded hover:bg-white/5 text-white/30 disabled:opacity-20 transition-colors"
                    >
                      <ChevronRight size={12} />
                    </button>
                    {task.ship80 && task.status !== 'done' && !task.ship80Delivered ? (
                      <button
                        onClick={() => dispatch({ type: 'SHIP80_DELIVER', payload: task.id })}
                        className="ml-auto text-[10px] px-2 py-0.5 rounded-full transition-colors font-medium"
                        style={{ background: '#FFC1E018', color: '#FFC1E0', border: '1px solid #FFC1E030' }}
                      >
                        Livrer (80%)
                      </button>
                    ) : (
                      <button
                        onClick={() => dispatch({ type: 'TOGGLE_TASK_DONE', payload: task.id })}
                        className={`ml-auto text-[10px] px-2 py-0.5 rounded-full transition-colors ${task.status === 'done' ? 'bg-emerald/20 text-emerald' : 'bg-white/5 text-white/30 hover:bg-white/10'}`}
                      >
                        {task.status === 'done' ? '✓ Done' : 'Marquer done'}
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {adding === col.id ? (
                <AddTaskForm projectId={projectId} status={col.id} onDone={() => setAdding(null)} />
              ) : (
                <button
                  onClick={() => setAdding(col.id)}
                  className="flex items-center gap-1.5 text-xs text-white/30 hover:text-white/60 py-2 transition-colors"
                >
                  <Plus size={12} /> Ajouter
                </button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
