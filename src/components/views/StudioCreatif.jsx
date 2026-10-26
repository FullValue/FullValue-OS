// Studio Créatif : veille des créas concurrentes, assets et montages.
// Connecteurs prévus (affichés ici, branchés ensuite) : Kie.ai, Claude via MCP, Gemini, Meta Ad Library.
import { useMemo, useState } from 'react'
import { Clapperboard, Plus, Plug } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { STUDIO_CONNECTORS, veilleStats } from '@/lib/studio'
import Veille from '@/components/studio/Veille'
import Assets from '@/components/studio/Assets'
import Montages from '@/components/studio/Montages'
import { KiePoller } from '@/components/studio/KieGenerate'

const TABS = [
  { id: 'library', label: 'Veille', add: 'Ajouter une créa' },
  { id: 'angles', label: 'Angles', add: 'Ajouter une créa' },
  { id: 'assets', label: 'Assets', add: 'Ajouter un asset' },
  { id: 'montages', label: 'Montages', add: 'Nouveau montage' },
]

export default function StudioCreatif() {
  const { state, dispatch } = useStore()
  const [tab, setTab] = useState('library')
  const [adding, setAdding] = useState(false)
  const [montageOpen, setMontageOpen] = useState(null)
  const [generating, setGenerating] = useState(false)
  const creatives = state.creatives || []
  const montages = state.montages || []
  const { angles, todo, dup } = useMemo(() => veilleStats(state.creatives || []), [state.creatives])
  const current = TABS.find(t => t.id === tab)

  function addToMontage(montageId, assetId) {
    const m = montages.find(x => x.id === montageId)
    if (!m) return
    dispatch({ type: 'UPDATE_ENTITY', payload: { collection: 'montages', id: montageId, patch: { clips: [...(m.clips || []), { id: Math.random().toString(36).slice(2, 10), assetId }] } } })
  }

  const stats = [
    ['Créas en veille', creatives.length],
    ['À arbitrer', todo],
    ['À dupliquer', dup],
    ['Angles repérés', angles.length],
    ['Assets', (state.creativeAssets || []).length],
    ['Montages en cours', montages.filter(m => m.status !== 'livre').length],
  ]

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-wrap items-start gap-4">
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl text-white" style={{ background: 'var(--hero-gradient)' }}>
          <Clapperboard size={22} />
        </div>
        <div className="min-w-[240px] flex-1">
          <h1 className="text-[34px] font-semibold leading-tight tracking-tight text-[var(--text-primary)]">Studio Créatif</h1>
          <p className="mt-1 max-w-2xl text-sm text-[var(--text-tertiary)]">
            La veille des créas concurrentes, tes assets et tes montages, au même endroit. Les IA viendront s’y brancher pour générer, analyser et monter.
          </p>
        </div>
        <button type="button" onClick={() => setAdding(true)} className="flex items-center gap-2 rounded-full bg-[var(--accent)] px-5 py-2.5 text-[14px] font-semibold text-white shadow-[var(--shadow-card)]">
          <Plus size={16} /> {current.add}
        </button>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {stats.map(([label, value]) => (
          <div key={label} className="rounded-[20px] bg-[var(--bg-card)] px-4 py-3 shadow-[var(--shadow-card)]">
            <p className="text-[24px] font-semibold tabular-nums text-[var(--text-primary)]">{value}</p>
            <p className="text-[12px] text-[var(--text-tertiary)]">{label}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-[20px] bg-[var(--bg-sidebar)] px-4 py-3">
        <span className="flex items-center gap-1.5 text-[12px] font-semibold text-[var(--text-secondary)]"><Plug size={13} /> Connecteurs</span>
        {STUDIO_CONNECTORS.map(c => (
          <span key={c.id} title={c.role} className="flex items-center gap-1.5 rounded-full bg-[var(--bg-card)] px-3 py-1 text-[12px] text-[var(--text-secondary)] shadow-[var(--shadow-card)]">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: c.live ? 'var(--green-solid, #22a06b)' : 'var(--text-tertiary)', opacity: c.live ? 1 : 0.6 }} /> {c.name}
            <span className="hidden text-[var(--text-tertiary)] md:inline">· {c.live ? 'connecté' : 'à brancher'}</span>
          </span>
        ))}
      </div>

      <div className="inline-flex gap-1 rounded-full bg-[var(--bg-sidebar)] p-1">
        {TABS.map(t => (
          <button key={t.id} type="button" onClick={() => { setTab(t.id); setAdding(false) }}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${tab === t.id ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-[var(--shadow-card)]' : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {(tab === 'library' || tab === 'angles') && <Veille view={tab} adding={adding} setAdding={setAdding} />}
      {tab === 'assets' && <Assets adding={adding} setAdding={setAdding} onAddToMontage={addToMontage} generating={generating} setGenerating={setGenerating} />}
      <KiePoller />
      {tab === 'montages' && <Montages adding={adding} setAdding={setAdding} openId={montageOpen} setOpenId={setMontageOpen} />}
    </div>
  )
}
