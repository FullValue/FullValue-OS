// Montages : assembler des assets dans l'ordre (séquencier), avec un brief et un format.
// C'est la base sur laquelle Claude agira via le MCP (réordonner, ajouter, monter, exporter).
import { useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, Clapperboard, Copy, Plus, Trash2, X } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { toast } from '@/lib/toast'
import { ASPECTS, ASSET_KINDS, MONTAGE_STATUS, FIELD, LABEL, isDirectMedia } from '@/lib/studio'
import { Modal, SidePanel, MediaThumb, Pill } from './StudioUI'

const COLLECTION = 'montages'
const genId = () => Math.random().toString(36).slice(2, 10)
const thumbOf = a => (a ? { filePath: a.filePath, url: isDirectMedia(a.url || '') ? a.url : null, fileType: a.fileType } : null)

// Brief texte complet : à coller dans un éditeur, ou à donner à Claude.
function montageBrief(m, assets, projects) {
  const project = projects.find(p => p.id === m.projectId)
  const lines = [
    `Montage : ${m.title}`,
    `Format : ${m.aspect}${project ? ` · Projet : ${project.name}` : ''} · Statut : ${MONTAGE_STATUS[m.status]?.label}`,
    m.brief ? `\nBrief :\n${m.brief}` : '',
    '\nSéquencier :',
    ...(m.clips || []).map((c, i) => {
      const a = assets.find(x => x.id === c.assetId)
      const timing = c.start || c.end ? ` [${c.start || '0:00'} → ${c.end || 'fin'}]` : ''
      return `${i + 1}. ${a ? `${ASSET_KINDS[a.kind]} « ${a.title} »` : 'Asset supprimé'}${timing}${c.note ? ` — ${c.note}` : ''}${a?.url ? ` (${a.url})` : ''}`
    }),
  ]
  return lines.filter(l => l !== '').join('\n')
}

function NewMontage({ onClose, onCreated }) {
  const { state, dispatch } = useStore()
  const [form, setForm] = useState({ title: '', aspect: '9:16', projectId: '', brief: '' })
  const set = patch => setForm(f => ({ ...f, ...patch }))
  function submit(e) {
    e.preventDefault()
    const id = crypto.randomUUID()
    dispatch({ type: 'ADD_ENTITY', payload: { collection: COLLECTION, item: {
      id, title: form.title.trim() || 'Nouveau montage', aspect: form.aspect, projectId: form.projectId || null,
      brief: form.brief.trim() || null, status: 'brief', clips: [],
    } } })
    onCreated(id)
  }
  return (
    <Modal title="Nouveau montage" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3.5">
        <div>
          <span className={LABEL}>Titre</span>
          <input autoFocus className={FIELD} value={form.title} onChange={e => set({ title: e.target.value })} placeholder="Ex. Pub rentrée — témoignage parent" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <span className={LABEL}>Format</span>
            <select className={FIELD} value={form.aspect} onChange={e => set({ aspect: e.target.value })}>{ASPECTS.map(a => <option key={a}>{a}</option>)}</select>
          </div>
          <div>
            <span className={LABEL}>Projet</span>
            <select className={FIELD} value={form.projectId} onChange={e => set({ projectId: e.target.value })}>
              <option value="">— Aucun —</option>
              {state.projects.map(p => <option key={p.id} value={p.id}>{p.emoji} {p.name}</option>)}
            </select>
          </div>
        </div>
        <div>
          <span className={LABEL}>Brief</span>
          <textarea className={`${FIELD} min-h-[90px]`} value={form.brief} onChange={e => set({ brief: e.target.value })} placeholder="Objectif, cible, accroche, durée visée, ton, appel à l’action…" />
        </div>
        <button className="w-full rounded-full bg-[var(--accent)] py-2.5 text-[14px] font-semibold text-white">Créer le montage</button>
      </form>
    </Modal>
  )
}

function MontageEditor({ montage: m, onClose }) {
  const { state, dispatch } = useStore()
  const assets = state.creativeAssets || []
  const [picking, setPicking] = useState(false)
  const update = patch => dispatch({ type: 'UPDATE_ENTITY', payload: { collection: COLLECTION, id: m.id, patch } })
  const clips = m.clips || []
  const setClips = next => update({ clips: next })
  const move = (i, d) => {
    const next = [...clips]
    const j = i + d
    if (j < 0 || j >= next.length) return
    ;[next[i], next[j]] = [next[j], next[i]]
    setClips(next)
  }

  function remove() {
    if (!window.confirm('Supprimer ce montage ? (les assets restent)')) return
    dispatch({ type: 'DELETE_ENTITY', payload: { collection: COLLECTION, id: m.id } })
    onClose()
  }

  return (
    <SidePanel onClose={onClose}>
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-tertiary)]">Montage · {m.aspect} · {clips.length} plan{clips.length > 1 ? 's' : ''}</p>
          <input className="w-full bg-transparent text-[20px] font-semibold text-[var(--text-primary)] outline-none" value={m.title} onChange={e => update({ title: e.target.value })} />
        </div>
        <button type="button" onClick={onClose} className="rounded-full px-3 py-1.5 text-[13px] text-[var(--text-secondary)] hover:bg-[rgba(var(--ink),0.05)]">Fermer</button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {Object.entries(MONTAGE_STATUS).map(([v, s]) => (
          <button key={v} type="button" onClick={() => update({ status: v })} className="rounded-full px-3 py-1.5 text-[12px] font-semibold"
            style={m.status === v ? { background: s.color, color: '#fff' } : { background: s.bg, color: s.color }}>{s.label}</button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <span className={LABEL}>Format</span>
          <select className={FIELD} value={m.aspect} onChange={e => update({ aspect: e.target.value })}>{ASPECTS.map(a => <option key={a}>{a}</option>)}</select>
        </div>
        <div>
          <span className={LABEL}>Projet</span>
          <select className={FIELD} value={m.projectId || ''} onChange={e => update({ projectId: e.target.value || null })}>
            <option value="">— Aucun —</option>
            {state.projects.map(p => <option key={p.id} value={p.id}>{p.emoji} {p.name}</option>)}
          </select>
        </div>
      </div>
      <div>
        <span className={LABEL}>Brief</span>
        <textarea className={`${FIELD} min-h-[80px]`} value={m.brief || ''} onChange={e => update({ brief: e.target.value || null })} placeholder="Objectif, cible, accroche, durée visée…" />
      </div>

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <span className={LABEL}>Séquencier</span>
          <button type="button" onClick={() => setPicking(true)} className="flex items-center gap-1 rounded-full px-3 py-1.5 text-[12px] font-semibold text-[var(--accent)] hover:bg-[var(--brand-100)]"><Plus size={13} /> Ajouter un plan</button>
        </div>
        {clips.length === 0 && <p className="rounded-xl bg-[rgba(var(--ink),0.03)] px-3 py-4 text-center text-[13px] text-[var(--text-tertiary)]">Ajoute des assets dans l’ordre du montage.</p>}
        {clips.map((c, i) => {
          const a = assets.find(x => x.id === c.assetId)
          const patch = p => setClips(clips.map(x => x.id === c.id ? { ...x, ...p } : x))
          return (
            <div key={c.id} className="flex gap-3 rounded-2xl bg-[var(--bg-card)] p-2.5 shadow-[var(--shadow-card)]">
              <div className="flex flex-col items-center justify-between">
                <span className="text-[11px] font-bold tabular-nums text-[var(--text-tertiary)]">{i + 1}</span>
                <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="rounded p-0.5 text-[var(--text-tertiary)] disabled:opacity-30" aria-label="Monter"><ArrowUp size={12} /></button>
                <button type="button" onClick={() => move(i, 1)} disabled={i === clips.length - 1} className="rounded p-0.5 text-[var(--text-tertiary)] disabled:opacity-30" aria-label="Descendre"><ArrowDown size={12} /></button>
              </div>
              <div className="w-16 flex-shrink-0 overflow-hidden rounded-xl"><MediaThumb item={thumbOf(a)} kind={a?.kind} className="aspect-[9/16]" /></div>
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="flex items-center gap-2">
                  <p className="flex-1 truncate text-[13px] font-semibold text-[var(--text-primary)]">{a ? a.title : 'Asset supprimé'}</p>
                  <button type="button" onClick={() => setClips(clips.filter(x => x.id !== c.id))} className="p-1 text-[var(--text-tertiary)] hover:text-[var(--red-deep)]" aria-label="Retirer"><X size={13} /></button>
                </div>
                <div className="flex gap-2">
                  <input className={`${FIELD} py-1 text-[12px]`} value={c.start || ''} onChange={e => patch({ start: e.target.value })} placeholder="Début 0:00" />
                  <input className={`${FIELD} py-1 text-[12px]`} value={c.end || ''} onChange={e => patch({ end: e.target.value })} placeholder="Fin 0:05" />
                </div>
                <input className={`${FIELD} py-1 text-[12px]`} value={c.note || ''} onChange={e => patch({ note: e.target.value })} placeholder="Texte à l’écran, transition, son…" />
              </div>
            </div>
          )
        })}
      </section>

      <div className="flex flex-wrap gap-2 pt-2" style={{ borderTop: '1px solid var(--border-soft)' }}>
        <button type="button" onClick={() => { navigator.clipboard.writeText(montageBrief(m, assets, state.projects)); toast.success('Brief de montage copié', { description: 'À coller dans ton éditeur ou à donner à Claude.' }) }}
          className="flex items-center gap-1.5 rounded-full bg-[var(--accent)] px-4 py-2 text-[13px] font-semibold text-white"><Copy size={14} /> Copier le brief complet</button>
        <button type="button" onClick={remove} className="ml-auto flex items-center gap-1.5 rounded-full px-3 py-2 text-[13px] font-medium" style={{ color: 'var(--red-deep)' }}><Trash2 size={14} /> Supprimer</button>
      </div>

      {picking && (
        <Modal title="Ajouter un plan" onClose={() => setPicking(false)} width="max-w-2xl">
          {assets.length === 0 ? (
            <p className="text-[13px] text-[var(--text-tertiary)]">Aucun asset : ajoute d’abord tes rushs dans l’onglet Assets.</p>
          ) : (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {assets.map(a => (
                <button key={a.id} type="button" onClick={() => { setClips([...clips, { id: genId(), assetId: a.id }]); setPicking(false) }}
                  className="overflow-hidden rounded-2xl bg-[var(--bg-card)] text-left shadow-[var(--shadow-card)] hover:ring-2 hover:ring-[var(--accent)]">
                  <MediaThumb item={thumbOf(a)} kind={a.kind} className="aspect-square" />
                  <p className="truncate p-2 text-[12px] font-medium text-[var(--text-primary)]">{a.title}</p>
                </button>
              ))}
            </div>
          )}
        </Modal>
      )}
    </SidePanel>
  )
}

export default function Montages({ adding, setAdding, openId, setOpenId }) {
  const { state } = useStore()
  const items = useMemo(() => [...(state.montages || [])].sort((a, b) => (b.updatedAt || b.createdAt || '').localeCompare(a.updatedAt || a.createdAt || '')), [state.montages])
  const assets = state.creativeAssets || []
  const opened = items.find(m => m.id === openId)

  return (
    <div className="space-y-4">
      {items.length === 0 ? (
        <div className="space-y-2 rounded-[22px] bg-[var(--bg-card)] py-12 text-center shadow-[var(--shadow-card)]">
          <Clapperboard size={28} className="mx-auto text-[var(--text-tertiary)]" />
          <p className="text-[15px] font-semibold text-[var(--text-primary)]">Aucun montage</p>
          <p className="text-[13px] text-[var(--text-tertiary)]">Crée un montage, écris le brief et assemble tes assets plan par plan. Claude pourra ensuite le monter via le MCP.</p>
          <button type="button" onClick={() => setAdding(true)} className="mx-auto mt-2 flex items-center gap-1.5 rounded-full bg-[var(--accent)] px-4 py-2 text-[13px] font-semibold text-white"><Plus size={14} /> Nouveau montage</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map(m => {
            const s = MONTAGE_STATUS[m.status] || MONTAGE_STATUS.brief
            const project = state.projects.find(p => p.id === m.projectId)
            const clipAssets = (m.clips || []).map(c => assets.find(a => a.id === c.assetId)).filter(Boolean)
            return (
              <button key={m.id} type="button" onClick={() => setOpenId(m.id)} className="space-y-3 rounded-[22px] bg-[var(--bg-card)] p-4 text-left shadow-[var(--shadow-card)] transition-transform hover:-translate-y-0.5">
                <div className="flex items-center gap-2">
                  <Pill bg={s.bg} color={s.color}>{s.label}</Pill>
                  <Pill bg="rgba(var(--ink),0.06)" color="var(--text-secondary)">{m.aspect}</Pill>
                  {project && <span className="ml-auto truncate text-[11px] text-[var(--text-tertiary)]">{project.emoji} {project.name}</span>}
                </div>
                <p className="text-[15px] font-semibold text-[var(--text-primary)]">{m.title}</p>
                {m.brief && <p className="line-clamp-2 text-[12px] text-[var(--text-tertiary)]">{m.brief}</p>}
                <div className="flex gap-1.5 overflow-hidden">
                  {clipAssets.slice(0, 6).map((a, i) => (
                    <div key={`${a.id}${i}`} className="w-10 flex-shrink-0 overflow-hidden rounded-lg"><MediaThumb item={thumbOf(a)} kind={a.kind} className="aspect-[9/16]" /></div>
                  ))}
                  {(m.clips || []).length === 0 && <p className="text-[12px] text-[var(--text-tertiary)]">Séquencier vide</p>}
                  {(m.clips || []).length > 6 && <span className="self-center text-[11px] text-[var(--text-tertiary)]">+{m.clips.length - 6}</span>}
                </div>
              </button>
            )
          })}
        </div>
      )}
      {adding && <NewMontage onClose={() => setAdding(false)} onCreated={id => { setAdding(false); setOpenId(id) }} />}
      {opened && <MontageEditor montage={opened} onClose={() => setOpenId(null)} />}
    </div>
  )
}
