import { useState, useRef, useEffect } from 'react'
import { ArrowLeft, Clock, CheckSquare, BarChart2, Kanban, FileText, Calendar, Flag, Edit2, Check, Plus, Trash2, FileJson, Play, CalendarDays } from 'lucide-react'
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
  { id: 'kanban', label: 'Kanban', Icon: Kanban },
  { id: 'dashboard', label: 'Dashboard', Icon: BarChart2 },
  { id: 'notes', label: 'Notes', Icon: FileText },
  { id: 'sessions', label: 'Sessions', Icon: Calendar },
]

function NorthStarBanner({ project }) {
  const { dispatch } = useStore()
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
      className="px-4 py-3 flex items-center gap-3 border-b"
      style={{
        background: project.color + '0D',
        borderColor: project.color + '25',
      }}
    >
      <Flag size={14} style={{ color: project.color }} className="flex-shrink-0" />
      <div className="flex-1 min-w-0 flex items-center gap-2">
        {editing ? (
          <Input
            autoFocus
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') { setDraft(project.northStar); setEditing(false) } }}
            className="h-7 min-w-0 flex-1 rounded-lg bg-transparent px-2 text-sm font-medium shadow-none focus:bg-transparent focus:ring-0"
            style={{ color: project.color }}
          />
        ) : (
          <span className="text-sm font-medium truncate" style={{ color: project.color }}>
            North Star : {project.northStar || 'Définir un objectif…'}
          </span>
        )}
      </div>

      {/* Progress badge */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="flex items-center gap-1.5">
          <Progress value={project.northStarProgress} color={project.color} className="w-24" />
          <span className="font-mono text-[11px] tabular" style={{ color: project.color }}>{project.northStarProgress}%</span>
        </div>

        {/* Slider trigger */}
        <Slider
          min={0}
          max={100}
          step={1}
          value={[project.northStarProgress]}
          onValueChange={([value]) => handleProgress(value)}
          className="w-16 opacity-60 transition-opacity hover:opacity-100"
          aria-label="Progression North Star"
        />

        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => { setDraft(project.northStar); setEditing(!editing) }}
        >
          {editing ? <Check size={12} style={{ color: project.color }} /> : <Edit2 size={12} />}
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
            className="h-auto w-full justify-start rounded-none px-4 py-2.5 text-left text-xs transition-colors hover:bg-white/5"
            style={{ color: 'var(--text-tertiary)' }}>
            — Sans tâche spécifique
          </Button>
          {sorted.map(task => {
            const icon = task.urgency === 'critical' ? '🚨' : task.urgency === 'very-urgent' ? '🔥' : task.urgency === 'urgent' ? '⚡' : null
            return (
              <Button key={task.id} type="button" variant="ghost" onClick={() => onStart(project.id, task.id)}
                className="h-auto w-full justify-start gap-2 rounded-none px-4 py-2.5 text-left text-xs transition-colors hover:bg-white/5"
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
            <h2 className="text-xl font-bold leading-tight mb-1" style={{ color: project.color }}>
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
                style={{ color: 'var(--text-tertiary)', border: '1px dashed rgba(255,255,255,0.1)' }}>
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
              {s.Icon ? <s.Icon size={12} className="text-white/30" /> : <span className="text-[10px]">{s.emoji}</span>}
              <span className="text-[10px] text-white/30 uppercase tracking-wider">{s.label}</span>
            </div>
            <p className="font-mono text-2xl font-medium tabular" style={{ color: s.color || 'var(--text-primary)' }}>{s.value}</p>
            <p className="text-[10px] text-white/25 mt-0.5">{s.sub}</p>
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
              <span key={t.id} className="text-[10px] text-white/40 truncate max-w-[200px]">{t.title}</span>
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
                <span className="font-mono text-[10px] flex-shrink-0" style={{ color: 'rgba(255,255,255,0.2)' }}>
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
        <p className="text-[10px] text-white/30 uppercase tracking-wider">{notes.length} note{notes.length > 1 ? 's' : ''}</p>
        <Button
          size="sm"
          onClick={() => setShowNew(true)}
          style={{ background: project.color + '18', color: project.color }}
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
            <Button size="sm" onClick={addNote} className="text-white" style={{ background: project.color }}>Créer</Button>
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
            <span className="flex-1 text-sm font-medium text-white/80">{note.title}</span>
            <span className="font-mono text-[10px] text-white/25">
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
              className="opacity-0 group-hover:opacity-100 text-white/20 hover:text-red"
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
              <Button size="sm" onClick={() => saveNote(note.id)} className="mt-2 text-white" style={{ background: project.color }}>
                Enregistrer
              </Button>
            </div>
          ) : note.content ? (
            <div className="px-4 py-3">
              <p className="text-white/50 text-xs leading-relaxed whitespace-pre-wrap line-clamp-3">{note.content}</p>
            </div>
          ) : null}
        </Card>
      ))}
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
            <p className="font-mono text-xl font-medium tabular" style={{ color: project.color }}>{stat.value}</p>
            <p className="text-[10px] text-white/30 mt-0.5">{stat.label}</p>
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
              <span className="flex-1 text-sm text-white/65 truncate">{s.note || '—'}</span>
              <span className="font-mono text-sm font-medium" style={{ color: project.color }}>{formatDuration(s.duration)}</span>
              <span className="font-mono text-[10px] text-white/25 flex-shrink-0">
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

  return (
    <div className="flex flex-col min-h-screen">
      {/* North Star banner */}
      <NorthStarBanner project={project} />

      {/* Page header */}
      <div className="px-4 pt-4 pb-0 max-w-5xl mx-auto w-full">
        <div className="flex items-center gap-3 mb-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onNavigate('projets')}
            className="text-white/30 hover:text-white/70"
          >
            <ArrowLeft size={16} />
          </Button>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0" style={{ background: project.color + '20', border: `1px solid ${project.color}30` }}>
            {project.emoji}
          </div>
          <div className="flex-1">
            <h1 className="text-lg font-semibold text-white leading-none">{project.name}</h1>
            <span className="text-[11px] text-white/30">{TIER_LABELS[project.tier]}</span>
          </div>
          <Button
            size="sm"
            onClick={() => { setImportOpen(true); setImportSuccessCount(null) }}
            className="rounded-xl"
            style={{ background: project.color + '15', color: project.color, border: `1px solid ${project.color}25` }}
          >
            <FileJson size={13} />
            Import bulk
          </Button>
        </div>

        {importSuccessCount !== null && (
          <div className="mb-4 flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs"
            style={{ background: 'rgba(168,230,189,0.1)', border: '1px solid rgba(168,230,189,0.25)', color: '#A8E6BD' }}>
            ✓ {importSuccessCount} élément{importSuccessCount > 1 ? 's' : ''} importé{importSuccessCount > 1 ? 's' : ''} dans {project.name}
          </div>
        )}

        {/* Tabs */}
        <div className="flex items-center gap-1 border-b border-white/6">
          {TABS.map(tab => (
            <Button
              type="button"
              variant="ghost"
              key={tab.id}
              onClick={() => !tab.soon && setActiveTab(tab.id)}
              className={`relative h-auto gap-1.5 rounded-t-lg px-3 py-2 text-xs font-medium transition-all ${
                tab.soon
                  ? 'text-white/20 cursor-default'
                  : activeTab === tab.id
                  ? 'text-white border-b-2 -mb-px'
                  : 'text-white/40 hover:text-white/70'
              }`}
              style={activeTab === tab.id && !tab.soon ? { borderBottomColor: project.color, color: project.color } : {}}
            >
              <tab.Icon size={12} />
              {tab.label}
              {tab.soon && (
                <span className="text-[9px] bg-white/8 text-white/25 px-1 py-0.5 rounded ml-0.5">Bientôt</span>
              )}
            </Button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 max-w-5xl mx-auto w-full">
        {activeTab === 'kanban' && (
          <div className="p-4">
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
