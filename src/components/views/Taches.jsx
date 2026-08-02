import { useState } from 'react'
import { Plus, Trash2, Zap, Pin, Check } from 'lucide-react'
import { useStore } from '../../store/useStore'
import Badge from '../ui/Badge'
import Drawer from '../ui/Drawer'
import GlowSearchBar from '../ui/GlowSearchBar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/select'
import { EmptyState } from '@/components/ui/empty-state'
import { Checkbox } from '@/components/ui/checkbox'
import { toast, toastUndo } from '@/lib/toast'

const FILTERS = ['Tous', 'High impact', 'Aujourd\'hui', 'En retard']

function ToggleChip({ active, onClick, children, tone = 'violet' }) {
  const tones = {
    violet: 'bg-[var(--violet-bg)] text-[var(--violet-deep)] ring-1 ring-[var(--violet-solid)]',
    green: 'bg-[var(--green-bg)] text-[var(--green-deep)] ring-1 ring-[var(--green-solid)]',
  }
  return (
    <Button
      type="button"
      variant="ghost"
      onClick={onClick}
      className={`h-auto w-full rounded-xl py-2 text-xs font-medium ${
        active ? tones[tone] : 'bg-[rgba(var(--ink),0.05)] text-[var(--text-tertiary)] hover:bg-[rgba(var(--ink),0.08)]'
      }`}
    >
      {children}
    </Button>
  )
}

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
        <Label>Titre *</Label>
        <Input
          autoFocus
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Description de la tâche…"
        />
      </div>

      <div>
        <Label>Projet</Label>
        <NativeSelect value={projectId} onChange={e => setProjectId(e.target.value)}>
          {projects.map(p => (
            <option key={p.id} value={p.id}>{p.emoji} {p.name}</option>
          ))}
        </NativeSelect>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <Label>Impact</Label>
          <div className="flex gap-2">
            {['high', 'low'].map(v => (
              <ToggleChip key={v} active={impact === v} onClick={() => setImpact(v)}>
                {v === 'high' ? '⚡ Fort' : '· Faible'}
              </ToggleChip>
            ))}
          </div>
        </div>
        <div>
          <Label>Ship 80</Label>
          <ToggleChip tone="green" active={ship80} onClick={() => setShip80(!ship80)}>
            🚀 {ship80 ? 'Oui' : 'Non'}
          </ToggleChip>
        </div>
        <div>
          <Label>Aujourd'hui</Label>
          <ToggleChip active={today} onClick={() => setToday(!today)}>
            📌 {today ? 'Oui' : 'Non'}
          </ToggleChip>
        </div>
      </div>

      <div>
        <Label>Date limite</Label>
        <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
      </div>

      <div>
        <Label>Notes</Label>
        <Textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Notes optionnelles…"
          rows={3}
        />
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="submit" className="flex-1">
          {initial.id ? 'Mettre à jour' : 'Créer'}
        </Button>
        <Button type="button" variant="subtle" className="flex-1" onClick={onClose}>
          Annuler
        </Button>
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
  const [search, setSearch] = useState('')

  function handleCapture(e) {
    if (e.key === 'Enter' && captureText.trim()) {
      dispatch({ type: 'ADD_INBOX', payload: { text: captureText.trim() } })
      toast.success('Ajouté à l’Inbox')
      setCaptureText('')
    }
  }

  function isOverdue(task) {
    if (!task.dueDate) return false
    return new Date(task.dueDate) < new Date() && task.status !== 'done'
  }

  function deleteTask(task) {
    dispatch({ type: 'DELETE_TASK', payload: task.id })
    toastUndo('Tâche supprimée', () =>
      dispatch({ type: 'RESTORE_ITEMS', payload: { tasks: [task] } })
    )
  }

  let tasks = state.tasks
  if (filter === 'High impact') tasks = tasks.filter(t => t.impact === 'high')
  if (filter === "Aujourd'hui") tasks = tasks.filter(t => t.today)
  if (filter === 'En retard') tasks = tasks.filter(t => isOverdue(t))
  if (projectFilter !== 'all') tasks = tasks.filter(t => t.projectId === projectFilter)
  if (search) tasks = tasks.filter(t => t.title?.toLowerCase().includes(search.toLowerCase()))

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
    <div className="mx-auto max-w-3xl px-4 py-8">
      {/* Capture */}
      <div className="mb-6">
        <div className="relative">
          <Plus size={16} className="absolute left-3 top-1/2 -translate-y-1/2 z-10 text-[var(--text-tertiary)]" />
          <Input
            value={captureText}
            onChange={e => setCaptureText(e.target.value)}
            onKeyDown={handleCapture}
            placeholder="Capturer une idée ou tâche…  (Entrée pour ajouter)"
            className="h-12 pl-9 pr-4 shadow-[var(--shadow-card)]"
          />
        </div>

        {/* Inbox */}
        {state.inbox.length > 0 && (
          <div className="mt-3 rounded-xl border border-[var(--yellow-solid)] bg-[var(--yellow-bg)] p-4">
            <p className="mb-2 text-xs font-medium text-[var(--yellow-deep)]">📥 Inbox ({state.inbox.length} à trier)</p>
            <div className="flex flex-col gap-2">
              {state.inbox.map(item => (
                <div key={item.id} className="flex items-center gap-3">
                  <span className="flex-1 text-sm text-[var(--text-secondary)]">{item.text}</span>
                  <Button size="xs" variant="subtle" onClick={() => setInboxDrawer(item)}>Trier →</Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => {
                      dispatch({ type: 'REMOVE_INBOX', payload: item.id })
                      toastUndo('Capture supprimée', () => dispatch({ type: 'RESTORE_ITEMS', payload: { inbox: [item] } }))
                    }}
                    className="text-[var(--text-tertiary)] hover:text-[var(--red-deep)]"
                    aria-label="Supprimer"
                  >
                    <Trash2 size={12} />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="mb-4">
        <GlowSearchBar value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher une tâche…" />
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map(f => (
          <Button
            key={f}
            variant="ghost"
            onClick={() => setFilter(f)}
            className={`h-auto rounded-lg px-3 py-1.5 text-xs font-medium ${
              filter === f
                ? 'bg-[var(--active-bg)] text-[var(--active-text)]'
                : 'bg-[rgba(var(--ink),0.05)] text-[var(--text-tertiary)] hover:bg-[rgba(var(--ink),0.09)] hover:text-[var(--text-secondary)]'
            }`}
          >
            {f}
          </Button>
        ))}
        <div className="ml-auto w-auto">
          <NativeSelect
            value={projectFilter}
            onChange={e => setProjectFilter(e.target.value)}
            className="h-8 text-xs"
          >
            <option value="all">Tous les projets</option>
            {state.projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </NativeSelect>
        </div>
      </div>

      {/* Header row */}
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs text-[var(--text-tertiary)] tabular">{sortedTasks.length} tâche{sortedTasks.length > 1 ? 's' : ''}</span>
        <Button size="sm" variant="subtle" onClick={() => setNewTaskDrawer(true)}>
          <Plus size={12} /> Nouvelle tâche
        </Button>
      </div>

      {/* Task list */}
      {sortedTasks.length === 0 ? (
        <EmptyState
          icon={Check}
          title={search || filter !== 'Tous' || projectFilter !== 'all' ? 'Aucune tâche ne correspond' : 'Aucune tâche'}
          description={search || filter !== 'Tous' || projectFilter !== 'all' ? 'Ajuste tes filtres ou ta recherche.' : 'Capture ta première idée dans le champ ci-dessus, ou crée une tâche.'}
          action={<Button size="sm" onClick={() => setNewTaskDrawer(true)}><Plus size={13} /> Nouvelle tâche</Button>}
        />
      ) : (
        <div className="flex flex-col gap-2">
          {sortedTasks.map(task => {
            const project = getProject(task.projectId)
            const overdue = isOverdue(task)
            const done = task.status === 'done'
            return (
              <div
                key={task.id}
                className={`group flex items-start gap-3 rounded-xl border p-3 transition-all ${
                  done
                    ? 'border-[var(--border-soft)] bg-[var(--bg-card-soft)] opacity-55'
                    : overdue
                    ? 'border-[var(--orange-solid)] bg-[var(--orange-bg)]'
                    : 'border-[var(--border-soft)] bg-[var(--bg-card)] shadow-[var(--shadow-card)] hover:-translate-y-px hover:shadow-[var(--shadow-card-hover)]'
                }`}
              >
                {/* Checkbox */}
                <Checkbox
                  checked={done}
                  onCheckedChange={() => dispatch({ type: 'TOGGLE_TASK_DONE', payload: task.id })}
                  aria-label={done ? 'Marquer non terminée' : 'Marquer terminée'}
                  className={`mt-0.5 h-4 w-4 flex-shrink-0 ${done ? 'border-[var(--green-deep)] bg-[var(--green-deep)]' : 'border-[var(--border-strong)]'}`}
                />

                {/* Content */}
                <div className="min-w-0 flex-1">
                  {editingTitle === task.id ? (
                    <Input
                      autoFocus
                      value={editTitle}
                      onChange={e => setEditTitle(e.target.value)}
                      onBlur={() => commitEditTitle(task.id)}
                      onKeyDown={e => { if (e.key === 'Enter') commitEditTitle(task.id); if (e.key === 'Escape') setEditingTitle(null) }}
                      className="h-7 px-2 border-[var(--violet-deep)]"
                    />
                  ) : (
                    <p
                      className={`cursor-pointer text-sm ${done ? 'text-[var(--text-tertiary)] line-through' : 'text-[var(--text-primary)]'}`}
                      onClick={() => !done && startEditTitle(task)}
                    >
                      {task.title}
                    </p>
                  )}
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    {project && <Badge color={project.color} name={project.name} />}
                    {task.dueDate && (
                      <span className={`font-mono text-[10px] tabular ${overdue ? 'text-[var(--orange-deep)]' : 'text-[var(--text-tertiary)]'}`}>
                        {overdue ? '⚠ ' : ''}{new Date(task.dueDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-shrink-0 items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => dispatch({ type: 'UPDATE_TASK', payload: { id: task.id, impact: task.impact === 'high' ? 'low' : 'high' } })}
                    className={task.impact === 'high' ? 'text-[var(--orange-deep)]' : 'text-[var(--text-tertiary)] hover:text-[var(--orange-deep)]'}
                    title="Impact"
                  >
                    <Zap size={13} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => dispatch({ type: 'UPDATE_TASK', payload: { id: task.id, ship80: !task.ship80 } })}
                    className={`text-sm ${task.ship80 ? 'opacity-100' : 'opacity-25 hover:opacity-60'}`}
                    title="Ship 80"
                  >
                    🚀
                  </Button>
                  {task.ship80 && !done && !task.ship80Delivered && (
                    <Button
                      variant="ghost"
                      onClick={() => dispatch({ type: 'SHIP80_DELIVER', payload: task.id })}
                      className="h-auto rounded-lg px-2 py-1 text-[10px] font-medium"
                      style={{ background: 'var(--pink-bg)', color: 'var(--pink-deep)' }}
                      title="Livrer en mode 80%"
                    >
                      Livrer&nbsp;80%
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => dispatch({ type: 'UPDATE_TASK', payload: { id: task.id, today: !task.today } })}
                    className={task.today ? 'text-[var(--violet-deep)]' : 'text-[var(--text-tertiary)] hover:text-[var(--violet-deep)]'}
                    title="Aujourd'hui"
                  >
                    <Pin size={13} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => deleteTask(task)}
                    className="text-[var(--text-tertiary)] opacity-0 hover:text-[var(--red-deep)] group-hover:opacity-100"
                    title="Supprimer"
                  >
                    <Trash2 size={13} />
                  </Button>
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
            toast.success('Tâche créée')
            setNewTaskDrawer(false)
          }}
        />
      </Drawer>

      {/* Inbox triage drawer */}
      <Drawer isOpen={!!inboxDrawer} onClose={() => setInboxDrawer(null)} title="Trier la capture">
        {inboxDrawer && (
          <div className="flex flex-col gap-4">
            <div className="rounded-lg border border-[var(--yellow-solid)] bg-[var(--yellow-bg)] p-3">
              <p className="text-sm text-[var(--text-secondary)]">{inboxDrawer.text}</p>
            </div>
            <TaskForm
              initial={{ title: inboxDrawer.text, today: false }}
              projects={state.projects}
              onClose={() => setInboxDrawer(null)}
              onSubmit={payload => {
                dispatch({ type: 'ADD_TASK', payload })
                dispatch({ type: 'REMOVE_INBOX', payload: inboxDrawer.id })
                toast.success('Convertie en tâche')
                setInboxDrawer(null)
              }}
            />
          </div>
        )}
      </Drawer>
    </div>
  )
}
