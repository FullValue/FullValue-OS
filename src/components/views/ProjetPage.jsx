import { useState } from 'react'
import { ArrowLeft, Clock, CheckSquare, BarChart2, Kanban, FileText, Calendar, Flag, Edit2, Check, Plus, Trash2, FileJson } from 'lucide-react'
import { useStore } from '@/store/useStore'
import ViewContainer from '@/views/ViewContainer'
import Drawer from '@/components/ui/Drawer'
import BulkImportInterface from '@/components/import/BulkImportInterface'
import { ID_TO_SLUG } from '@/hooks/useBulkImport'

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

  function handleProgress(e) {
    dispatch({ type: 'UPDATE_PROJECT', payload: { id: project.id, northStarProgress: Number(e.target.value) } })
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
          <input
            autoFocus
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') { setDraft(project.northStar); setEditing(false) } }}
            className="flex-1 bg-transparent text-sm font-medium focus:outline-none min-w-0"
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
          <div className="w-24 h-1.5 bg-white/8 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${project.northStarProgress}%`, background: project.color }}
            />
          </div>
          <span className="font-mono text-[11px]" style={{ color: project.color }}>{project.northStarProgress}%</span>
        </div>

        {/* Slider trigger */}
        <input
          type="range"
          min="0"
          max="100"
          value={project.northStarProgress}
          onChange={handleProgress}
          className="w-16 h-1 opacity-40 hover:opacity-80 transition-opacity cursor-pointer"
          style={{ accentColor: project.color }}
        />

        <button
          onClick={() => { setDraft(project.northStar); setEditing(!editing) }}
          className="p-1 rounded transition-colors hover:bg-white/10 text-white/30"
        >
          {editing ? <Check size={12} style={{ color: project.color }} /> : <Edit2 size={12} />}
        </button>
      </div>
    </div>
  )
}

function DashboardTab({ project, tasks, sessions }) {
  const weekStart = getWeekStart()
  const projectTasks = tasks.filter(t => t.projectId === project.id)
  const activeTasks = projectTasks.filter(t => t.status !== 'done')
  const doneTasks = projectTasks.filter(t => t.status === 'done')
  const todayTasks = projectTasks.filter(t => t.today && t.status !== 'done')
  const ship80Tasks = projectTasks.filter(t => t.ship80 && t.status !== 'done')
  const weekSessions = sessions.filter(s => s.projectId === project.id && new Date(s.date) >= weekStart)
  const weekTime = weekSessions.reduce((sum, s) => sum + s.duration, 0)
  const overdueTasks = projectTasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'done')

  return (
    <div className="p-4 space-y-4">
      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-xl p-3" style={{ background: 'var(--c-card)', border: '1px solid var(--c-border)' }}>
          <div className="flex items-center gap-1.5 mb-2">
            <CheckSquare size={12} className="text-white/30" />
            <span className="text-[10px] text-white/30 uppercase tracking-wider">Tâches actives</span>
          </div>
          <p className="font-mono text-2xl font-medium text-white">{activeTasks.length}</p>
          <p className="text-[10px] text-white/25 mt-0.5">{doneTasks.length} terminées</p>
        </div>

        <div className="rounded-xl p-3" style={{ background: 'var(--c-card)', border: '1px solid var(--c-border)' }}>
          <div className="flex items-center gap-1.5 mb-2">
            <Clock size={12} className="text-white/30" />
            <span className="text-[10px] text-white/30 uppercase tracking-wider">Cette semaine</span>
          </div>
          <p className="font-mono text-2xl font-medium text-white">{formatDuration(weekTime)}</p>
          <p className="text-[10px] text-white/25 mt-0.5">{weekSessions.length} session{weekSessions.length > 1 ? 's' : ''}</p>
        </div>

        <div className="rounded-xl p-3" style={{ background: 'var(--c-card)', border: '1px solid var(--c-border)' }}>
          <div className="flex items-center gap-1.5 mb-2">
            <span className="text-[10px]">📌</span>
            <span className="text-[10px] text-white/30 uppercase tracking-wider">Aujourd'hui</span>
          </div>
          <p className="font-mono text-2xl font-medium text-white">{todayTasks.length}</p>
          <p className="text-[10px] text-white/25 mt-0.5">priorité du jour</p>
        </div>

        <div className="rounded-xl p-3" style={{ background: 'var(--c-card)', border: '1px solid var(--c-border)' }}>
          <div className="flex items-center gap-1.5 mb-2">
            <span className="text-[10px]">🚀</span>
            <span className="text-[10px] text-white/30 uppercase tracking-wider">Ship 80%</span>
          </div>
          <p className="font-mono text-2xl font-medium" style={{ color: '#FFC1E0' }}>{ship80Tasks.length}</p>
          <p className="text-[10px] text-white/25 mt-0.5">à livrer vite</p>
        </div>
      </div>

      {/* Overdue alert */}
      {overdueTasks.length > 0 && (
        <div className="rounded-xl px-4 py-3 flex items-center gap-2" style={{ background: '#F87171' + '10', border: '1px solid ' + '#F87171' + '30' }}>
          <span className="text-[12px]">⚠</span>
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

      {/* Recent sessions */}
      {weekSessions.length > 0 && (
        <div>
          <p className="text-[10px] text-white/30 uppercase tracking-wider mb-2">Sessions cette semaine</p>
          <div className="flex flex-col gap-2">
            {weekSessions.slice(0, 5).map(s => (
              <div key={s.id} className="flex items-center gap-3 px-3 py-2 rounded-xl" style={{ background: 'var(--c-card)', border: '1px solid rgba(255,255,255,0.04)' }}>
                <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: project.color }} />
                <span className="flex-1 text-xs text-white/60 truncate">{s.note || '—'}</span>
                <span className="font-mono text-[10px] text-white/30 flex-shrink-0">{formatDuration(s.duration)}</span>
                <span className="font-mono text-[10px] text-white/20 flex-shrink-0">
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
  }

  function saveNote(noteId) {
    dispatch({ type: 'UPDATE_PROJECT', payload: { id: project.id, notes: notes.map(n => n.id === noteId ? { ...n, content: draft } : n) } })
    setEditing(null)
  }

  function deleteNote(noteId) {
    dispatch({ type: 'UPDATE_PROJECT', payload: { id: project.id, notes: notes.filter(n => n.id !== noteId) } })
  }

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between mb-1">
        <p className="text-[10px] text-white/30 uppercase tracking-wider">{notes.length} note{notes.length > 1 ? 's' : ''}</p>
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg transition-colors"
          style={{ background: project.color + '18', color: project.color }}
        >
          <Plus size={12} /> Nouvelle note
        </button>
      </div>

      {showNew && (
        <div className="rounded-xl p-3" style={{ background: 'var(--c-card)', border: '1px solid var(--c-border)' }}>
          <input
            autoFocus
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') addNote(); if (e.key === 'Escape') setShowNew(false) }}
            placeholder="Titre de la note..."
            className="w-full bg-transparent text-sm text-white/80 focus:outline-none"
          />
          <div className="flex gap-2 mt-2">
            <button onClick={addNote} className="text-xs px-3 py-1 rounded-lg text-white font-medium" style={{ background: project.color }}>Créer</button>
            <button onClick={() => setShowNew(false)} className="text-xs px-3 py-1 rounded-lg bg-white/5 text-white/40">Annuler</button>
          </div>
        </div>
      )}

      {notes.length === 0 && !showNew && (
        <div className="text-center py-16">
          <p className="text-3xl mb-3">📝</p>
          <p className="text-white/30 text-sm">Aucune note pour ce projet</p>
        </div>
      )}

      {notes.map(note => (
        <div key={note.id} className="rounded-xl overflow-hidden group" style={{ background: 'var(--c-card)', border: '1px solid var(--c-border)' }}>
          <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: editing === note.id ? '1px solid var(--c-border)' : 'none' }}>
            <span className="flex-1 text-sm font-medium text-white/80">{note.title}</span>
            <span className="font-mono text-[10px] text-white/25">
              {new Date(note.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
            </span>
            <button
              onClick={() => { setEditing(editing === note.id ? null : note.id); setDraft(note.content) }}
              className="text-[10px] px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 transition-colors"
            >
              {editing === note.id ? 'Fermer' : 'Éditer'}
            </button>
            <button onClick={() => deleteNote(note.id)} className="opacity-0 group-hover:opacity-100 p-1 text-white/20 hover:text-red transition-all">
              <Trash2 size={12} />
            </button>
          </div>

          {editing === note.id ? (
            <div className="p-4">
              <textarea
                autoFocus
                value={draft}
                onChange={e => setDraft(e.target.value)}
                rows={8}
                placeholder="Écris ta note en Markdown..."
                className="w-full bg-transparent text-sm text-white/70 focus:outline-none resize-none font-mono leading-relaxed"
              />
              <button onClick={() => saveNote(note.id)} className="mt-2 text-xs px-3 py-1.5 rounded-lg text-white font-medium transition-colors" style={{ background: project.color }}>
                Enregistrer
              </button>
            </div>
          ) : note.content ? (
            <div className="px-4 py-3">
              <p className="text-white/50 text-xs leading-relaxed whitespace-pre-wrap line-clamp-3">{note.content}</p>
            </div>
          ) : null}
        </div>
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
          <div key={stat.label} className="rounded-xl p-3 text-center" style={{ background: 'var(--c-card)', border: '1px solid var(--c-border)' }}>
            <p className="font-mono text-xl font-medium" style={{ color: project.color }}>{stat.value}</p>
            <p className="text-[10px] text-white/30 mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {projectSessions.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-3xl mb-3">⏱</p>
          <p className="text-white/30 text-sm">Aucune session enregistrée</p>
        </div>
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

export default function ProjetPage({ projectId, onNavigate }) {
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
  }

  function handleTaskDelete(id) {
    dispatch({ type: 'DELETE_TASK', payload: id })
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* North Star banner */}
      <NorthStarBanner project={project} />

      {/* Page header */}
      <div className="px-4 pt-4 pb-0 max-w-5xl mx-auto w-full">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => onNavigate('projets')}
            className="p-1.5 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/8 transition-all"
          >
            <ArrowLeft size={16} />
          </button>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0" style={{ background: project.color + '20', border: `1px solid ${project.color}30` }}>
            {project.emoji}
          </div>
          <div className="flex-1">
            <h1 className="text-lg font-semibold text-white leading-none">{project.name}</h1>
            <span className="text-[11px] text-white/30">{TIER_LABELS[project.tier]}</span>
          </div>
          <button
            onClick={() => { setImportOpen(true); setImportSuccessCount(null) }}
            className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl transition-all"
            style={{ background: project.color + '15', color: project.color, border: `1px solid ${project.color}25` }}
          >
            <FileJson size={13} />
            Import bulk
          </button>
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
            <button
              key={tab.id}
              onClick={() => !tab.soon && setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-t-lg transition-all relative ${
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
            </button>
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
          <DashboardTab project={project} tasks={state.tasks} sessions={state.sessions} />
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
