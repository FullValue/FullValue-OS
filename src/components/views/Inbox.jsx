import { useState } from 'react'
import { Trash2, Search, Zap, X } from 'lucide-react'
import { useStore } from '@/store/useStore'
import Drawer from '@/components/ui/Drawer'

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
        <label className="text-white/40 text-xs mb-1 block">Titre</label>
        <input
          autoFocus value={title} onChange={e => setTitle(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:ring-2 focus:ring-violet/40"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-white/40 text-xs mb-1 block">Projet</label>
          <select value={projectId} onChange={e => setProjectId(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none">
            {projects.map(p => <option key={p.id} value={p.id} style={{ background: '#1A1A20' }}>{p.emoji} {p.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-white/40 text-xs mb-1 block">Impact</label>
          <div className="flex gap-2">
            {['low', 'high'].map(v => (
              <button key={v} type="button" onClick={() => setImpact(v)}
                className={`flex-1 py-2 rounded-xl text-xs font-medium transition-colors ${impact === v ? 'bg-violet/20 text-violet border border-violet/30' : 'bg-white/5 text-white/40 hover:bg-white/8'}`}>
                {v === 'high' ? '⚡ High' : '· Low'}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-white/40 text-xs mb-1 block">Date limite</label>
          <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none" />
        </div>
        <div>
          <label className="text-white/40 text-xs mb-2 block">Aujourd'hui</label>
          <button type="button" onClick={() => setToday(!today)}
            className={`w-full py-2 rounded-xl text-xs font-medium transition-colors ${today ? 'bg-violet/20 text-violet border border-violet/30' : 'bg-white/5 text-white/40 hover:bg-white/8'}`}>
            📌 {today ? 'Oui' : 'Non'}
          </button>
        </div>
      </div>
      <div className="flex gap-3 pt-2">
        <button type="submit" className="flex-1 bg-violet hover:bg-violet/90 text-white py-2.5 rounded-xl text-sm font-medium transition-colors">Créer la tâche</button>
        <button type="button" onClick={onClose} className="flex-1 bg-white/5 hover:bg-white/8 text-white/50 py-2.5 rounded-xl text-sm transition-colors">Annuler</button>
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

  function assignQuick(inboxId, projectId) {
    dispatch({ type: 'ASSIGN_INBOX', payload: { inboxId, projectId } })
  }

  function handleTriage(payload) {
    dispatch({ type: 'ADD_TASK', payload })
    dispatch({ type: 'REMOVE_INBOX', payload: triageItem.id })
    setTriageItem(null)
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-white">Inbox</h1>
          <p className="text-white/30 text-sm mt-0.5">{state.inbox.length} élément{state.inbox.length > 1 ? 's' : ''} à trier</p>
        </div>
        <div className="flex items-center gap-2">
          {state.inbox.length > 0 && (
            confirmClear ? (
              <div className="flex items-center gap-2">
                <span className="text-white/40 text-xs">Confirmer ?</span>
                <button onClick={() => { dispatch({ type: 'CLEAR_INBOX' }); setConfirmClear(false) }} className="text-xs bg-red/15 hover:bg-red/25 text-red px-3 py-1.5 rounded-lg transition-colors">Vider</button>
                <button onClick={() => setConfirmClear(false)} className="text-white/40 hover:text-white/70 transition-colors"><X size={14} /></button>
              </div>
            ) : (
              <button onClick={() => setConfirmClear(true)} className="text-xs text-white/30 hover:text-red transition-colors">Tout vider</button>
            )
          )}
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25" />
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher dans l'inbox..."
          className="w-full bg-white/3 border border-white/6 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:ring-2 focus:ring-violet/40"
        />
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-4xl mb-4">📭</p>
          <p className="text-white/30 text-sm">Inbox vide — lance <kbd className="bg-white/5 px-1.5 py-0.5 rounded text-[10px] border border-white/10">⌘K</kbd> pour capturer</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map(item => (
            <div key={item.id} className="rounded-2xl p-4" style={{ background: 'var(--c-card)', border: '1px solid var(--c-border)' }}>
              <div className="flex items-start gap-3 mb-3">
                <span className="text-lg flex-shrink-0">{TYPE_ICONS[item.type] || '📋'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-white/85 text-sm leading-snug">{item.text}</p>
                  <p className="font-mono text-[10px] text-white/25 mt-1">
                    {new Date(item.createdAt).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <button onClick={() => dispatch({ type: 'REMOVE_INBOX', payload: item.id })} className="text-white/15 hover:text-red transition-colors flex-shrink-0 p-1">
                  <Trash2 size={13} />
                </button>
              </div>

              {/* Quick assign buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                {state.projects.map(p => (
                  <button
                    key={p.id}
                    onClick={() => assignQuick(item.id, p.id)}
                    className="text-[11px] px-2.5 py-1.5 rounded-lg transition-all hover:scale-[1.03]"
                    style={{ background: p.color + '18', color: p.color, border: `1px solid ${p.color}30` }}
                  >
                    → {p.name}
                  </button>
                ))}
                <button
                  onClick={() => setTriageItem(item)}
                  className="ml-auto text-[11px] px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 transition-colors"
                >
                  Trier en détail →
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Triage drawer */}
      <Drawer isOpen={!!triageItem} onClose={() => setTriageItem(null)} title="Convertir en tâche">
        {triageItem && (
          <div className="flex flex-col gap-4">
            <div className="px-4 py-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--c-border)' }}>
              <p className="text-white/60 text-sm">{triageItem.text}</p>
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
