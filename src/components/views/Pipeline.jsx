import { useState } from 'react'
import { DndContext, PointerSensor, useSensor, useSensors, useDroppable, useDraggable } from '@dnd-kit/core'
import { Plus, Trash2, CalendarClock, X } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { localDateStr } from '@/lib/backup'
import { toast, toastUndo } from '@/lib/toast'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const TITLE = 'text-[34px] font-semibold leading-tight tracking-tight text-[var(--text-primary)]'

// Probabilité de signature par étape, pour la prévision pondérée.
const STAGES = [
  { id: 'lead',      label: 'Piste',        prob: 0.1, color: '#93b4ff' },
  { id: 'contacted', label: 'Contacté',     prob: 0.2, color: '#7aa2ff' },
  { id: 'meeting',   label: 'RDV',          prob: 0.4, color: '#5b87ff' },
  { id: 'quote',     label: 'Devis envoyé', prob: 0.6, color: '#3b6ff0' },
  { id: 'won',       label: 'Gagné',        prob: 1,   color: '#22a06b' },
  { id: 'lost',      label: 'Perdu',        prob: 0,   color: '#9aa3b2' },
]

const eur = n => `${Math.round(n || 0).toLocaleString('fr-FR')} €`

function DealCard({ deal, onOpen }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: deal.id })
  const late = deal.nextActionDate && deal.nextActionDate < localDateStr() && !['won', 'lost'].includes(deal.stage)
  return (
    <div
      ref={setNodeRef} {...attributes} {...listeners}
      onClick={() => onOpen(deal)}
      className="cursor-grab rounded-2xl bg-[var(--bg-card)] p-3 shadow-[var(--shadow-card)] active:cursor-grabbing"
      style={{ transform: transform ? `translate(${transform.x}px, ${transform.y}px)` : undefined, opacity: isDragging ? 0.6 : 1, zIndex: isDragging ? 50 : undefined, position: 'relative' }}
    >
      <p className="text-sm font-semibold text-[var(--text-primary)]">{deal.name}</p>
      {deal.company && <p className="text-xs text-[var(--text-tertiary)]">{deal.company}</p>}
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-[var(--accent)]">{eur(deal.value)}</span>
        {deal.nextActionDate && (
          <span className={`flex items-center gap-1 text-[10px] ${late ? 'font-semibold text-[var(--red-deep)]' : 'text-[var(--text-tertiary)]'}`}>
            <CalendarClock size={11} /> {new Date(deal.nextActionDate + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
          </span>
        )}
      </div>
      {deal.nextAction && <p className="mt-1 truncate text-[11px] text-[var(--text-secondary)]">→ {deal.nextAction}</p>}
    </div>
  )
}

function Column({ stage, deals, onOpen }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id })
  const total = deals.reduce((s, d) => s + (Number(d.value) || 0), 0)
  return (
    <div ref={setNodeRef} className="flex min-w-[180px] flex-1 flex-col gap-2 rounded-[22px] p-2.5 transition-colors" style={{ background: isOver ? 'var(--bg-selection)' : 'var(--bg-sidebar)' }}>
      <div className="flex items-center gap-2 px-1.5 pt-1">
        <span className="h-2 w-2 rounded-full" style={{ background: stage.color }} />
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-tertiary)]">{stage.label}</span>
        <span className="ml-auto text-[11px] font-semibold text-[var(--text-secondary)]">{eur(total)}</span>
      </div>
      {deals.map(d => <DealCard key={d.id} deal={d} onOpen={onOpen} />)}
      {!deals.length && <p className="px-2 py-4 text-center text-[11px] text-[var(--text-tertiary)]">Dépose une affaire ici</p>}
    </div>
  )
}

function DealPanel({ deal, onClose }) {
  const { state, dispatch } = useStore()
  const patch = p => dispatch({ type: 'UPDATE_ENTITY', payload: { collection: 'deals', id: deal.id, patch: p } })
  const field = (key, props = {}) => (
    <Input value={deal[key] ?? ''} onChange={e => patch({ [key]: props.type === 'number' ? Number(e.target.value) : e.target.value })} {...props} />
  )
  return (
    <Card className="space-y-3 p-5">
      <div className="flex items-center justify-between">
        <p className="font-semibold text-[var(--text-primary)]">{deal.name}</p>
        <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Fermer"><X size={14} /></Button>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="text-xs text-[var(--text-tertiary)]">Affaire{field('name')}</label>
        <label className="text-xs text-[var(--text-tertiary)]">Entreprise{field('company')}</label>
        <label className="text-xs text-[var(--text-tertiary)]">Contact{field('contact', { placeholder: 'Nom, email ou téléphone' })}</label>
        <label className="text-xs text-[var(--text-tertiary)]">Montant (€ HT){field('value', { type: 'number', min: 0 })}</label>
        <label className="text-xs text-[var(--text-tertiary)]">Prochaine action{field('nextAction', { placeholder: 'Ex. Relancer après la démo' })}</label>
        <label className="text-xs text-[var(--text-tertiary)]">Pour le{field('nextActionDate', { type: 'date' })}</label>
        <label className="text-xs text-[var(--text-tertiary)]">Pôle
          <select value={deal.projectId || ''} onChange={e => patch({ projectId: e.target.value })} className="mt-1 h-10 w-full rounded-xl border border-[var(--border-medium)] bg-[var(--bg-surface)] px-3 text-sm text-[var(--text-primary)]">
            {state.projects.map(p => <option key={p.id} value={p.id}>{p.emoji} {p.name}</option>)}
          </select>
        </label>
        <label className="text-xs text-[var(--text-tertiary)]">Étape
          <select value={deal.stage} onChange={e => patch({ stage: e.target.value })} className="mt-1 h-10 w-full rounded-xl border border-[var(--border-medium)] bg-[var(--bg-surface)] px-3 text-sm text-[var(--text-primary)]">
            {STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </label>
      </div>
      <div className="flex justify-end">
        <Button variant="danger" size="sm" onClick={() => {
          dispatch({ type: 'DELETE_ENTITY', payload: { collection: 'deals', id: deal.id } })
          toastUndo('Affaire supprimée', () => dispatch({ type: 'RESTORE_ITEMS', payload: { deals: [deal] } }))
          onClose()
        }}><Trash2 size={13} /> Supprimer</Button>
      </div>
    </Card>
  )
}

export default function Pipeline({ onNavigate }) {
  const { state, dispatch } = useStore()
  const [name, setName] = useState('')
  const [value, setValue] = useState('')
  const [openId, setOpenId] = useState(null)
  const [openedAt] = useState(() => Date.now())
  const deals = state.deals || []
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  const active = deals.filter(d => !['won', 'lost'].includes(d.stage))
  const pipelineValue = active.reduce((s, d) => s + (Number(d.value) || 0), 0)
  const forecast = active.reduce((s, d) => s + (Number(d.value) || 0) * (STAGES.find(x => x.id === d.stage)?.prob || 0), 0)
  const monthStart = new Date(openedAt); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0)
  const wonMonth = deals.filter(d => d.stage === 'won' && d.wonAt && new Date(d.wonAt) >= monthStart).reduce((s, d) => s + (Number(d.value) || 0), 0)
  const closed = deals.filter(d => ['won', 'lost'].includes(d.stage))
  const conversion = closed.length ? Math.round((closed.filter(d => d.stage === 'won').length / closed.length) * 100) : null

  function add(e) {
    e.preventDefault()
    if (!name.trim()) return
    dispatch({ type: 'ADD_ENTITY', payload: { collection: 'deals', item: { name: name.trim(), value: Number(value) || 0, stage: 'lead', projectId: state.projects[0]?.id } } })
    setName('')
    setValue('')
  }

  // Gagner une affaire crée le client (s'il n'existe pas) et propose le devis.
  function win(deal) {
    let clientId = deal.clientId
    if (!clientId) {
      // « Site vitrine — Studio Lumen » : le client est la partie après le tiret.
      const label = deal.company || deal.name.split(/\s[—–-]\s/)[1]?.trim() || deal.name
      const existing = state.clients.find(c => c.name.toLowerCase() === label.toLowerCase())
      if (existing) clientId = existing.id
      else {
        dispatch({ type: 'ADD_CLIENT', payload: { name: label, shortName: label.split(' ')[0], status: 'onboarding', startDate: localDateStr(), accentColor: '#93b4ff' } })
        toast.success(`Client « ${label} » créé`)
      }
    }
    dispatch({ type: 'UPDATE_ENTITY', payload: { collection: 'deals', id: deal.id, patch: { stage: 'won', wonAt: new Date().toISOString(), ...(clientId ? { clientId } : {}) } } })
    toast('Affaire gagnée 🎉', { action: { label: 'Créer le devis', onClick: () => onNavigate('facturation') } })
  }

  function onDragEnd({ active: a, over }) {
    if (!over) return
    const deal = deals.find(d => d.id === a.id)
    if (!deal || deal.stage === over.id) return
    if (over.id === 'won') return win(deal)
    dispatch({ type: 'UPDATE_ENTITY', payload: { collection: 'deals', id: deal.id, patch: { stage: over.id } } })
  }

  const openDeal = deals.find(d => d.id === openId)
  return (
    <div className="space-y-6">
      <div>
        <h1 className={TITLE}>Pipeline</h1>
        <p className="text-sm text-[var(--text-tertiary)]">Tes affaires en cours, de la piste à la signature. Glisse une carte pour la faire avancer.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ['Pipeline actif', eur(pipelineValue), `${active.length} affaire${active.length > 1 ? 's' : ''}`],
          ['Prévision pondérée', eur(forecast), 'selon l’étape de chaque affaire'],
          ['Gagné ce mois', eur(wonMonth), ''],
          ['Taux de conversion', conversion === null ? '–' : `${conversion} %`, `${closed.length} affaire${closed.length > 1 ? 's' : ''} clôturée${closed.length > 1 ? 's' : ''}`],
        ].map(([label, v, sub], i) => (
          <Card key={label} className="border-0 p-4" style={i === 0 ? { background: 'var(--hero-gradient)', color: '#fff' } : undefined}>
            <p className={`text-xs ${i === 0 ? 'text-white/80' : 'text-[var(--text-tertiary)]'}`}>{label}</p>
            <p className="text-2xl font-semibold tracking-tight" style={i === 0 ? undefined : { color: 'var(--text-primary)' }}>{v}</p>
            {sub && <p className={`text-[11px] ${i === 0 ? 'text-white/70' : 'text-[var(--text-tertiary)]'}`}>{sub}</p>}
          </Card>
        ))}
      </div>

      <form onSubmit={add} className="flex flex-wrap gap-2">
        <Input value={name} onChange={e => setName(e.target.value)} placeholder="Nouvelle affaire (ex. Site vitrine — Boulangerie Martin)" className="min-w-[240px] flex-1" />
        <Input value={value} onChange={e => setValue(e.target.value)} type="number" min="0" placeholder="Montant € HT" className="w-40" />
        <Button type="submit"><Plus size={14} /> Ajouter</Button>
      </form>

      {openDeal && <DealPanel deal={openDeal} onClose={() => setOpenId(null)} />}

      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {STAGES.map(s => <Column key={s.id} stage={s} deals={deals.filter(d => d.stage === s.id)} onOpen={d => setOpenId(d.id)} />)}
        </div>
      </DndContext>
    </div>
  )
}
