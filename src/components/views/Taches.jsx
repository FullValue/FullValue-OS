import { useState } from 'react'
import { Plus, Trash2, Zap, Pin, Check } from 'lucide-react'
import { useStore } from '../../store/useStore'
import Badge from '../ui/Badge'
import Drawer from '../ui/Drawer'

const FILTERS = ['Tous', 'High impact', 'Aujourd\'hui', 'En retard']

function TaskForm({ initial = {}, onSubmit, onClose, projects }) {
  const [title, setTitle] = useState(initial.title || '')
  const [projectId, setProjectId] = useState(initial.projectId || projects[0]?.id || '')
  const [impact, setImpact] = useState(initial.impact || 'low')
  const [ship80, setShip80] = useState(initial.ship80 || false)
  const [today, setToday] = useState(initial.today !== undefined ? initial.today : false)
  const [dueDate, setDueDate] = useState(initial.dueDate || '')
  const [notes, setNotes] = useState(initial.notes || '')

  function handleSubmit(e) {
    e.preventDefault()
    if (!title.trim()) return
    onSubmit({ title: title.trim(), projectId, impact, ship80, today, dueDate: dueDate || null, notes, status: initial.status || 'todo' })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <label className="text-white/50 text-xs mb-1 block">Titre *</label>
        <input
          autoFocus
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Description de la tâche..."
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-accent/50"
        />
      </div>

      <div>
        <label className="text-white/50 text-xs mb-1 block">Projet</label>
        <select
          value={projectId}
          onChange={e => setProjectId(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-accent/50"
        >
          {projects.map(p => (
            <option key={p.id} value={p.id} style={{ background: '#161B22' }}>{p.name}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="text-white/50 text-xs mb-1 block">Impact</label>
          <div className="flex gap-2">
            {['high', 'low'].map(v => (
              <button
                key={v}
                type="button"
                onClick={() => setImpact(v)}
                className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${impact === v ? 'bg-accent/25 text-accent border border-accent/40' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}
              >
                {v === 'high' ? '⚡ High' : '· Low'}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-white/50 text-xs mb-2 block">Ship80</label>
          <button
            type="button"
            onClick={() => setShip80(!ship80)}
            className={`w-full py-2 rounded-lg text-xs font-medium transition-colors ${ship80 ? 'bg-emerald/20 text-emerald border border-emerald/30' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}
          >
            🚀 {ship80 ? 'Oui' : 'Non'}
          </button>
        </div>
        <div>
          <label className="text-white/50 text-xs mb-2 block">Aujourd'hui</label>
          <button
            type="button"
            onClick={() => setToday(!today)}
            className={`w-full py-2 rounded-lg text-xs font-medium transition-colors ${today ? 'bg-accent/20 text-accent border border-accent/30' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}
          >
            📌 {today ? 'Oui' : 'Non'}
          </button>
        </div>
      </div>

      <div>
        <label className="text-white/50 text-xs mb-1 block">Date limite</label>
        <input
          type="date"
          value={dueDate}
          onChange={e => setDueDate(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-accent/50"
        />
      </div>

      <div>
        <label className="text-white/50 text-xs mb-1 block">Notes</label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Notes optionnelles..."
          rows={3}
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-accent/50 resize-none"
        />
      </div>

      <div className="flex gap-3 pt-2">
        <button type="submit" className="flex-1 bg-accent hover:bg-accent/90 text-white py-2.5 rounded-lg text-sm font-medium transition-colors">
          {initial.id ? 'Mettre à jour' : 'Créer'}
        </button>
        <button type="button" onClick={onClose} className="flex-1 bg-white/5 hover:bg-white/10 text-white/60 py-2.5 rounded-lg text-sm transition-colors">
          Annuler
        </button>
      </div>
    </form>
  )
}

export default function Taches() {
  const { state, dispatch } = useStore()
  const [captureText, setCaptureText] = useState('')
  const [filter, setFilter] = useState('Tous')
  const [projectFilter, setProjectFilter] = useState('all')
  const [newTaskDrawer, setNewTaskDrawer] = useState(false)
  const [inboxDrawer, setInboxDrawer] = useState(null)
  const [editingTitle, setEditingTitle] = useState(null)
  const [editTitle, setEditTitle] = useState('')

  function handleCapture(e) {
    if (e.key === 'Enter' && captureText.trim()) {
      dispatch({ type: 'ADD_INBOX', payload: captureText.trim() })
      setCaptureText('')
    }
  }

  function isOverdue(task) {
    if (!task.dueDate) return false
    return new Date(task.dueDate) < new Date() && task.status !== 'done'
  }

  let tasks = state.tasks
  if (filter === 'High impact') tasks = tasks.filter(t => t.impact === 'high')
  if (filter === "Aujourd'hui") tasks = tasks.filter(t => t.today)
  if (filter === 'En retard') tasks = tasks.filter(t => isOverdue(t))
  if (projectFilter !== 'all') tasks = tasks.filter(t => t.projectId === projectFilter)

  const sortedTasks = [...tasks].sort((a, b) => {
    if (a.today !== b.today) return a.today ? -1 : 1
    if (a.impact !== b.impact) return a.impact === 'high' ? -1 : 1
    return new Date(a.createdAt) - new Date(b.createdAt)
  })

  function startEditTitle(task) {
    setEditingTitle(task.id)
    setEditTitle(task.title)
  }

  function commitEditTitle(taskId) {
    if (editTitle.trim()) {
      dispatch({ type: 'UPDATE_TASK', payload: { id: taskId, title: editTitle.trim() } })
    }
    setEditingTitle(null)
  }

  function getProject(id) {
    return state.projects.find(p => p.id === id)
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Capture */}
      <div className="mb-6">
        <div className="relative">
          <Plus size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            value={captureText}
            onChange={e => setCaptureText(e.target.value)}
            onKeyDown={handleCapture}
            placeholder="Capturer une idée ou tâche... (Entrée pour ajouter)"
            className="w-full bg-white/3 border border-white/5 hover:border-white/10 rounded-xl pl-9 pr-4 py-3.5 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-transparent transition-colors"
          />
        </div>

        {/* Inbox */}
        {state.inbox.length > 0 && (
          <div className="mt-3 bg-amber/5 border border-amber/15 rounded-xl p-4">
            <p className="text-amber text-xs font-medium mb-2">📥 Inbox ({state.inbox.length} à trier)</p>
            <div className="flex flex-col gap-2">
              {state.inbox.map(item => (
                <div key={item.id} className="flex items-center gap-3">
                  <span className="flex-1 text-white/70 text-sm">{item.text}</span>
                  <button
                    onClick={() => setInboxDrawer(item)}
                    className="text-xs bg-accent/15 hover:bg-accent/25 text-accent px-2 py-1 rounded-lg transition-colors"
                  >
                    Trier →
                  </button>
                  <button
                    onClick={() => dispatch({ type: 'REMOVE_INBOX', payload: item.id })}
                    className="text-white/20 hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filter === f ? 'bg-accent/20 text-accent border border-accent/30' : 'bg-white/5 text-white/40 hover:bg-white/8 hover:text-white/60'}`}
          >
            {f}
          </button>
        ))}
        <select
          value={projectFilter}
          onChange={e => setProjectFilter(e.target.value)}
          className="ml-auto bg-white/5 border border-white/5 rounded-lg px-2 py-1.5 text-xs text-white/50 focus:outline-none"
        >
          <option value="all" style={{ background: '#161B22' }}>Tous les projets</option>
          {state.projects.map(p => (
            <option key={p.id} value={p.id} style={{ background: '#161B22' }}>{p.name}</option>
          ))}
        </select>
      </div>

      {/* Header row */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-white/30 text-xs">{sortedTasks.length} tâche{sortedTasks.length > 1 ? 's' : ''}</span>
        <button
          onClick={() => setNewTaskDrawer(true)}
          className="flex items-center gap-1.5 text-xs bg-accent/15 hover:bg-accent/25 text-accent px-3 py-1.5 rounded-lg transition-colors"
        >
          <Plus size={12} /> Nouvelle tâche
        </button>
      </div>

      {/* Task list */}
      {sortedTasks.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-white/30 text-sm">Aucune tâche — capture ta première idée ci-dessus</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {sortedTasks.map(task => {
            const project = getProject(task.projectId)
            const overdue = isOverdue(task)
            const done = task.status === 'done'
            return (
              <div
                key={task.id}
                className={`group flex items-start gap-3 p-3 rounded-xl border transition-all ${
                  done
                    ? 'bg-white/1 border-white/3 opacity-50'
                    : overdue
                    ? 'bg-amber/3 border-amber/15'
                    : 'bg-white/3 border-white/5 hover:border-white/10'
                }`}
              >
                {/* Checkbox */}
                <button
                  onClick={() => dispatch({ type: 'TOGGLE_TASK_DONE', payload: task.id })}
                  className={`mt-0.5 flex-shrink-0 transition-colors ${done ? 'text-emerald' : 'text-white/20 hover:text-emerald'}`}
                >
                  {done ? <Check size={16} /> : <div className="w-4 h-4 rounded border border-white/20 hover:border-emerald" />}
                </button>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  {editingTitle === task.id ? (
                    <input
                      autoFocus
                      value={editTitle}
                      onChange={e => setEditTitle(e.target.value)}
                      onBlur={() => commitEditTitle(task.id)}
                      onKeyDown={e => { if (e.key === 'Enter') commitEditTitle(task.id); if (e.key === 'Escape') setEditingTitle(null) }}
                      className="w-full bg-white/10 border border-white/20 rounded px-2 py-0.5 text-sm text-white focus:outline-none"
                    />
                  ) : (
                    <p
                      className={`text-sm cursor-pointer ${done ? 'line-through text-white/30' : 'text-white/85'}`}
                      onClick={() => !done && startEditTitle(task)}
                    >
                      {task.title}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    {project && <Badge color={project.color} name={project.name} />}
                    {task.dueDate && (
                      <span className={`text-[10px] font-mono ${overdue ? 'text-amber' : 'text-white/30'}`}>
                        {overdue ? '⚠ ' : ''}{new Date(task.dueDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => dispatch({ type: 'UPDATE_TASK', payload: { id: task.id, impact: task.impact === 'high' ? 'low' : 'high' } })}
                    className={`p-1.5 rounded transition-colors ${task.impact === 'high' ? 'text-amber' : 'text-white/20 hover:text-amber'}`}
                    title="Impact"
                  >
                    <Zap size={13} />
                  </button>
                  <button
                    onClick={() => dispatch({ type: 'UPDATE_TASK', payload: { id: task.id, ship80: !task.ship80 } })}
                    className={`p-1.5 rounded transition-colors text-sm ${task.ship80 ? 'opacity-100' : 'opacity-20 hover:opacity-60'}`}
                    title="Ship80"
                  >
                    🚀
                  </button>
                  {task.ship80 && !done && !task.ship80Delivered && (
                    <button
                      onClick={() => dispatch({ type: 'SHIP80_DELIVER', payload: task.id })}
                      className="text-[10px] px-2 py-1 rounded-lg font-medium transition-colors"
                      style={{ background: '#FFC1E018', color: '#FFC1E0', border: '1px solid #FFC1E030' }}
                      title="Livrer en mode 80%"
                    >
                      Livrer&nbsp;80%
                    </button>
                  )}
                  <button
                    onClick={() => dispatch({ type: 'UPDATE_TASK', payload: { id: task.id, today: !task.today } })}
                    className={`p-1.5 rounded transition-colors ${task.today ? 'text-accent' : 'text-white/20 hover:text-accent'}`}
                    title="Aujourd'hui"
                  >
                    <Pin size={13} />
                  </button>
                  <button
                    onClick={() => dispatch({ type: 'DELETE_TASK', payload: task.id })}
                    className="p-1.5 rounded text-white/10 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                    title="Supprimer"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* New task drawer */}
      <Drawer isOpen={newTaskDrawer} onClose={() => setNewTaskDrawer(false)} title="Nouvelle tâche">
        <TaskForm
          projects={state.projects}
          onClose={() => setNewTaskDrawer(false)}
          onSubmit={payload => {
            dispatch({ type: 'ADD_TASK', payload })
            setNewTaskDrawer(false)
          }}
        />
      </Drawer>

      {/* Inbox triage drawer */}
      <Drawer isOpen={!!inboxDrawer} onClose={() => setInboxDrawer(null)} title="Trier la capture">
        {inboxDrawer && (
          <div className="flex flex-col gap-4">
            <div className="bg-amber/5 border border-amber/15 rounded-lg p-3">
              <p className="text-white/70 text-sm">{inboxDrawer.text}</p>
            </div>
            <TaskForm
              initial={{ title: inboxDrawer.text, today: false }}
              projects={state.projects}
              onClose={() => setInboxDrawer(null)}
              onSubmit={payload => {
                dispatch({ type: 'ADD_TASK', payload })
                dispatch({ type: 'REMOVE_INBOX', payload: inboxDrawer.id })
                setInboxDrawer(null)
              }}
            />
          </div>
        )}
      </Drawer>
    </div>
  )
}
