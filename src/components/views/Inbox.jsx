import { useState } from 'react'
import { Trash2, Inbox as InboxIcon, X } from 'lucide-react'
import { useStore } from '@/store/useStore'
import Drawer from '@/components/ui/Drawer'
import GlowSearchBar from '@/components/ui/GlowSearchBar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/select'
import { EmptyState } from '@/components/ui/empty-state'
import { toast, toastUndo } from '@/lib/toast'

const TYPE_ICONS = { task: '📋', idea: '💡', note: '📝' }

function TaskForm({ initial = {}, onSubmit, onClose, projects }) {
  const [title, setTitle] = useState(initial.title || '')
  const [projectId, setProjectId] = useState(projects[0]?.id || '')
  const [impact, setImpact] = useState('low')
  const [today, setToday] = useState(false)
  const [dueDate, setDueDate] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    if (!title.trim()) return
    onSubmit({ title: title.trim(), projectId, impact, today, dueDate: dueDate || null, status: 'todo', ship80: false, notes: '' })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <Label>Titre</Label>
        <Input autoFocus value={title} onChange={e => setTitle(e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Projet</Label>
          <NativeSelect value={projectId} onChange={e => setProjectId(e.target.value)}>
            {projects.map(p => <option key={p.id} value={p.id}>{p.emoji} {p.name}</option>)}
          </NativeSelect>
        </div>
        <div>
          <Label>Impact</Label>
          <div className="flex gap-2">
            {['low', 'high'].map(v => (
              <button key={v} type="button" onClick={() => setImpact(v)}
                className={`flex-1 rounded-xl py-2 text-xs font-medium transition-all active:scale-[0.98] ${impact === v ? 'bg-[var(--violet-bg)] text-[var(--violet-deep)] ring-1 ring-[var(--violet-solid)]' : 'bg-[rgba(var(--ink),0.05)] text-[var(--text-tertiary)] hover:bg-[rgba(var(--ink),0.08)]'}`}>
                {v === 'high' ? '⚡ Fort' : '· Faible'}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Date limite</Label>
          <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
        </div>
        <div>
          <Label>Aujourd'hui</Label>
          <button type="button" onClick={() => setToday(!today)}
            className={`w-full rounded-xl py-2 text-xs font-medium transition-all active:scale-[0.98] ${today ? 'bg-[var(--violet-bg)] text-[var(--violet-deep)] ring-1 ring-[var(--violet-solid)]' : 'bg-[rgba(var(--ink),0.05)] text-[var(--text-tertiary)] hover:bg-[rgba(var(--ink),0.08)]'}`}>
            📌 {today ? 'Oui' : 'Non'}
          </button>
        </div>
      </div>
      <div className="flex gap-3 pt-2">
        <Button type="submit" className="flex-1">Créer la tâche</Button>
        <Button type="button" variant="subtle" className="flex-1" onClick={onClose}>Annuler</Button>
      </div>
    </form>
  )
}

export default function Inbox({ onNavigate }) {
  const { state, dispatch } = useStore()
  const [search, setSearch] = useState('')
  const [triageItem, setTriageItem] = useState(null)
  const [confirmClear, setConfirmClear] = useState(false)

  const filtered = state.inbox.filter(i => i.text.toLowerCase().includes(search.toLowerCase()))

  function assignQuick(item, projectId) {
    dispatch({ type: 'ASSIGN_INBOX', payload: { inboxId: item.id, projectId } })
    const p = state.projects.find(pr => pr.id === projectId)
    toast.success(`Assignée à ${p?.name || 'projet'}`)
  }

  function removeItem(item) {
    dispatch({ type: 'REMOVE_INBOX', payload: item.id })
    toastUndo('Élément supprimé', () => dispatch({ type: 'RESTORE_ITEMS', payload: { inbox: [item] } }))
  }

  function clearAll() {
    const snapshot = [...state.inbox]
    dispatch({ type: 'CLEAR_INBOX' })
    setConfirmClear(false)
    toastUndo(`${snapshot.length} élément${snapshot.length > 1 ? 's' : ''} supprimé${snapshot.length > 1 ? 's' : ''}`, () =>
      dispatch({ type: 'RESTORE_ITEMS', payload: { inbox: snapshot } })
    )
  }

  function handleTriage(payload) {
    dispatch({ type: 'ADD_TASK', payload })
    dispatch({ type: 'REMOVE_INBOX', payload: triageItem.id })
    toast.success('Convertie en tâche')
    setTriageItem(null)
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-[var(--text-primary)]">Inbox</h1>
          <p className="mt-0.5 text-sm text-[var(--text-tertiary)] tabular">{state.inbox.length} élément{state.inbox.length > 1 ? 's' : ''} à trier</p>
        </div>
        <div className="flex items-center gap-2">
          {state.inbox.length > 0 && (
            confirmClear ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-[var(--text-tertiary)]">Confirmer ?</span>
                <Button size="sm" variant="danger" onClick={clearAll}>Vider</Button>
                <button onClick={() => setConfirmClear(false)} className="text-[var(--text-tertiary)] transition-colors hover:text-[var(--text-primary)]"><X size={14} /></button>
              </div>
            ) : (
              <button onClick={() => setConfirmClear(true)} className="text-xs text-[var(--text-tertiary)] transition-colors hover:text-[var(--red-deep)]">Tout vider</button>
            )
          )}
        </div>
      </div>

      {state.inbox.length > 0 && (
        <div className="mb-4">
          <GlowSearchBar value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher dans l'inbox…" />
        </div>
      )}

      {/* List */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={InboxIcon}
          title={search ? 'Aucun résultat' : 'Inbox vide'}
          description={search ? 'Aucune capture ne correspond à ta recherche.' : 'Lance ⌘K pour capturer une idée, une tâche ou une note en une frappe.'}
        />
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map(item => (
            <div key={item.id} className="rounded-2xl border border-[var(--border-soft)] bg-[var(--bg-card)] p-4 shadow-[var(--shadow-card)] transition-shadow hover:shadow-[var(--shadow-card-hover)]">
              <div className="mb-3 flex items-start gap-3">
                <span className="flex-shrink-0 text-lg">{TYPE_ICONS[item.type] || '📋'}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm leading-snug text-[var(--text-primary)]">{item.text}</p>
                  <p className="mt-1 font-mono text-[10px] text-[var(--text-tertiary)] tabular">
                    {new Date(item.createdAt).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <button onClick={() => removeItem(item)} className="flex-shrink-0 p-1 text-[var(--text-tertiary)] transition-colors hover:text-[var(--red-deep)]">
                  <Trash2 size={13} />
                </button>
              </div>

              {/* Quick assign buttons */}
              <div className="flex flex-wrap items-center gap-2">
                {state.projects.map(p => (
                  <button
                    key={p.id}
                    onClick={() => assignQuick(item, p.id)}
                    className="rounded-lg px-2.5 py-1.5 text-[11px] transition-all hover:scale-[1.03] active:scale-100"
                    style={{ background: p.color + '1F', color: p.color, boxShadow: `inset 0 0 0 1px ${p.color}33` }}
                  >
                    → {p.name}
                  </button>
                ))}
                <Button size="xs" variant="subtle" className="ml-auto" onClick={() => setTriageItem(item)}>
                  Trier en détail →
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Triage drawer */}
      <Drawer isOpen={!!triageItem} onClose={() => setTriageItem(null)} title="Convertir en tâche">
        {triageItem && (
          <div className="flex flex-col gap-4">
            <div className="rounded-xl border border-[var(--border-soft)] bg-[var(--bg-card-soft)] px-4 py-3">
              <p className="text-sm text-[var(--text-secondary)]">{triageItem.text}</p>
            </div>
            <TaskForm
              initial={{ title: triageItem.text }}
              projects={state.projects}
              onClose={() => setTriageItem(null)}
              onSubmit={handleTriage}
            />
          </div>
        )}
      </Drawer>
    </div>
  )
}
