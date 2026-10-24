import { useState } from 'react'
import { ChevronLeft, ChevronRight, Plus, Trash2, Link2, Target, Check, X } from 'lucide-react'
import { useStore, nanoid } from '@/store/useStore'
import { goalProgress, northStarOf, quarterLabel, quarterOf, shiftQuarter } from '@/lib/goals'
import { toast, toastUndo } from '@/lib/toast'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'

const TITLE = 'text-[34px] font-semibold leading-tight tracking-tight text-[var(--text-primary)]'

function GoalCard({ goal, project }) {
  const { state, dispatch } = useStore()
  const [milestone, setMilestone] = useState('')
  const [taskTitle, setTaskTitle] = useState('')
  const [linking, setLinking] = useState(false)
  const { pct, done, total, linked } = goalProgress(goal, state.tasks)
  const milestones = goal.milestones || []
  const linkable = state.tasks.filter(t => t.projectId === goal.projectId && !t.goalId && t.status !== 'done')

  const patch = p => dispatch({ type: 'UPDATE_ENTITY', payload: { collection: 'goals', id: goal.id, patch: p } })

  function addMilestone(e) {
    e.preventDefault()
    if (!milestone.trim()) return
    patch({ milestones: [...milestones, { id: nanoid(), title: milestone.trim(), done: false }] })
    setMilestone('')
  }

  function addTask(e) {
    e.preventDefault()
    if (!taskTitle.trim()) return
    dispatch({ type: 'ADD_TASK', payload: { title: taskTitle.trim(), projectId: goal.projectId, goalId: goal.id, status: 'todo', impact: 'high', today: false, dueDate: null, notes: '' } })
    setTaskTitle('')
  }

  function remove() {
    dispatch({ type: 'DELETE_ENTITY', payload: { collection: 'goals', id: goal.id } })
    toastUndo('Objectif supprimé', () => dispatch({ type: 'RESTORE_ITEMS', payload: { goals: [goal] } }))
  }

  return (
    <Card className="group space-y-4 p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: (project?.color || '#3b6ff0') + '30' }}><Target size={17} /></span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-[var(--text-primary)]">{goal.title}</p>
          <p className="text-xs text-[var(--text-tertiary)]">{done}/{total} étape{total > 1 ? 's' : ''} · {project ? `${project.emoji} ${project.name}` : 'Sans pôle'}</p>
        </div>
        <span className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">{pct}%</span>
        <Button variant="ghost" size="icon-sm" onClick={remove} aria-label="Supprimer l'objectif" className="opacity-0 group-hover:opacity-100"><Trash2 size={13} /></Button>
      </div>
      <Progress value={pct} />

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-tertiary)]">Jalons</p>
          {milestones.map(m => (
            <div key={m.id} className="group/m flex items-center gap-2 text-sm">
              <button type="button" onClick={() => patch({ milestones: milestones.map(x => x.id === m.id ? { ...x, done: !x.done } : x) })}
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full" style={m.done ? { background: 'var(--accent)', color: '#fff' } : { border: '1.5px solid var(--border-strong)' }} aria-label="Valider le jalon">
                {m.done && <Check size={11} strokeWidth={3} />}
              </button>
              <span className={`flex-1 ${m.done ? 'text-[var(--text-tertiary)] line-through' : 'text-[var(--text-primary)]'}`}>{m.title}</span>
              <button type="button" onClick={() => patch({ milestones: milestones.filter(x => x.id !== m.id) })} className="opacity-0 group-hover/m:opacity-100" aria-label="Retirer"><X size={12} /></button>
            </div>
          ))}
          <form onSubmit={addMilestone}><Input value={milestone} onChange={e => setMilestone(e.target.value)} placeholder="+ Jalon (Entrée)" className="h-9" /></form>
        </div>
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-tertiary)]">Tâches liées · {linked.length}</p>
          {linked.map(t => (
            <div key={t.id} className="group/t flex items-center gap-2 text-sm">
              <button type="button" onClick={() => dispatch({ type: 'TOGGLE_TASK_DONE', payload: t.id })}
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md" style={t.status === 'done' ? { background: 'var(--accent)', color: '#fff' } : { border: '1.5px solid var(--border-strong)' }} aria-label="Terminer">
                {t.status === 'done' && <Check size={11} strokeWidth={3} />}
              </button>
              <span className={`flex-1 truncate ${t.status === 'done' ? 'text-[var(--text-tertiary)] line-through' : 'text-[var(--text-primary)]'}`}>{t.title}</span>
              <button type="button" onClick={() => dispatch({ type: 'UPDATE_TASK', payload: { id: t.id, goalId: null } })} className="opacity-0 group-hover/t:opacity-100" aria-label="Délier"><X size={12} /></button>
            </div>
          ))}
          <form onSubmit={addTask}><Input value={taskTitle} onChange={e => setTaskTitle(e.target.value)} placeholder="+ Nouvelle tâche liée (Entrée)" className="h-9" /></form>
          {linking ? (
            <select autoFocus className="h-9 w-full rounded-full border border-[var(--border-medium)] bg-[var(--bg-surface)] px-3 text-xs" defaultValue=""
              onChange={e => { if (e.target.value) dispatch({ type: 'UPDATE_TASK', payload: { id: e.target.value, goalId: goal.id } }); setLinking(false) }}
              onBlur={() => setLinking(false)}>
              <option value="">Choisir une tâche du pôle…</option>
              {linkable.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
            </select>
          ) : linkable.length > 0 && (
            <Button size="xs" variant="subtle" onClick={() => setLinking(true)}><Link2 size={11} /> Lier une tâche existante</Button>
          )}
        </div>
      </div>
    </Card>
  )
}

export default function Objectifs() {
  const { state, dispatch } = useStore()
  const [quarter, setQuarter] = useState(quarterOf())
  const [title, setTitle] = useState('')
  const [projectId, setProjectId] = useState(state.projects[0]?.id || '')
  const goals = (state.goals || []).filter(g => g.quarter === quarter)

  function add(e) {
    e.preventDefault()
    if (!title.trim()) return
    dispatch({ type: 'ADD_ENTITY', payload: { collection: 'goals', item: { title: title.trim(), projectId, quarter, milestones: [] } } })
    setTitle('')
    toast.success('Objectif créé : ajoute ses jalons et ses tâches')
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className={TITLE}>Objectifs</h1>
        <p className="text-sm text-[var(--text-tertiary)]">Tes objectifs du trimestre par pôle. Leur progression vient des jalons et des tâches terminés, et fait avancer la North Star du pôle toute seule.</p>
        <div className="-ml-2 flex items-center gap-1">
          <Button variant="ghost" size="icon-sm" onClick={() => setQuarter(q => shiftQuarter(q, -1))} aria-label="Trimestre précédent"><ChevronLeft size={15} /></Button>
          <span className="min-w-[170px] text-center text-sm font-medium text-[var(--text-primary)]">{quarterLabel(quarter)}</span>
          <Button variant="ghost" size="icon-sm" onClick={() => setQuarter(q => shiftQuarter(q, 1))} aria-label="Trimestre suivant"><ChevronRight size={15} /></Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {state.projects.map(p => {
          const ns = northStarOf(p, state)
          return (
            <Card key={p.id} className="p-4">
              <p className="text-sm font-medium text-[var(--text-primary)]">{p.emoji} {p.name}</p>
              <p className="mb-2 truncate text-[11px] text-[var(--text-tertiary)]">{p.northStar || 'North Star à définir'}</p>
              <Progress value={ns.pct} />
              <p className="mt-1 text-[11px] text-[var(--text-tertiary)]">{ns.pct}% · {ns.auto ? 'calculé depuis les objectifs' : 'saisi à la main'}</p>
            </Card>
          )
        })}
      </div>

      <form onSubmit={add} className="flex flex-wrap gap-2">
        <select value={projectId} onChange={e => setProjectId(e.target.value)} className="h-10 rounded-full border border-[var(--border-medium)] bg-[var(--bg-surface)] px-4 text-sm" aria-label="Pôle">
          {state.projects.map(p => <option key={p.id} value={p.id}>{p.emoji} {p.name}</option>)}
        </select>
        <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Nouvel objectif (ex. Signer 3 clients agence)" className="min-w-[240px] flex-1" />
        <Button type="submit"><Plus size={14} /> Ajouter</Button>
      </form>

      <div className="space-y-4">
        {goals.map(g => <GoalCard key={g.id} goal={g} project={state.projects.find(p => p.id === g.projectId)} />)}
        {!goals.length && <p className="text-sm text-[var(--text-tertiary)]">Aucun objectif pour ce trimestre.</p>}
      </div>
    </div>
  )
}
