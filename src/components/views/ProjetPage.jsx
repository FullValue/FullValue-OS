import { accentText } from '@/lib/colors'
import { useState, useRef, useEffect } from 'react'
import { ArrowLeft, Clock, CheckSquare, BarChart2, Kanban, FileText, Calendar, Flag, Edit2, Check, Plus, Trash2, FileJson, Play, CalendarDays, Link2, ExternalLink } from 'lucide-react'
import { useStore } from '@/store/useStore'
import ViewContainer from '@/views/ViewContainer'
import Drawer from '@/components/ui/Drawer'
import BulkImportInterface from '@/components/import/BulkImportInterface'
import { ID_TO_SLUG } from '@/hooks/useBulkImport'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Slider } from '@/components/ui/slider'
import { EmptyState } from '@/components/ui/empty-state'
import { UIBadge } from '@/components/ui/Badge'
import { toast, toastUndo } from '@/lib/toast'
import { northStarOf } from '@/lib/goals'

function formatDuration(seconds) {
  if (!seconds) return '0m'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h${m > 0 ? m + 'm' : ''}`
  return `${m}m`
}

function getWeekStart() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return d
}

const TIER_LABELS = { 1: 'Tier 1 — Core', 2: 'Tier 2 — Growth', 3: 'Tier 3 — Side', 4: 'Tier 4 — Explore' }

const TABS = [
  { id: 'kanban', label: 'Tâches', Icon: Kanban },
  { id: 'dashboard', label: 'Tableau de bord', Icon: BarChart2 },
  { id: 'notes', label: 'Notes', Icon: FileText },
  { id: 'ressources', label: 'Ressources', Icon: Link2 },
  { id: 'sessions', label: 'Sessions', Icon: Calendar },
]

function NorthStarBanner({ project }) {
  const { state, dispatch } = useStore()
  const ns = northStarOf(project, state)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(project.northStar)

  function commitEdit() {
    if (draft.trim()) {
      dispatch({ type: 'UPDATE_PROJECT', payload: { id: project.id, northStar: draft.trim() } })
    }
    setEditing(false)
  }

  function handleProgress(value) {
    dispatch({ type: 'UPDATE_PROJECT', payload: { id: project.id, northStarProgress: Number(value) } })
  }

  return (
    <div
      className="flex items-center gap-3 rounded-2xl px-4 py-3"
      style={{ background: project.color + '18' }}
    >
      <Flag size={14} style={{ color: accentText(project.color) }} className="flex-shrink-0" />
      <div className="flex-1 min-w-0 flex items-center gap-2">
        {editing ? (
          <Input
            autoFocus
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') { setDraft(project.northStar); setEditing(false) } }}
            className="h-7 min-w-0 flex-1 rounded-lg bg-transparent px-2 text-sm font-medium shadow-none focus:bg-transparent focus:ring-0"
            style={{ color: accentText(project.color) }}
          />
        ) : (
          <span className="text-sm font-medium truncate" style={{ color: accentText(project.color) }}>
            North Star : {project.northStar || 'Définir un objectif…'}
          </span>
        )}
      </div>

      {/* Progress badge */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="flex items-center gap-1.5">
          <Progress value={ns.pct} color={project.color} className="w-24" />
          <span className="font-mono text-[11px] tabular" style={{ color: accentText(project.color) }}>{ns.pct}%</span>
          {ns.auto && <span className="text-[10px] text-[var(--text-tertiary)]">auto · objectifs</span>}
        </div>

        {/* Saisie manuelle seulement si aucun objectif ne pilote la progression */}
        {!ns.auto && <Slider
          min={0}
          max={100}
          step={1}
          value={[project.northStarProgress]}
          onValueChange={([value]) => handleProgress(value)}
          className="w-16 opacity-60 transition-opacity hover:opacity-100"
          aria-label="Progression North Star"
        />}

        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => { setDraft(project.northStar); setEditing(!editing) }}
        >
          {editing ? <Check size={12} style={{ color: accentText(project.color) }} /> : <Edit2 size={12} />}
        </Button>
      </div>
    </div>
  )
}

// ─── Inline date editor ───────────────────────────────────────────────────────

function InlineDateEditor({ value, onSave, placeholder, color }) {
  const [editing, setEditing] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => { if (editing) inputRef.current?.focus() }, [editing])

  if (editing) {
    return (
      <Input
        ref={inputRef}
        type="date"
        defaultValue={value || ''}
        onBlur={e => { onSave(e.target.value || null); setEditing(false) }}
        onKeyDown={e => { if (e.key === 'Escape') setEditing(false) }}
        className="h-7 w-auto rounded-lg bg-transparent px-2 font-mono text-xs shadow-none focus:bg-transparent focus:ring-0"
        style={{ color: 'var(--text-secondary)' }}
      />
    )
  }

  if (!value) {
    return (
      <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(true)} className="h-auto p-0 text-[11px] text-[var(--text-tertiary)] hover:bg-transparent hover:opacity-70"
        style={{ color: 'var(--text-tertiary)' }}>
        {placeholder}
      </Button>
    )
  }

  return (
    <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(true)} className="h-auto p-0 text-[11px] font-mono hover:bg-transparent hover:opacity-70"
      style={{ color: color || 'var(--text-secondary)' }}>
      {new Date(value).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
    </Button>
  )
}

// ─── Session task picker ──────────────────────────────────────────────────────

function SessionTaskPicker({ project, tasks, onStart, onClose }) {
  const active = tasks.filter(t => t.projectId === project.id && t.status !== 'done')
  const URGENCY_ORDER = { critical: 0, 'very-urgent': 1, urgent: 2 }
  const sorted = [...active].sort((a, b) => (URGENCY_ORDER[a.urgency] ?? 9) - (URGENCY_ORDER[b.urgency] ?? 9))

  return (
    <>
      <div className="fixed inset-0 z-10" onClick={onClose} />
      <div className="absolute top-full left-0 mt-2 z-20 w-72 rounded-2xl overflow-hidden shadow-2xl"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--c-border)' }}>
        <div className="px-4 py-2.5" style={{ borderBottom: '1px solid var(--c-border)' }}>
          <p className="text-[10px] uppercase tracking-wider font-medium" style={{ color: 'var(--text-tertiary)' }}>
            Choisir une tâche
          </p>
        </div>
        <div className="max-h-56 overflow-y-auto">
          <Button type="button" variant="ghost" onClick={() => onStart(project.id, null)}
            className="h-auto w-full justify-start rounded-none px-4 py-2.5 text-left text-xs transition-colors hover:bg-[rgba(var(--ink),0.05)]"
            style={{ color: 'var(--text-tertiary)' }}>
            — Sans tâche spécifique
          </Button>
          {sorted.map(task => {
            const icon = task.urgency === 'critical' ? '🚨' : task.urgency === 'very-urgent' ? '🔥' : task.urgency === 'urgent' ? '⚡' : null
            return (
              <Button key={task.id} type="button" variant="ghost" onClick={() => onStart(project.id, task.id)}
                className="h-auto w-full justify-start gap-2 rounded-none px-4 py-2.5 text-left text-xs transition-colors hover:bg-[rgba(var(--ink),0.05)]"
                style={{ borderTop: '1px solid var(--c-border)', color: 'var(--text-secondary)' }}>
                {icon && <span className="flex-shrink-0">{icon}</span>}
                <span className="truncate flex-1">{task.title}</span>
                {task.status === 'inprogress' && (
                  <UIBadge variant="yellow" className="flex-shrink-0">En cours</UIBadge>
                )}
              </Button>
            )
          })}
          {sorted.length === 0 && (
            <p className="px-4 py-4 text-xs text-center" style={{ color: 'var(--text-tertiary)' }}>
              Aucune tâche active
            </p>
          )}
        </div>
      </div>
    </>
  )
}

// ─── Urgent task row ──────────────────────────────────────────────────────────

function UrgentTaskRow({ task }) {
  const meta = {
    critical:     { icon: '🚨', color: '#DC2626', label: 'Critique' },
    'very-urgent':{ icon: '🔥', color: '#CC5500', label: 'Très urgent' },
    urgent:       { icon: '⚡', color: '#B45309', label: 'Urgent' },
  }[task.urgency] || {}

  return (
    <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl"
      style={{ background: meta.color + '0C', border: `1px solid ${meta.color}25` }}>
      <span className="text-sm flex-shrink-0">{meta.icon}</span>
      <span className="flex-1 text-xs truncate" style={{ color: 'var(--text-secondary)' }}>{task.title}</span>
      <span className="text-[9px] px-1.5 py-0.5 rounded-full flex-shrink-0 font-medium"
        style={{ background: meta.color + '20', color: meta.color }}>
        {meta.label}
      </span>
      {task.dueDate && (
        <span className="font-mono text-[10px] flex-shrink-0" style={{ color: 'var(--text-tertiary)' }}>
          {new Date(task.dueDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
        </span>
      )}
    </div>
  )
}

// ─── Dashboard tab ────────────────────────────────────────────────────────────

function DashboardTab({ project, tasks, sessions, onStartTask }) {
  const { dispatch } = useStore()
  const [showPicker, setShowPicker] = useState(false)

  const weekStart = getWeekStart()
  const projectTasks = tasks.filter(t => t.projectId === project.id)
  const activeTasks = projectTasks.filter(t => t.status !== 'done')
  const doneTasks = projectTasks.filter(t => t.status === 'done')
  const todayTasks = projectTasks.filter(t => t.today && t.status !== 'done')
  const ship80Tasks = projectTasks.filter(t => t.ship80 && t.status !== 'done')
  const weekSessions = sessions.filter(s => s.projectId === project.id && new Date(s.date) >= weekStart)
  const weekTime = weekSessions.reduce((sum, s) => sum + s.duration, 0)
  const overdueTasks = projectTasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'done')

  const URGENCY_ORDER = { critical: 0, 'very-urgent': 1, urgent: 2 }
  const urgentTasks = projectTasks
    .filter(t => t.urgency && t.status !== 'done')
    .sort((a, b) => (URGENCY_ORDER[a.urgency] ?? 9) - (URGENCY_ORDER[b.urgency] ?? 9))

  // Days since signing
  const daysSigned = project.startDate
    ? Math.floor((new Date() - new Date(project.startDate)) / 86400000)
    : null

  // Deadline
  const daysLeft = project.deadline
    ? Math.ceil((new Date(project.deadline) - new Date()) / 86400000)
    : null
  const deadlineColor = daysLeft == null ? null : daysLeft < 0 ? '#F87171' : daysLeft <= 7 ? '#FFD66B' : project.color

  function handleStartSession(projectId, taskId) {
    setShowPicker(false)
    onStartTask?.(projectId, taskId)
  }

  return (
    <div className="p-4 space-y-4">

      {/* ── Hero card ─────────────────────────────────────────────────────── */}
      <div className="rounded-2xl p-5" style={{ background: project.color + '0E', border: `1px solid ${project.color}28` }}>
        <div className="flex items-start gap-4 mb-5">
          {/* Left: identity */}
          <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
            style={{ background: project.color + '22' }}>
            {project.emoji}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold leading-tight mb-1" style={{ color: accentText(project.color) }}>
              {project.name}
            </h2>
            <div className="flex items-center gap-2 flex-wrap">
              {daysSigned !== null ? (
                <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  Signé le{' '}
                  <InlineDateEditor
                    value={project.startDate}
                    onSave={v => dispatch({ type: 'UPDATE_PROJECT', payload: { id: project.id, startDate: v } })}
                    placeholder="+ date signature"
                    color={project.color}
                  />
                  {' '}·{' '}
                  <span className="font-mono font-semibold" style={{ color: 'var(--text-secondary)' }}>
                    {daysSigned}j
                  </span>
                </span>
              ) : (
                <InlineDateEditor
                  value={project.startDate}
                  onSave={v => dispatch({ type: 'UPDATE_PROJECT', payload: { id: project.id, startDate: v } })}
                  placeholder="+ date de signature"
                  color={project.color}
                />
              )}
            </div>
          </div>

          {/* Right: deadline */}
          <div className="flex-shrink-0 text-right">
            {daysLeft !== null ? (
              <div className="flex flex-col items-end gap-1">
                <span className="text-[9px] uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>Deadline</span>
                <span className="font-mono text-2xl font-bold leading-none" style={{ color: deadlineColor }}>
                  {daysLeft < 0 ? `+${Math.abs(daysLeft)}j` : `J-${daysLeft}`}
                </span>
                <InlineDateEditor
                  value={project.deadline}
                  onSave={v => dispatch({ type: 'UPDATE_PROJECT', payload: { id: project.id, deadline: v } })}
                  placeholder=""
                  color={deadlineColor}
                />
              </div>
            ) : (
              <div className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs"
                style={{ color: 'var(--text-tertiary)', border: '1px dashed rgba(var(--ink),0.1)' }}>
                <CalendarDays size={12} />
                <InlineDateEditor
                  value={project.deadline}
                  onSave={v => dispatch({ type: 'UPDATE_PROJECT', payload: { id: project.id, deadline: v } })}
                  placeholder="Deadline remise"
                  color={project.color}
                />
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 relative">
          <Button
            onClick={() => setShowPicker(v => !v)}
            className="font-semibold hover:opacity-90"
            style={{ background: project.color, color: '#0a0a0a' }}
          >
            <Play size={13} strokeWidth={2.5} />
            Lancer session
          </Button>
          {showPicker && (
            <SessionTaskPicker
              project={project}
              tasks={tasks}
              onStart={handleStartSession}
              onClose={() => setShowPicker(false)}
            />
          )}
        </div>
      </div>

      {/* ── Stats ─────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { Icon: CheckSquare, label: 'Tâches actives', value: activeTasks.length, sub: `${doneTasks.length} terminées`, color: null },
          { Icon: Clock,       label: 'Cette semaine',  value: formatDuration(weekTime), sub: `${weekSessions.length} session${weekSessions.length > 1 ? 's' : ''}`, color: null },
          { Icon: null,        label: "Aujourd'hui",    value: todayTasks.length, sub: 'priorité du jour', emoji: '📌', color: null },
          { Icon: null,        label: 'Ship 80%',       value: ship80Tasks.length, sub: 'à livrer vite', emoji: '🚀', color: '#FFC1E0' },
        ].map((s, i) => (
          <Card key={i} className="p-3">
            <div className="flex items-center gap-1.5 mb-2">
              {s.Icon ? <s.Icon size={12} className="text-[var(--text-tertiary)]" /> : <span className="text-[10px]">{s.emoji}</span>}
              <span className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider">{s.label}</span>
            </div>
            <p className="font-mono text-2xl font-medium tabular" style={{ color: s.color || 'var(--text-primary)' }}>{s.value}</p>
            <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5">{s.sub}</p>
          </Card>
        ))}
      </div>

      {/* ── Tâches urgentes ───────────────────────────────────────────────── */}
      {urgentTasks.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-wider font-medium mb-2" style={{ color: 'var(--text-tertiary)' }}>
            Tâches urgentes · {urgentTasks.length}
          </p>
          <div className="flex flex-col gap-2">
            {urgentTasks.map(task => <UrgentTaskRow key={task.id} task={task} />)}
          </div>
        </div>
      )}

      {/* ── Overdue alert ──────────────────────────────────────────────────── */}
      {overdueTasks.length > 0 && (
        <div className="rounded-xl px-4 py-3 flex items-center gap-2"
          style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.25)' }}>
          <span className="text-sm">⚠</span>
          <span className="text-xs" style={{ color: '#F87171' }}>
            {overdueTasks.length} tâche{overdueTasks.length > 1 ? 's' : ''} en retard
          </span>
          <div className="ml-auto flex flex-col gap-0.5">
            {overdueTasks.slice(0, 3).map(t => (
              <span key={t.id} className="text-[10px] text-[var(--text-tertiary)] truncate max-w-[200px]">{t.title}</span>
            ))}
          </div>
        </div>
      )}

      {/* ── Sessions récentes ─────────────────────────────────────────────── */}
      {weekSessions.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-wider font-medium mb-2" style={{ color: 'var(--text-tertiary)' }}>
            Sessions cette semaine
          </p>
          <div className="flex flex-col gap-2">
            {weekSessions.slice(0, 5).map(s => (
              <div key={s.id} className="flex items-center gap-3 px-3 py-2 rounded-xl"
                style={{ background: 'var(--c-card)', border: '1px solid var(--c-border)' }}>
                <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: project.color }} />
                <span className="flex-1 text-xs truncate" style={{ color: 'var(--text-secondary)' }}>{s.note || '—'}</span>
                <span className="font-mono text-[10px] flex-shrink-0" style={{ color: 'var(--text-tertiary)' }}>{formatDuration(s.duration)}</span>
                <span className="font-mono text-[10px] flex-shrink-0" style={{ color: 'var(--text-tertiary)' }}>
                  {new Date(s.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function NotesTab({ project }) {
  const { dispatch } = useStore()
  const [editing, setEditing] = useState(null)
  const [draft, setDraft] = useState('')
  const [newTitle, setNewTitle] = useState('')
  const [showNew, setShowNew] = useState(false)

  const notes = (project.notes || [])

  function addNote() {
    if (!newTitle.trim()) return
    const note = { id: Math.random().toString(36).slice(2), title: newTitle.trim(), content: '', createdAt: new Date().toISOString() }
    dispatch({ type: 'UPDATE_PROJECT', payload: { id: project.id, notes: [...notes, note] } })
    setNewTitle('')
    setShowNew(false)
    setEditing(note.id)
    setDraft('')
    toast.success('Note créée')
  }

  function saveNote(noteId) {
    dispatch({ type: 'UPDATE_PROJECT', payload: { id: project.id, notes: notes.map(n => n.id === noteId ? { ...n, content: draft } : n) } })
    setEditing(null)
    toast.success('Note enregistrée')
  }

  function deleteNote(noteId) {
    const snapshot = notes
    dispatch({ type: 'UPDATE_PROJECT', payload: { id: project.id, notes: notes.filter(n => n.id !== noteId) } })
    toastUndo('Note supprimée', () => dispatch({ type: 'UPDATE_PROJECT', payload: { id: project.id, notes: snapshot } }))
  }

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between mb-1">
        <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider">{notes.length} note{notes.length > 1 ? 's' : ''}</p>
        <Button
          size="sm"
          onClick={() => setShowNew(true)}
          style={{ background: project.color + '18', color: accentText(project.color) }}
        >
          <Plus size={12} /> Nouvelle note
        </Button>
      </div>

      {showNew && (
        <Card className="p-3">
          <Input
            autoFocus
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') addNote(); if (e.key === 'Escape') setShowNew(false) }}
            placeholder="Titre de la note..."
          />
          <div className="flex gap-2 mt-2">
            <Button size="sm" onClick={addNote} >Créer</Button>
            <Button variant="ghost" size="sm" onClick={() => setShowNew(false)}>Annuler</Button>
          </div>
        </Card>
      )}

      {notes.length === 0 && !showNew && (
        <EmptyState icon={FileText} title="Aucune note pour ce projet" description="Crée une note pour capturer les idées et décisions de ce projet." />
      )}

      {notes.map(note => (
        <Card key={note.id} className="overflow-hidden group">
          <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: editing === note.id ? '1px solid var(--c-border)' : 'none' }}>
            <span className="flex-1 text-sm font-medium text-[var(--text-primary)]">{note.title}</span>
            <span className="font-mono text-[10px] text-[var(--text-tertiary)]">
              {new Date(note.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
            </span>
            <Button
              variant="subtle"
              size="xs"
              onClick={() => { setEditing(editing === note.id ? null : note.id); setDraft(note.content) }}
            >
              {editing === note.id ? 'Fermer' : 'Éditer'}
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => deleteNote(note.id)}
              className="opacity-0 group-hover:opacity-100 text-[var(--text-tertiary)] hover:text-red"
            >
              <Trash2 size={12} />
            </Button>
          </div>

          {editing === note.id ? (
            <div className="p-4">
              <Textarea
                autoFocus
                value={draft}
                onChange={e => setDraft(e.target.value)}
                rows={8}
                placeholder="Écris ta note en Markdown..."
                className="border-transparent bg-transparent focus:bg-transparent resize-none font-mono leading-relaxed"
              />
              <Button size="sm" onClick={() => saveNote(note.id)} className="mt-2">
                Enregistrer
              </Button>
            </div>
          ) : note.content ? (
            <div className="px-4 py-3">
              <p className="text-[var(--text-secondary)] text-xs leading-relaxed whitespace-pre-wrap line-clamp-3">{note.content}</p>
            </div>
          ) : null}
        </Card>
      ))}
    </div>
  )
}

// Liens, prompts et templates rattachés au projet (mêmes données que le Hub Ressources).
function ResourcesTab({ project }) {
  const { state, dispatch } = useStore()
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const resources = state.resources.filter(r => r.projectId === project.id)

  function add(e) {
    e.preventDefault()
    if (!title.trim() || !url.trim()) return
    const href = /^https?:\/\//.test(url.trim()) ? url.trim() : `https://${url.trim()}`
    dispatch({ type: 'ADD_RESOURCE', payload: { type: 'lien', title: title.trim(), url: href, projectId: project.id, category: 'Autre', tag: 'Autre', description: '', content: '' } })
    setTitle('')
    setUrl('')
    toast.success('Lien ajouté')
  }

  function remove(r) {
    dispatch({ type: 'DELETE_RESOURCE', payload: r.id })
    toastUndo('Ressource supprimée', () => dispatch({ type: 'RESTORE_ITEMS', payload: { resources: [r] } }))
  }

  return (
    <div className="space-y-4 p-4">
      <form onSubmit={add} className="flex flex-wrap gap-2">
        <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Nom du lien" className="min-w-[160px] flex-1" />
        <Input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://…" className="min-w-[200px] flex-[2]" />
        <Button type="submit" size="sm" className="h-10"><Plus size={13} /> Ajouter</Button>
      </form>
      {resources.length ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {resources.map(r => (
            <Card key={r.id} className="group flex items-start gap-3 p-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-100)] text-[var(--accent)]">
                {r.type === 'lien' ? <Link2 size={15} /> : <FileText size={15} />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-[var(--text-primary)]">{r.title}</p>
                {r.url
                  ? <a href={r.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 truncate text-xs text-[var(--accent)] hover:underline">{r.url.replace(/^https?:\/\//, '')} <ExternalLink size={10} /></a>
                  : <p className="line-clamp-2 text-xs text-[var(--text-tertiary)]">{r.description || r.content}</p>}
              </div>
              <Button variant="ghost" size="icon-sm" onClick={() => remove(r)} aria-label="Supprimer" className="opacity-0 group-hover:opacity-100"><Trash2 size={12} /></Button>
            </Card>
          ))}
        </div>
      ) : (
        <p className="py-8 text-center text-sm text-[var(--text-tertiary)]">Aucune ressource pour {project.name}. Ajoute un lien ci-dessus, ou via le « + » du projet dans la barre latérale.</p>
      )}
    </div>
  )
}

function SessionsTab({ project, sessions }) {
  const weekStart = getWeekStart()
  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0,0,0,0)

  const projectSessions = sessions
    .filter(s => s.projectId === project.id)
    .sort((a, b) => new Date(b.date) - new Date(a.date))

  const weekTotal = projectSessions.filter(s => new Date(s.date) >= weekStart).reduce((sum, s) => sum + s.duration, 0)
  const monthTotal = projectSessions.filter(s => new Date(s.date) >= monthStart).reduce((sum, s) => sum + s.duration, 0)
  const allTotal = projectSessions.reduce((sum, s) => sum + s.duration, 0)

  return (
    <div className="p-4 space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Cette semaine', value: formatDuration(weekTotal) },
          { label: 'Ce mois', value: formatDuration(monthTotal) },
          { label: 'Total', value: formatDuration(allTotal) },
        ].map(stat => (
          <Card key={stat.label} className="p-3 text-center">
            <p className="font-mono text-xl font-medium tabular" style={{ color: accentText(project.color) }}>{stat.value}</p>
            <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5">{stat.label}</p>
          </Card>
        ))}
      </div>

      {projectSessions.length === 0 ? (
        <EmptyState icon={Clock} title="Aucune session enregistrée" description="Lance une session depuis le dashboard pour suivre ton temps sur ce projet." />
      ) : (
        <div className="flex flex-col gap-2">
          {projectSessions.map(s => (
            <div key={s.id} className="flex items-center gap-3 px-4 py-3 rounded-xl" style={{ background: 'var(--c-card)', border: '1px solid var(--c-border)' }}>
              <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: project.color }} />
              <span className="flex-1 text-sm text-[var(--text-secondary)] truncate">{s.note || '—'}</span>
              <span className="font-mono text-sm font-medium" style={{ color: accentText(project.color) }}>{formatDuration(s.duration)}</span>
              <span className="font-mono text-[10px] text-[var(--text-tertiary)] flex-shrink-0">
                {new Date(s.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function ProjetPage({ projectId, onNavigate, onStartTask }) {
  const { state, dispatch } = useStore()
  const [activeTab, setActiveTab] = useState('kanban')
  const [importOpen, setImportOpen] = useState(false)
  const [importSuccessCount, setImportSuccessCount] = useState(null)
  const [quickTitle, setQuickTitle] = useState('')
  const [openedAt] = useState(() => Date.now())

  const project = state.projects.find(p => p.id === projectId)
  if (!project) return null

  const defaultSlug = ID_TO_SLUG[projectId]

  const projectTasks = state.tasks.filter(t => t.projectId === project.id)

  function handleTaskUpdate(id, updates) {
    dispatch({ type: 'UPDATE_TASK', payload: { id, ...updates } })
  }

  function handleTaskCreate(data) {
    dispatch({ type: 'ADD_TASK', payload: { ...data, projectId: project.id } })
    toast.success('Tâche créée')
  }

  function handleTaskDelete(id) {
    const snapshot = state.tasks.find(t => t.id === id)
    dispatch({ type: 'DELETE_TASK', payload: id })
    if (snapshot) toastUndo('Tâche supprimée', () => dispatch({ type: 'RESTORE_ITEMS', payload: { tasks: [snapshot] } }))
  }

  const today = new Date().toISOString().slice(0, 10)
  const weekAgo = openedAt - 7 * 86400000
  const openTasks = projectTasks.filter(t => t.status !== 'done')
  const stats = [
    { label: 'Ouvertes', value: openTasks.length },
    { label: 'Terminées · 7 j', value: projectTasks.filter(t => t.completedAt && new Date(t.completedAt).getTime() >= weekAgo).length },
    { label: 'Focus · 7 j', value: formatDuration(state.sessions.filter(x => x.projectId === project.id && new Date(x.date).getTime() >= weekAgo).reduce((sum, x) => sum + (x.duration || 0), 0)) },
    { label: 'En retard', value: openTasks.filter(t => t.dueDate && t.dueDate < today).length, alert: true },
  ]
  const counts = {
    kanban: openTasks.length,
    notes: (project.notes || []).length,
    ressources: state.resources.filter(r => r.projectId === project.id).length,
    sessions: state.sessions.filter(x => x.projectId === project.id).length,
  }
  const nextTask = openTasks.find(t => t.status === 'inprogress') || openTasks.find(t => t.today) || openTasks.find(t => t.impact === 'high') || openTasks[0]

  function quickAdd(e) {
    if (e.key !== 'Enter' || !quickTitle.trim()) return
    handleTaskCreate({ title: quickTitle.trim(), status: 'todo', impact: 'low', today: false, dueDate: null, notes: '' })
    setQuickTitle('')
  }

  return (
    <div className="flex min-h-screen flex-col gap-5">
      {/* En-tête de l'espace projet */}
      <Card className="space-y-4 border-0 p-5">
        <div className="flex flex-wrap items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => onNavigate('projets')} aria-label="Tous les projets" className="text-[var(--text-tertiary)]">
            <ArrowLeft size={16} />
          </Button>
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-2xl" style={{ background: project.color + '30' }}>
            {project.emoji}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-[34px] font-semibold leading-tight tracking-tight text-[var(--text-primary)]">{project.name}</h1>
            <p className="text-sm text-[var(--text-tertiary)]">{TIER_LABELS[project.tier]}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {nextTask && (
              <Button onClick={() => onStartTask?.(project.id, nextTask.id)} title={`Lancer le chrono sur « ${nextTask.title} »`}>
                <Play size={14} /> Focus
              </Button>
            )}
            <Button variant="outline" onClick={() => { setImportOpen(true); setImportSuccessCount(null) }}>
              <FileJson size={14} /> Import bulk
            </Button>
          </div>
        </div>

        <NorthStarBanner project={project} />

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {stats.map(st => (
            <div key={st.label} className="rounded-2xl bg-[var(--bg-card-soft)] px-4 py-3">
              <p className="text-[11px] text-[var(--text-tertiary)]">{st.label}</p>
              <p className="text-2xl font-semibold tracking-tight" style={{ color: st.alert && st.value ? 'var(--red-deep)' : 'var(--text-primary)' }}>{st.value}</p>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3 rounded-full bg-[var(--bg-card-soft)] px-4 py-1">
          <Plus size={15} className="shrink-0 text-[var(--text-tertiary)]" />
          <Input
            value={quickTitle}
            onChange={e => setQuickTitle(e.target.value)}
            onKeyDown={quickAdd}
            placeholder={`Ajouter une tâche à ${project.name}… (Entrée)`}
            className="h-10 flex-1 border-transparent bg-transparent px-0 shadow-none focus:border-transparent focus:bg-transparent focus:ring-0"
          />
        </div>

        {importSuccessCount !== null && (
          <div className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs" style={{ background: 'var(--green-bg)', color: 'var(--green-deep)' }}>
            ✓ {importSuccessCount} élément{importSuccessCount > 1 ? 's' : ''} importé{importSuccessCount > 1 ? 's' : ''} dans {project.name}
          </div>
        )}
      </Card>

      {/* Onglets en pilules */}
      <div className="flex flex-wrap gap-1 self-start rounded-full bg-[var(--bg-sidebar)] p-1">
        {TABS.map(tab => (
          <button
            type="button"
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-colors ${activeTab === tab.id ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-[var(--shadow-card)]' : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'}`}
          >
            <tab.Icon size={14} />
            {tab.label}
            {counts[tab.id] !== undefined && <span className="rounded-full bg-[rgba(var(--ink),0.07)] px-1.5 text-[10px] tabular-nums">{counts[tab.id]}</span>}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 w-full">
        {activeTab === 'kanban' && (
          <div>
            <ViewContainer
              contextId={`project:${project.id}`}
              tasks={projectTasks}
              projects={state.projects}
              onTaskUpdate={handleTaskUpdate}
              onTaskCreate={handleTaskCreate}
              onTaskDelete={handleTaskDelete}
            />
          </div>
        )}
        {activeTab === 'dashboard' && (
          <DashboardTab project={project} tasks={state.tasks} sessions={state.sessions} onStartTask={onStartTask} />
        )}
        {activeTab === 'notes' && <NotesTab project={project} />}
        {activeTab === 'ressources' && <ResourcesTab project={project} />}
        {activeTab === 'sessions' && <SessionsTab project={project} sessions={state.sessions} />}
      </div>

      <Drawer isOpen={importOpen} onClose={() => setImportOpen(false)} title={`Import bulk — ${project.name}`}>
        <BulkImportInterface
          defaultProjectSlug={defaultSlug}
          onCancel={() => setImportOpen(false)}
          onImportSuccess={count => {
            setImportSuccessCount(count)
            setImportOpen(false)
          }}
        />
      </Drawer>
    </div>
  )
}
