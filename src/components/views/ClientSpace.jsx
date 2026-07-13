import { useState, useRef, useEffect } from 'react'
import {
  Plus, Settings, LayoutDashboard, Kanban, FileText, Paperclip,
  Timer, Receipt, Trash2, Archive, Check, X, ExternalLink,
  CheckSquare, Clock, StickyNote, Calendar, Upload, Zap, Play, CalendarDays, ChevronRight,
} from 'lucide-react'
import { useStore } from '@/store/useStore'
import ViewContainer from '@/views/ViewContainer'
import Drawer from '@/components/ui/Drawer'
import FileUploader from '@/components/files/FileUploader'
import FilePreview from '@/components/files/FilePreview'
import YouTubeThumbnail from '@/components/youtube/YouTubeThumbnail'
import YouTubeEmbed from '@/components/youtube/YouTubeEmbed'
import AddYouTubeForm from '@/components/youtube/AddYouTubeForm'
import BulkImportInterface from '@/components/import/BulkImportInterface'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/select'
import { Card } from '@/components/ui/card'
import { UIBadge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/empty-state'
import { toast, toastUndo } from '@/lib/toast'

// ─── Constants ────────────────────────────────────────────────────────────────

const ACCENT_COLORS = [
  '#8B7CFF', '#A8E6BD', '#FFD66B', '#FFB088',
  '#F87171', '#FFC1E0', '#A8D4F0', '#7DD3D8',
]

const STATUS_LABELS = {
  prospect: { label: 'Prospect', color: '#A8D4F0' },
  onboarding: { label: 'Onboarding', color: '#FFD66B' },
  active: { label: 'Actif', color: '#A8E6BD' },
  paused: { label: 'Pause', color: '#FFB088' },
  completed: { label: 'Terminé', color: '#8B7CFF' },
  archived: { label: 'Archivé', color: '#5C5A58' },
}

const ACTIVITY_TYPES = ['E-commerce', 'Service B2B', 'Santé', 'Restauration', 'Retail', 'Tech', 'Immobilier', 'Autre']

const CLIENT_TABS = [
  { id: 'dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { id: 'kanban', label: 'Kanban', Icon: Kanban },
  { id: 'notes', label: 'Notes', Icon: FileText },
  { id: 'hub', label: 'Hub Docs', Icon: Paperclip },
  { id: 'sessions', label: 'Sessions', Icon: Timer },
  { id: 'facturation', label: 'Facturation', Icon: Receipt },
]

const DOC_TYPES = ['doc', 'pdf', 'lien', 'spreadsheet', 'design']
const DOC_ICONS = { doc: '📝', pdf: '📕', lien: '🔗', spreadsheet: '📊', design: '🎨' }

const INVOICE_STATUSES = {
  to_emit: { label: 'À émettre', color: '#FFD66B' },
  sent: { label: 'Envoyée', color: '#A8D4F0' },
  paid: { label: 'Payée', color: '#A8E6BD' },
  overdue: { label: 'En retard', color: '#F87171' },
}

// Mapping statut → variante sémantique de <UIBadge> (le sens dicte la couleur)
const STATUS_BADGE_VARIANT = {
  prospect: 'violet',
  onboarding: 'yellow',
  active: 'green',
  paused: 'orange',
  completed: 'blue',
  archived: 'default',
}

const INVOICE_STATUS_VARIANT = {
  to_emit: 'yellow',
  sent: 'blue',
  paid: 'green',
  overdue: 'red',
}

function formatDuration(s) {
  if (!s) return '0m'
  const h = Math.floor(s / 3600); const m = Math.floor((s % 3600) / 60)
  return h > 0 ? `${h}h${m > 0 ? m + 'm' : ''}` : `${m}m`
}

function formatMoney(n) {
  return n?.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0 }) ?? '0 €'
}

function getWeekStart() {
  const d = new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d
}
function getMonthStart() {
  const d = new Date(); d.setDate(1); d.setHours(0,0,0,0); return d
}

// ─── Stat Widget ──────────────────────────────────────────────────────────────

function Widget({ icon, label, main, sub, accent, onClick }) {
  return (
    <button
      onClick={onClick}
      className="rounded-xl p-4 text-left w-full transition-all hover:scale-[1.02] focus:outline-none"
      style={{ background: 'var(--c-card)', border: '1px solid var(--c-border)' }}
    >
      <div className="flex items-center gap-2 mb-3">
        <span className="text-base">{icon}</span>
        <span className="text-[10px] text-white/30 uppercase tracking-wider font-medium">{label}</span>
      </div>
      <p className="font-mono text-2xl font-semibold leading-none" style={{ color: accent }}>{main}</p>
      <p className="text-[11px] text-white/30 mt-1">{sub}</p>
    </button>
  )
}

// ─── Inline date editor ───────────────────────────────────────────────────────

function InlineDateEditor({ value, onSave, placeholder, color }) {
  const [editing, setEditing] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => { if (editing) inputRef.current?.focus() }, [editing])

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="date"
        defaultValue={value || ''}
        onBlur={e => { onSave(e.target.value || null); setEditing(false) }}
        onKeyDown={e => { if (e.key === 'Escape') setEditing(false) }}
        className="bg-transparent text-xs font-mono focus:outline-none"
        style={{ color: 'var(--text-secondary)' }}
      />
    )
  }

  if (!value) {
    return (
      <button onClick={() => setEditing(true)} className="text-[11px] transition-colors hover:opacity-70"
        style={{ color: 'var(--text-tertiary)' }}>
        {placeholder}
      </button>
    )
  }

  return (
    <button onClick={() => setEditing(true)} className="text-[11px] font-mono transition-colors hover:opacity-70"
      style={{ color: color || 'var(--text-secondary)' }}>
      {new Date(value).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
    </button>
  )
}

// ─── Session task picker ──────────────────────────────────────────────────────

function ClientSessionPicker({ client, tasks, accent, onStart, onClose }) {
  const active = tasks.filter(t => t.clientId === client.id && t.status !== 'done')
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
          <button onClick={() => onStart(null, null)}
            className="w-full text-left px-4 py-2.5 text-xs transition-colors hover:bg-white/5"
            style={{ color: 'var(--text-tertiary)' }}>
            — Sans tâche spécifique
          </button>
          {sorted.map(task => {
            const icon = task.urgency === 'critical' ? '🚨' : task.urgency === 'very-urgent' ? '🔥' : task.urgency === 'urgent' ? '⚡' : null
            return (
              <button key={task.id} onClick={() => onStart(null, task.id)}
                className="w-full text-left px-4 py-2.5 text-xs transition-colors hover:bg-white/5 flex items-center gap-2"
                style={{ borderTop: '1px solid var(--c-border)', color: 'var(--text-secondary)' }}>
                {icon && <span className="flex-shrink-0">{icon}</span>}
                <span className="truncate flex-1">{task.title}</span>
                {task.status === 'inprogress' && (
                  <UIBadge variant="yellow" className="flex-shrink-0 rounded-full">En cours</UIBadge>
                )}
              </button>
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
    critical:      { icon: '🚨', color: '#DC2626', label: 'Critique' },
    'very-urgent': { icon: '🔥', color: '#CC5500', label: 'Très urgent' },
    urgent:        { icon: '⚡', color: '#B45309', label: 'Urgent' },
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

// ─── Deadlines Panel ─────────────────────────────────────────────────────────

function DeadlinesPanel({ tasks }) {
  const { state } = useStore()
  const now = new Date()
  const DAY_ABBR = ['DIM', 'LUN', 'MAR', 'MER', 'JEU', 'VEN', 'SAM']

  const upcoming = [...tasks]
    .filter(t => t.dueDate && t.status !== 'done')
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
    .slice(0, 7)

  const urgentCount = upcoming.filter(t => Math.ceil((new Date(t.dueDate) - now) / 86400000) <= 1).length

  return (
    <div className="rounded-xl overflow-hidden h-full flex flex-col"
      style={{ background: 'var(--c-card)', border: '1px solid var(--c-border)' }}>
      <div className="px-4 py-3 flex items-center justify-between flex-shrink-0"
        style={{ borderBottom: '1px solid var(--c-border)' }}>
        <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Prochaines deadlines</span>
        <div className="flex items-center gap-2">
          {urgentCount > 0 && (
            <UIBadge variant="red" className="rounded-full">
              {urgentCount} urgente{urgentCount > 1 ? 's' : ''}
            </UIBadge>
          )}
          <ChevronRight size={14} style={{ color: 'var(--text-tertiary)' }} />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {upcoming.map(task => {
          const due = new Date(task.dueDate)
          const daysLeft = Math.ceil((due - now) / 86400000)
          const isRed = daysLeft <= 1
          const dayStr = DAY_ABBR[due.getDay()]
          const dateNum = due.getDate()
          const project = state.projects.find(p => p.id === task.projectId)
          const dotColor = project?.color || '#8B7CFF'
          return (
            <div key={task.id} className="flex items-center gap-3 px-4 py-2.5"
              style={{ borderBottom: '1px solid var(--c-border)' }}>
              <div className="w-12 flex-shrink-0 flex items-center gap-1">
                <span className="text-[11px] font-bold"
                  style={{ color: isRed ? '#F87171' : 'var(--text-tertiary)' }}>
                  {dayStr}.
                </span>
                {!isRed && (
                  <span className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>{dateNum}</span>
                )}
              </div>
              <span className="flex-1 text-xs truncate"
                style={{ color: isRed ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                {task.title}
              </span>
              {(task.urgency === 'urgent' || task.urgency === 'very-urgent') && (
                <span className="text-sm flex-shrink-0">⚡</span>
              )}
              {task.ship80 && (
                <UIBadge variant="violet" className="flex-shrink-0">80%</UIBadge>
              )}
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: dotColor }} />
            </div>
          )
        })}
        {upcoming.length === 0 && (
          <p className="px-4 py-8 text-xs text-center" style={{ color: 'var(--text-tertiary)' }}>
            Aucune deadline à venir
          </p>
        )}
      </div>
    </div>
  )
}

// ─── Dashboard Tab ────────────────────────────────────────────────────────────

function DashboardTab({ client, tasks, sessions, clientNotes, clientDocuments, clientInvoices, appointments, onTabChange, accent, onStartTask }) {
  const { dispatch } = useStore()
  const [showPicker, setShowPicker] = useState(false)

  const weekStart = getWeekStart()
  const clientTasks = tasks.filter(t => t.clientId === client.id)
  const activeTasks = clientTasks.filter(t => t.status !== 'done')
  const doneTasks = clientTasks.filter(t => t.status === 'done')
  const clientSessions = sessions.filter(s => s.clientId === client.id)
  const weekSessions = clientSessions.filter(s => new Date(s.date) >= weekStart)
  const weekTime = weekSessions.reduce((a, s) => a + s.duration, 0)
  const notes = clientNotes.filter(n => n.clientId === client.id)
  const docs = clientDocuments.filter(d => d.clientId === client.id)
  const now = new Date()
  const upcomingRdv = appointments.filter(a => a.clientId === client.id && new Date(a.date) >= now && new Date(a.date) <= new Date(now.getTime() + 7 * 86400000))
  const pendingInvoices = clientInvoices.filter(i => i.clientId === client.id && i.status === 'to_emit')
  const pendingAmount = pendingInvoices.reduce((a, i) => a + (i.amountTtc || 0), 0)
  const overdueTasks = clientTasks.filter(t => t.dueDate && new Date(t.dueDate) < now && t.status !== 'done')

  const URGENCY_ORDER = { critical: 0, 'very-urgent': 1, urgent: 2 }
  const urgentTasks = clientTasks
    .filter(t => t.urgency && t.status !== 'done')
    .sort((a, b) => (URGENCY_ORDER[a.urgency] ?? 9) - (URGENCY_ORDER[b.urgency] ?? 9))

  const daysSigned = client.startDate
    ? Math.floor((new Date() - new Date(client.startDate)) / 86400000)
    : null

  const daysLeft = client.deadline
    ? Math.ceil((new Date(client.deadline) - new Date()) / 86400000)
    : null
  const deadlineColor = daysLeft == null ? null : daysLeft < 0 ? '#F87171' : daysLeft <= 7 ? '#FFD66B' : accent

  function handleStartSession(_, taskId) {
    setShowPicker(false)
    onStartTask?.(null, taskId)
  }

  return (
    <div className="p-4 space-y-4">

      {/* ── Hero card ─────────────────────────────────────────────────────── */}
      <div className="rounded-2xl p-5" style={{ background: accent + '0E', border: `1px solid ${accent}28` }}>
        <div className="flex items-start gap-4 mb-5">
          {/* Left: identity */}
          <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl font-bold flex-shrink-0"
            style={{ background: accent + '22', color: accent }}>
            {(client.shortName || client.name).charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold leading-tight mb-1" style={{ color: accent }}>
              {client.name}
            </h2>
            <div className="flex items-center gap-2 flex-wrap">
              {daysSigned !== null ? (
                <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  Signé le{' '}
                  <InlineDateEditor
                    value={client.startDate}
                    onSave={v => dispatch({ type: 'UPDATE_CLIENT', payload: { id: client.id, startDate: v } })}
                    placeholder="+ date signature"
                    color={accent}
                  />
                  {' '}·{' '}
                  <span className="font-mono font-semibold" style={{ color: 'var(--text-secondary)' }}>
                    {daysSigned}j
                  </span>
                </span>
              ) : (
                <InlineDateEditor
                  value={client.startDate}
                  onSave={v => dispatch({ type: 'UPDATE_CLIENT', payload: { id: client.id, startDate: v } })}
                  placeholder="+ date de signature"
                  color={accent}
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
                  value={client.deadline}
                  onSave={v => dispatch({ type: 'UPDATE_CLIENT', payload: { id: client.id, deadline: v } })}
                  placeholder=""
                  color={deadlineColor}
                />
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl cursor-pointer transition-colors hover:bg-white/8"
                style={{ color: 'var(--text-tertiary)', border: '1px dashed rgba(255,255,255,0.1)' }}>
                <CalendarDays size={12} />
                <InlineDateEditor
                  value={client.deadline}
                  onSave={v => dispatch({ type: 'UPDATE_CLIENT', payload: { id: client.id, deadline: v } })}
                  placeholder="Deadline remise"
                  color={accent}
                />
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 relative">
          <button
            onClick={() => setShowPicker(v => !v)}
            className="flex items-center gap-2 text-sm px-4 py-2 rounded-xl font-semibold transition-all hover:opacity-90 active:scale-[0.98]"
            style={{ background: accent, color: '#0a0a0a' }}
          >
            <Play size={13} strokeWidth={2.5} />
            Lancer session
          </button>
          {showPicker && (
            <ClientSessionPicker
              client={client}
              tasks={tasks}
              accent={accent}
              onStart={handleStartSession}
              onClose={() => setShowPicker(false)}
            />
          )}
        </div>
      </div>

      {/* ── Stats + Deadlines ─────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="grid grid-cols-2 gap-2.5 md:w-[50%] flex-shrink-0">
          <Widget icon="✓" label="Tâches" main={activeTasks.length} sub={`${doneTasks.length} terminées`} accent={accent} onClick={() => onTabChange('kanban')} />
          <Widget icon="📎" label="Hub" main={docs.length} sub="documents" accent={accent} onClick={() => onTabChange('hub')} />
          <Widget icon="⏱" label="Temps" main={formatDuration(weekTime)} sub="cette semaine" accent={accent} onClick={() => onTabChange('sessions')} />
          <Widget icon="📝" label="Notes" main={notes.length} sub="notes" accent={accent} onClick={() => onTabChange('notes')} />
          <Widget icon="📅" label="Prochains" main={upcomingRdv.length} sub="RDV 7 jours" accent={accent} onClick={() => onTabChange('sessions')} />
          <Widget icon="💰" label="Facturation" main={formatMoney(pendingAmount)} sub="à émettre" accent={accent} onClick={() => onTabChange('facturation')} />
        </div>
        <div className="flex-1 flex flex-col gap-3">
          {urgentTasks.length > 0 && (
            <div className="rounded-xl"
              style={{ background: 'var(--c-card)', border: '1px solid var(--c-border)' }}>
              <div className="px-4 py-2.5" style={{ borderBottom: '1px solid var(--c-border)' }}>
                <span className="text-[10px] uppercase tracking-wider font-medium" style={{ color: 'var(--text-tertiary)' }}>
                  Tâches urgentes · {urgentTasks.length}
                </span>
              </div>
              {urgentTasks.map((task, i) => {
                const meta = {
                  critical:      { icon: '🚨', color: '#DC2626', label: 'Critique' },
                  'very-urgent': { icon: '🔥', color: '#CC5500', label: 'Très urgent' },
                  urgent:        { icon: '⚡', color: '#B45309', label: 'Urgent' },
                }[task.urgency] || {}
                return (
                  <div key={task.id} className="flex items-center gap-3 px-4 py-2.5"
                    style={i < urgentTasks.length - 1 ? { borderBottom: '1px solid var(--c-border)' } : {}}>
                    <div className="w-0.5 h-4 rounded-full flex-shrink-0" style={{ background: meta.color }} />
                    <span className="text-sm flex-shrink-0">{meta.icon}</span>
                    <span className="flex-1 text-xs truncate" style={{ color: 'var(--text-secondary)' }}>{task.title}</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full flex-shrink-0 font-medium"
                      style={{ background: meta.color + '20', color: meta.color }}>
                      {meta.label}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
          <DeadlinesPanel tasks={tasks} />
        </div>
      </div>

      {/* ── Overdue alert ─────────────────────────────────────────────────── */}
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
                <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: accent }} />
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

// ─── Notes Tab ────────────────────────────────────────────────────────────────

function NotesTab({ client, accent }) {
  const { state, dispatch } = useStore()
  const [editing, setEditing] = useState(null)
  const [draft, setDraft] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [newTitle, setNewTitle] = useState('')

  const notes = state.clientNotes.filter(n => n.clientId === client.id).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))

  function addNote() {
    if (!newTitle.trim()) return
    dispatch({ type: 'ADD_CLIENT_NOTE', payload: { clientId: client.id, title: newTitle.trim(), content: '' } })
    setNewTitle(''); setShowNew(false)
    toast.success('Note créée')
  }

  function saveNote(id) {
    dispatch({ type: 'UPDATE_CLIENT_NOTE', payload: { id, content: draft } })
    setEditing(null)
    toast.success('Note enregistrée')
  }

  function deleteNote(id) {
    const snap = state.clientNotes.find(n => n.id === id)
    dispatch({ type: 'DELETE_CLIENT_NOTE', payload: id })
    toastUndo('Note supprimée', () => dispatch({ type: 'RESTORE_ITEMS', payload: { clientNotes: [snap] } }))
  }

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between mb-1">
        <p className="text-[10px] text-white/30 uppercase tracking-wider">{notes.length} note{notes.length > 1 ? 's' : ''}</p>
        <button onClick={() => setShowNew(true)} className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg transition-all active:scale-[0.98]" style={{ background: accent + '18', color: accent }}>
          <Plus size={12} /> Nouvelle note
        </button>
      </div>

      {showNew && (
        <Card className="rounded-xl p-3">
          <Input autoFocus value={newTitle} onChange={e => setNewTitle(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') addNote(); if (e.key === 'Escape') setShowNew(false) }} placeholder="Titre de la note..." />
          <div className="flex gap-2 mt-2">
            <button onClick={addNote} className="text-xs px-3 py-1 rounded-lg text-white font-medium transition-all active:scale-[0.98]" style={{ background: accent }}>Créer</button>
            <Button variant="ghost" size="sm" onClick={() => setShowNew(false)}>Annuler</Button>
          </div>
        </Card>
      )}

      {notes.length === 0 && !showNew && (
        <EmptyState icon={FileText} title="Aucune note pour ce client" />
      )}

      {notes.map(note => (
        <div key={note.id} className="rounded-xl overflow-hidden group" style={{ background: 'var(--c-card)', border: '1px solid var(--c-border)' }}>
          <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: editing === note.id ? '1px solid var(--c-border)' : 'none' }}>
            <span className="flex-1 text-sm font-medium text-white/80">{note.title}</span>
            <span className="font-mono text-[10px] text-white/25">{new Date(note.updatedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>
            <Button variant="subtle" size="xs" onClick={() => { setEditing(editing === note.id ? null : note.id); setDraft(note.content) }}>{editing === note.id ? 'Fermer' : 'Éditer'}</Button>
            <Button variant="ghost" size="icon-sm" onClick={() => deleteNote(note.id)} className="opacity-0 group-hover:opacity-100 text-[var(--text-tertiary)] hover:text-[var(--red-deep)]"><Trash2 size={12} /></Button>
          </div>
          {editing === note.id ? (
            <div className="p-4">
              <Textarea autoFocus value={draft} onChange={e => setDraft(e.target.value)} rows={8} placeholder="Markdown..." className="font-mono leading-relaxed" />
              <button onClick={() => saveNote(note.id)} className="mt-2 text-xs px-3 py-1.5 rounded-lg text-white font-medium transition-all active:scale-[0.98]" style={{ background: accent }}>Enregistrer</button>
            </div>
          ) : note.content ? (
            <div className="px-4 py-3"><p className="text-white/50 text-xs leading-relaxed whitespace-pre-wrap line-clamp-3">{note.content}</p></div>
          ) : null}
        </div>
      ))}
    </div>
  )
}

// ─── Hub Docs Tab ─────────────────────────────────────────────────────────────

function HubTab({ client, accent }) {
  const { state, dispatch } = useStore()
  const [showForm, setShowForm] = useState(false)
  const [mode, setMode] = useState('lien') // 'lien' | 'upload' | 'youtube'
  const [name, setName] = useState('')
  const [type, setType] = useState('lien')
  const [url, setUrl] = useState('')
  const [desc, setDesc] = useState('')
  const [uploadedFile, setUploadedFile] = useState(null)
  const [uploadError, setUploadError] = useState('')
  const [playingId, setPlayingId] = useState(null)

  const docs = state.clientDocuments.filter(d => d.clientId === client.id)

  function addDoc() {
    if (!name.trim()) return
    const payload = { clientId: client.id, name: name.trim(), type: mode === 'upload' ? 'upload' : type, url: mode === 'upload' ? '' : url.trim(), description: desc.trim() }
    if (uploadedFile) Object.assign(payload, uploadedFile)
    dispatch({ type: 'ADD_CLIENT_DOCUMENT', payload })
    setName(''); setUrl(''); setDesc(''); setUploadedFile(null); setShowForm(false)
    toast.success('Document ajouté')
  }

  function handleYouTubeSubmit(data) {
    dispatch({ type: 'ADD_CLIENT_DOCUMENT', payload: { clientId: client.id, name: data.title, description: desc.trim(), ...data } })
    setDesc(''); setShowForm(false)
    toast.success('Vidéo ajoutée')
  }

  function deleteDoc(id) {
    const snap = state.clientDocuments.find(d => d.id === id)
    dispatch({ type: 'DELETE_CLIENT_DOCUMENT', payload: id })
    toastUndo('Document supprimé', () => dispatch({ type: 'RESTORE_ITEMS', payload: { clientDocuments: [snap] } }))
  }

  function resetForm() { setName(''); setUrl(''); setDesc(''); setUploadedFile(null); setMode('lien'); setShowForm(false) }

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between mb-1">
        <p className="text-[10px] text-white/30 uppercase tracking-wider">{docs.length} document{docs.length > 1 ? 's' : ''}</p>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg transition-all active:scale-[0.98]" style={{ background: accent + '18', color: accent }}>
          <Plus size={12} /> Ajouter
        </button>
      </div>

      {showForm && (
        <Card className="rounded-xl p-4 space-y-3">
          {/* Mode switch */}
          <div className="flex gap-2">
            {[['lien', '🔗 Lien'], ['upload', '📎 Fichier'], ['youtube', '▶ YouTube']].map(([m, label]) => (
              <button key={m} type="button" onClick={() => setMode(m)}
                className="flex-1 py-2 rounded-xl text-xs font-medium transition-all active:scale-[0.98]"
                style={mode === m ? { background: accent + '20', color: accent, border: `1px solid ${accent}40` } : { background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)' }}>
                {label}
              </button>
            ))}
          </div>

          {mode === 'youtube' ? (
            <AddYouTubeForm
              onSubmit={handleYouTubeSubmit}
              onCancel={resetForm}
              extraFields={
                <div>
                  <Label>Description (optionnel)</Label>
                  <Input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Contexte, notes..." />
                </div>
              }
            />
          ) : (
            <>
              {mode === 'upload' ? (
                uploadedFile ? (
                  <div className="rounded-xl px-4 py-3 flex items-center gap-3" style={{ background: 'rgba(168,230,189,0.1)', border: '1px solid rgba(168,230,189,0.2)' }}>
                    <span className="text-lg">✓</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white/80 truncate">{uploadedFile.fileName}</p>
                      <p className="text-xs text-white/30">Fichier prêt</p>
                    </div>
                    <Button type="button" variant="ghost" size="icon-sm" onClick={() => setUploadedFile(null)} className="text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"><X size={14} /></Button>
                  </div>
                ) : (
                  <div>
                    <FileUploader
                      bucket="client-documents"
                      subPath={client.id}
                      onSuccess={r => { setUploadedFile(r); setUploadError(''); if (!name) setName(r.fileName) }}
                      onError={msg => setUploadError(msg)}
                    />
                    {uploadError && <p className="text-xs text-red mt-2">{uploadError}</p>}
                  </div>
                )
              ) : (
                <div className="flex gap-2 flex-wrap">
                  {DOC_TYPES.map(t => (
                    <button key={t} type="button" onClick={() => setType(t)} className="text-xs px-2.5 py-1.5 rounded-lg transition-all active:scale-[0.98]"
                      style={type === t ? { background: accent + '20', color: accent, border: `1px solid ${accent}40` } : { background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)' }}>
                      {DOC_ICONS[t]} {t}
                    </button>
                  ))}
                </div>
              )}

              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Nom du document *" />
              {mode === 'lien' && (
                <Input value={url} onChange={e => setUrl(e.target.value)} placeholder="URL (optionnel)" className="font-mono" />
              )}
              <Input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Description (optionnel)" />
              <div className="flex gap-2">
                <button onClick={addDoc} disabled={mode === 'upload' && !uploadedFile}
                  className="flex-1 py-2 rounded-xl text-sm font-medium text-white disabled:opacity-40 transition-all active:scale-[0.98]" style={{ background: accent }}>
                  Ajouter
                </button>
                <Button variant="ghost" onClick={resetForm} className="flex-1">Annuler</Button>
              </div>
            </>
          )}
        </Card>
      )}

      {docs.length === 0 && !showForm ? (
        <EmptyState icon={Paperclip} title="Aucun document" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {docs.map(doc => (
            <div key={doc.id} className="rounded-xl group" style={{ background: 'var(--c-card)', border: '1px solid var(--c-border)' }}>
              {doc.type === 'youtube' && doc.youtubeId ? (
                <div className="p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white/80 truncate font-medium">{doc.name}</p>
                      {doc.youtubeChannel && <p className="text-[10px] text-white/30">{doc.youtubeChannel}</p>}
                    </div>
                    <Button variant="ghost" size="icon-sm" onClick={() => deleteDoc(doc.id)} className="opacity-0 group-hover:opacity-100 flex-shrink-0 text-[var(--text-tertiary)] hover:text-[var(--red-deep)]">
                      <Trash2 size={12} />
                    </Button>
                  </div>
                  {playingId === doc.id ? (
                    <YouTubeEmbed youtubeId={doc.youtubeId} title={doc.name} />
                  ) : (
                    <YouTubeThumbnail youtubeId={doc.youtubeId} title={doc.name} onClick={() => setPlayingId(doc.id)} />
                  )}
                </div>
              ) : doc.filePath ? (
                <div className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex-1 min-w-0 mr-2">
                      <p className="text-sm text-white/80 truncate font-medium">{doc.name}</p>
                      {doc.description && <p className="text-[10px] text-white/30 truncate">{doc.description}</p>}
                    </div>
                    <Button variant="ghost" size="icon-sm" onClick={() => deleteDoc(doc.id)} className="opacity-0 group-hover:opacity-100 flex-shrink-0 text-[var(--text-tertiary)] hover:text-[var(--red-deep)]">
                      <Trash2 size={12} />
                    </Button>
                  </div>
                  <FilePreview
                    bucket="client-documents"
                    filePath={doc.filePath}
                    fileName={doc.fileName}
                    fileSizeBytes={doc.fileSizeBytes}
                    fileMimeType={doc.fileMimeType}
                    onDelete={() => deleteDoc(doc.id)}
                  />
                </div>
              ) : (
                <div className="flex items-center gap-3 px-4 py-3">
                  <span className="text-lg flex-shrink-0">{DOC_ICONS[doc.type] || '📄'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white/80 truncate">{doc.name}</p>
                    {doc.description && <p className="text-[10px] text-white/30 truncate">{doc.description}</p>}
                  </div>
                  {doc.url && <a href={doc.url} target="_blank" rel="noopener noreferrer" className="p-1.5 text-white/30 hover:text-white/70 transition-colors"><ExternalLink size={12} /></a>}
                  <Button variant="ghost" size="icon-sm" onClick={() => deleteDoc(doc.id)} className="opacity-0 group-hover:opacity-100 text-[var(--text-tertiary)] hover:text-[var(--red-deep)]"><Trash2 size={12} /></Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Sessions Tab ─────────────────────────────────────────────────────────────

function SessionsTab({ client, accent }) {
  const { state } = useStore()
  const weekStart = getWeekStart(); const monthStart = getMonthStart()

  const sessions = state.sessions.filter(s => s.clientId === client.id).sort((a, b) => new Date(b.date) - new Date(a.date))
  const weekTime = sessions.filter(s => new Date(s.date) >= weekStart).reduce((a, s) => a + s.duration, 0)
  const monthTime = sessions.filter(s => new Date(s.date) >= monthStart).reduce((a, s) => a + s.duration, 0)
  const allTime = sessions.reduce((a, s) => a + s.duration, 0)

  return (
    <div className="p-4 space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {[['Cette semaine', weekTime], ['Ce mois', monthTime], ['Total', allTime]].map(([label, val]) => (
          <div key={label} className="rounded-xl p-3 text-center" style={{ background: 'var(--c-card)', border: '1px solid var(--c-border)' }}>
            <p className="font-mono text-xl font-medium" style={{ color: accent }}>{formatDuration(val)}</p>
            <p className="text-[10px] text-white/30 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {sessions.length === 0 ? (
        <EmptyState icon={Timer} title="Aucune session enregistrée" />
      ) : (
        <div className="flex flex-col gap-2">
          {sessions.map(s => (
            <div key={s.id} className="flex items-center gap-3 px-4 py-3 rounded-xl" style={{ background: 'var(--c-card)', border: '1px solid var(--c-border)' }}>
              <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: accent }} />
              <span className="flex-1 text-sm text-white/65 truncate">{s.note || '—'}</span>
              <span className="font-mono text-sm font-medium" style={{ color: accent }}>{formatDuration(s.duration)}</span>
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

// ─── Facturation Tab ──────────────────────────────────────────────────────────

function FacturationTab({ client, accent }) {
  const { state, dispatch } = useStore()
  const [showForm, setShowForm] = useState(false)
  const [num, setNum] = useState(''); const [date, setDate] = useState(''); const [amtHt, setAmtHt] = useState(''); const [vat, setVat] = useState('20'); const [desc, setDesc] = useState(''); const [status, setStatus] = useState('to_emit')

  const invoices = state.clientInvoices.filter(i => i.clientId === client.id).sort((a, b) => new Date(b.date) - new Date(a.date))
  const totalFact = invoices.filter(i => i.status === 'paid').reduce((a, i) => a + (i.amountTtc || 0), 0)
  const toReceive = invoices.filter(i => i.status === 'sent').reduce((a, i) => a + (i.amountTtc || 0), 0)
  const overdue = invoices.filter(i => i.status === 'overdue').reduce((a, i) => a + (i.amountTtc || 0), 0)

  function addInvoice() {
    const ht = parseFloat(amtHt) || 0; const vatRate = parseFloat(vat) || 0
    const ttc = ht * (1 + vatRate / 100)
    dispatch({ type: 'ADD_CLIENT_INVOICE', payload: { clientId: client.id, invoiceNumber: num.trim(), date: date || new Date().toISOString().slice(0, 10), amountHt: ht, vatRate, amountTtc: ttc, description: desc.trim(), status } })
    setNum(''); setDate(''); setAmtHt(''); setDesc(''); setStatus('to_emit'); setShowForm(false)
    toast.success('Facture créée')
  }

  function updateInvoiceStatus(id, nextStatus) {
    dispatch({ type: 'UPDATE_CLIENT_INVOICE', payload: { id, status: nextStatus } })
    toast.success('Facture mise à jour')
  }

  function deleteInvoice(id) {
    const snap = state.clientInvoices.find(i => i.id === id)
    dispatch({ type: 'DELETE_CLIENT_INVOICE', payload: id })
    toastUndo('Facture supprimée', () => dispatch({ type: 'RESTORE_ITEMS', payload: { clientInvoices: [snap] } }))
  }

  return (
    <div className="p-4 space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {[['Payé', totalFact, '#A8E6BD'], ['À recevoir', toReceive, '#FFD66B'], ['En retard', overdue, '#F87171']].map(([label, val, color]) => (
          <div key={label} className="rounded-xl p-3 text-center" style={{ background: 'var(--c-card)', border: '1px solid var(--c-border)' }}>
            <p className="font-mono text-lg font-semibold" style={{ color }}>{formatMoney(val)}</p>
            <p className="text-[10px] text-white/30 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-[10px] text-white/30 uppercase tracking-wider">{invoices.length} facture{invoices.length > 1 ? 's' : ''}</p>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg transition-all active:scale-[0.98]" style={{ background: accent + '18', color: accent }}>
          <Plus size={12} /> Nouvelle facture
        </button>
      </div>

      {showForm && (
        <Card className="rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Input value={num} onChange={e => setNum(e.target.value)} placeholder="N° facture *" />
            <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
            <Input value={amtHt} onChange={e => setAmtHt(e.target.value)} placeholder="Montant HT (€) *" type="number" />
            <Input value={vat} onChange={e => setVat(e.target.value)} placeholder="TVA (%)" type="number" />
          </div>
          <Input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Description (optionnel)" />
          <div className="flex gap-2 flex-wrap">
            {Object.entries(INVOICE_STATUSES).map(([k, v]) => (
              <button key={k} onClick={() => setStatus(k)} className="text-xs px-2.5 py-1 rounded-lg transition-all active:scale-[0.98]" style={status === k ? { background: v.color + '20', color: v.color, border: `1px solid ${v.color}40` } : { background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)' }}>
                {v.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={addInvoice} className="flex-1 py-2 rounded-xl text-sm font-medium text-white transition-all active:scale-[0.98]" style={{ background: accent }}>Enregistrer</button>
            <Button variant="ghost" onClick={() => setShowForm(false)} className="flex-1">Annuler</Button>
          </div>
        </Card>
      )}

      {invoices.length === 0 && !showForm ? (
        <EmptyState icon={Receipt} title="Aucune facture" />
      ) : (
        <div className="flex flex-col gap-2">
          {invoices.map(inv => {
            const s = INVOICE_STATUSES[inv.status] || INVOICE_STATUSES.to_emit
            return (
              <div key={inv.id} className="flex items-center gap-3 px-4 py-3 rounded-xl group" style={{ background: 'var(--c-card)', border: '1px solid var(--c-border)' }}>
                <div>
                  <p className="text-sm font-medium text-white/80">{inv.invoiceNumber || '—'}</p>
                  {inv.description && <p className="text-[10px] text-white/30">{inv.description}</p>}
                </div>
                <div className="ml-auto text-right flex-shrink-0 flex flex-col items-end gap-1">
                  <p className="font-mono text-sm font-semibold" style={{ color: s.color }}>{formatMoney(inv.amountTtc)}</p>
                  <UIBadge variant={INVOICE_STATUS_VARIANT[inv.status] || 'default'} className="rounded-full">{s.label}</UIBadge>
                </div>
                {['to_emit', 'sent', 'paid', 'overdue'].filter(k => k !== inv.status).slice(0, 1).map(nextStatus => (
                  <Button key={nextStatus} variant="subtle" size="xs" onClick={() => updateInvoiceStatus(inv.id, nextStatus)} className="flex-shrink-0">
                    → {INVOICE_STATUSES[nextStatus]?.label}
                  </Button>
                ))}
                <Button variant="ghost" size="icon-sm" onClick={() => deleteInvoice(inv.id)} className="opacity-0 group-hover:opacity-100 flex-shrink-0 text-[var(--text-tertiary)] hover:text-[var(--red-deep)]"><Trash2 size={12} /></Button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Client Form ──────────────────────────────────────────────────────────────

function ClientForm({ initial = {}, onSubmit, onClose }) {
  const [name, setName] = useState(initial.name || '')
  const [shortName, setShortName] = useState(initial.shortName || '')
  const [city, setCity] = useState(initial.city || '')
  const [activityType, setActivityType] = useState(initial.activityType || '')
  const [status, setStatus] = useState(initial.status || 'prospect')
  const [startDate, setStartDate] = useState(initial.startDate || '')
  const [accentColor, setAccentColor] = useState(initial.accentColor || ACCENT_COLORS[0])

  function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) return
    onSubmit({ name: name.trim(), shortName: shortName.trim(), city: city.trim(), activityType, status, startDate: startDate || new Date().toISOString().slice(0, 10), accentColor })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <Label>Nom du client *</Label>
        <Input autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="Cabinet médical Dr. Dupont" className="h-10" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Nom court (switcher)</Label>
          <Input value={shortName} onChange={e => setShortName(e.target.value)} placeholder="Dr. Dupont" />
        </div>
        <div>
          <Label>Ville</Label>
          <Input value={city} onChange={e => setCity(e.target.value)} placeholder="Paris" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Type d'activité</Label>
          <NativeSelect value={activityType} onChange={e => setActivityType(e.target.value)}>
            <option value="">— Sélectionner —</option>
            {ACTIVITY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </NativeSelect>
        </div>
        <div>
          <Label>Statut</Label>
          <NativeSelect value={status} onChange={e => setStatus(e.target.value)}>
            {Object.entries(STATUS_LABELS).filter(([k]) => k !== 'archived').map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </NativeSelect>
        </div>
      </div>
      <div>
        <Label>Date de démarrage</Label>
        <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
      </div>
      <div>
        <Label className="mb-2">Couleur d'accent</Label>
        <div className="flex gap-2 flex-wrap">
          {ACCENT_COLORS.map(c => (
            <button key={c} type="button" onClick={() => setAccentColor(c)} className="w-7 h-7 rounded-full transition-all active:scale-[0.98]" style={{ background: c, outline: accentColor === c ? `2px solid ${c}` : 'none', outlineOffset: '2px', opacity: accentColor === c ? 1 : 0.5 }} />
          ))}
        </div>
      </div>
      <div className="flex gap-3 pt-2">
        <button type="submit" className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white transition-all active:scale-[0.98]" style={{ background: accentColor }}>
          {initial.id ? 'Mettre à jour' : 'Créer le client'}
        </button>
        <Button type="button" variant="ghost" onClick={onClose} className="flex-1 h-11">Annuler</Button>
      </div>
    </form>
  )
}

// ─── Settings Panel ───────────────────────────────────────────────────────────

function ClientSettingsDrawer({ client, onClose }) {
  const { state, dispatch } = useStore()
  const [confirmDelete, setConfirmDelete] = useState(false)

  function archiveClient() {
    dispatch({ type: 'ARCHIVE_CLIENT', payload: client.id })
    onClose()
    toast.success('Client archivé')
  }

  function deleteClient() {
    const cascade = {
      clients: [client],
      clientNotes: state.clientNotes.filter(n => n.clientId === client.id),
      clientDocuments: state.clientDocuments.filter(d => d.clientId === client.id),
      clientInvoices: state.clientInvoices.filter(i => i.clientId === client.id),
    }
    dispatch({ type: 'DELETE_CLIENT', payload: client.id })
    onClose()
    toastUndo('Client supprimé', () => dispatch({ type: 'RESTORE_ITEMS', payload: cascade }))
  }

  return (
    <div className="flex flex-col gap-4">
      <ClientForm
        initial={client}
        onClose={onClose}
        onSubmit={data => { dispatch({ type: 'UPDATE_CLIENT', payload: { id: client.id, ...data } }); onClose(); toast.success('Client mis à jour') }}
      />
      <div className="pt-4 flex flex-col gap-2" style={{ borderTop: '1px solid var(--c-border)' }}>
        <Button variant="subtle" onClick={archiveClient} className="w-full justify-start px-4 h-10">
          <Archive size={14} /> Archiver ce client
        </Button>
        {confirmDelete ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/40 flex-1">Supprimer définitivement ?</span>
            <Button variant="danger" size="sm" onClick={deleteClient}>Confirmer</Button>
            <Button variant="ghost" size="icon-sm" onClick={() => setConfirmDelete(false)} className="text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"><X size={14} /></Button>
          </div>
        ) : (
          <Button variant="danger" onClick={() => setConfirmDelete(true)} className="w-full justify-start px-4 h-10">
            <Trash2 size={14} /> Supprimer ce client
          </Button>
        )}
      </div>
    </div>
  )
}

// ─── Client Dashboard Shell ───────────────────────────────────────────────────

function ClientDashboard({ client, onStartTask }) {
  const { state, dispatch } = useStore()
  const [activeTab, setActiveTab] = useState('dashboard')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [importSuccess, setImportSuccess] = useState(null)

  const accent = client.accentColor || '#8B7CFF'
  const statusInfo = STATUS_LABELS[client.status] || STATUS_LABELS.prospect
  const clientTasks = state.tasks.filter(t => t.clientId === client.id)

  function handleTaskUpdate(id, updates) {
    dispatch({ type: 'UPDATE_TASK', payload: { id, ...updates } })
  }

  function handleTaskCreate(data) {
    dispatch({ type: 'ADD_TASK', payload: { ...data, clientId: client.id } })
  }

  function handleTaskDelete(id) {
    dispatch({ type: 'DELETE_TASK', payload: id })
  }

  return (
    <div className="flex flex-col flex-1">
      {/* Client header */}
      <div className="px-4 pt-4 pb-0 max-w-5xl mx-auto w-full">
        <div className="rounded-2xl p-4 mb-4 flex items-start gap-4" style={{ background: accent + '0D', border: `1px solid ${accent}20` }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold flex-shrink-0" style={{ background: accent + '25', color: accent }}>
            {(client.shortName || client.name).charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold leading-tight" style={{ color: accent }}>{client.name}</h2>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <UIBadge variant={STATUS_BADGE_VARIANT[client.status] || 'default'} className="rounded-full">{statusInfo.label}</UIBadge>
              {client.startDate && <span className="text-[10px] text-white/30">Démarré le {new Date(client.startDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>}
              {client.activityType && <span className="text-[10px] text-white/25">{client.activityType}</span>}
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={() => { setImportSuccess(null); setImportOpen(true) }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs transition-all active:scale-[0.98]"
              style={{ color: accent, background: accent + '15' }}
            >
              <Zap size={12} strokeWidth={2} />
              Import
            </button>
            <Button variant="ghost" size="icon" onClick={() => setSettingsOpen(true)} className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)]">
              <Settings size={14} />
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-0.5 overflow-x-auto" style={{ borderBottom: '1px solid var(--c-border)' }}>
          {CLIENT_TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-t-lg transition-all whitespace-nowrap flex-shrink-0 ${activeTab === tab.id ? '' : 'text-white/40 hover:text-white/70'}`}
              style={activeTab === tab.id ? { borderBottom: `2px solid ${accent}`, marginBottom: '-1px', color: accent } : {}}
            >
              <tab.Icon size={12} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 max-w-5xl mx-auto w-full">
        {activeTab === 'dashboard' && (
          <DashboardTab
            client={client} accent={accent}
            tasks={state.tasks} sessions={state.sessions}
            clientNotes={state.clientNotes} clientDocuments={state.clientDocuments}
            clientInvoices={state.clientInvoices} appointments={state.appointments}
            onTabChange={setActiveTab} onStartTask={onStartTask}
          />
        )}
        {activeTab === 'kanban' && (
          <div className="p-4">
            <ViewContainer
              contextId={`client:${client.id}`}
              tasks={clientTasks}
              projects={state.projects}
              onTaskUpdate={handleTaskUpdate}
              onTaskCreate={handleTaskCreate}
              onTaskDelete={handleTaskDelete}
            />
          </div>
        )}
        {activeTab === 'notes' && <NotesTab client={client} accent={accent} />}
        {activeTab === 'hub' && <HubTab client={client} accent={accent} />}
        {activeTab === 'sessions' && <SessionsTab client={client} accent={accent} />}
        {activeTab === 'facturation' && <FacturationTab client={client} accent={accent} />}
      </div>

      <Drawer isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} title="Paramètres du client">
        <ClientSettingsDrawer client={client} onClose={() => setSettingsOpen(false)} />
      </Drawer>

      {/* Import bulk modal */}
      {importOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}
          onClick={() => setImportOpen(false)}>
          <div className="w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl overflow-hidden"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-soft)', boxShadow: 'var(--shadow-float)' }}
            onClick={e => e.stopPropagation()}>
            {/* Modal header */}
            <div className="flex items-center justify-between px-4 sm:px-6 py-4 flex-shrink-0"
              style={{ borderBottom: '1px solid var(--border-soft)' }}>
              <div>
                <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                  Import bulk · {client.name}
                </h3>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                  Les éléments importés seront automatiquement liés à ce client.
                </p>
              </div>
              <Button variant="ghost" size="icon-sm" onClick={() => setImportOpen(false)} className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)]">
                <X size={16} />
              </Button>
            </div>
            {/* Success banner */}
            {importSuccess !== null && (
              <div className="mx-6 mt-4 px-4 py-2 rounded-xl text-xs flex items-center gap-2"
                style={{ background: 'rgba(168,230,189,0.1)', border: '1px solid rgba(168,230,189,0.25)', color: '#A8E6BD' }}>
                <Check size={13} />
                {importSuccess} élément{importSuccess > 1 ? 's' : ''} importé{importSuccess > 1 ? 's' : ''} pour <strong>{client.name}</strong>
              </div>
            )}
            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              <BulkImportInterface
                defaultProjectSlug="ulycom_clients"
                defaultClientId={client.id}
                contextLabel={`Client : ${client.name}`}
                onImportSuccess={n => setImportSuccess(n)}
                onCancel={() => setImportOpen(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main ClientSpace ─────────────────────────────────────────────────────────

export default function ClientSpace({ onStartTask }) {
  const { state, dispatch } = useStore()
  const [selectedClientId, setSelectedClientId] = useState(null)
  const [addDrawer, setAddDrawer] = useState(false)
  const [showArchived, setShowArchived] = useState(false)

  const activeClients = state.clients.filter(c => c.status !== 'archived')
  const archivedClients = state.clients.filter(c => c.status === 'archived')

  const selectedClient = state.clients.find(c => c.id === selectedClientId) || activeClients[0] || null

  function addClient(data) {
    dispatch({ type: 'ADD_CLIENT', payload: data })
    setAddDrawer(false)
    toast.success('Client créé')
  }

  if (activeClients.length === 0 && !addDrawer) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16">
        <EmptyState
          icon={Plus}
          title="Aucun client Ulycom"
          description="Crée ton premier espace client pour centraliser tâches, notes, sessions et facturation."
          action={
            <Button onClick={() => setAddDrawer(true)}>
              <Plus size={16} /> Créer mon premier client
            </Button>
          }
        />

        <Drawer isOpen={addDrawer} onClose={() => setAddDrawer(false)} title="Nouveau client">
          <ClientForm onSubmit={addClient} onClose={() => setAddDrawer(false)} />
        </Drawer>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Switcher horizontal */}
      <div className="px-4 pt-4 pb-0 max-w-5xl mx-auto w-full">
        <div className="flex items-center gap-1 p-1 rounded-xl overflow-x-auto" style={{ background: 'rgba(0,0,0,0.18)' }}>
          {activeClients.map(c => (
            <button
              key={c.id}
              onClick={() => setSelectedClientId(c.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap flex-shrink-0 focus:outline-none"
              style={
                (selectedClient?.id === c.id)
                  ? { background: 'var(--c-card)', color: c.accentColor || '#E8E6E3', boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }
                  : { color: 'rgba(255,255,255,0.40)' }
              }
            >
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: c.accentColor || '#8B7CFF' }} />
              {c.shortName || c.name}
            </button>
          ))}
          <button
            onClick={() => setAddDrawer(true)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm text-white/25 hover:text-white/50 transition-colors whitespace-nowrap flex-shrink-0"
          >
            <Plus size={13} /> Ajouter
          </button>
          {archivedClients.length > 0 && (
            <button onClick={() => setShowArchived(!showArchived)} className="ml-auto text-[10px] text-white/20 hover:text-white/40 px-2 py-1 flex-shrink-0 transition-colors">
              {showArchived ? 'Masquer archivés' : `Archivés (${archivedClients.length})`}
            </button>
          )}
        </div>

        {showArchived && archivedClients.length > 0 && (
          <div className="flex gap-2 mt-2 flex-wrap">
            {archivedClients.map(c => (
              <button key={c.id} onClick={() => setSelectedClientId(c.id)} className="text-[11px] px-2.5 py-1 rounded-lg text-white/25 bg-white/5 hover:bg-white/8 transition-colors">{c.shortName || c.name}</button>
            ))}
          </div>
        )}
      </div>

      {selectedClient ? (
        <ClientDashboard key={selectedClient.id} client={selectedClient} onStartTask={onStartTask} />
      ) : null}

      <Drawer isOpen={addDrawer} onClose={() => setAddDrawer(false)} title="Nouveau client">
        <ClientForm onSubmit={addClient} onClose={() => setAddDrawer(false)} />
      </Drawer>
    </div>
  )
}
