// Veille créative : les créas des concurrents, leur verdict (dupliquer / adapter / ignorer),
// leurs angles et les analyses déposées par les IA (Gemini, Claude via le MCP).
import { useMemo, useState } from 'react'
import { Copy, ExternalLink, EyeOff, Film, ListTodo, Loader2, Search, Sparkles, Trash2 } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from '@/lib/toast'
import {
  PLATFORMS, FORMATS, VERDICTS, CREATIVE_STATUS, FIELD, FIELD_BASE, LABEL,
  guessPlatform, isDirectMedia, kindFromMime, uploadCreativeFile, removeCreativeFiles, veilleStats,
} from '@/lib/studio'
import { Modal, SidePanel, MediaThumb, MediaPreview, FileOrLink, Pill } from './StudioUI'

const COLLECTION = 'creatives'
const mediaOf = c => ({ filePath: c.filePath, url: c.url, fileType: c.fileType })
const kindOf = c => (c.filePath || c.url ? (c.fileType ? kindFromMime(c.fileType) : c.format === 'video' ? 'video' : 'image') : null)

function VerdictPill({ c }) {
  if (!c.verdict) return null
  const v = VERDICTS[c.verdict]
  return <Pill bg={v.bg} color={v.color}>{v.label}{c.score != null ? ` · ${c.score}` : ''}</Pill>
}

function AddCreative({ onClose, onCreated, competitors }) {
  const { dispatch } = useStore()
  const { user } = useAuth()
  const canUpload = !!user && !user.local
  const [mode, setMode] = useState(canUpload ? 'file' : 'link')
  const [file, setFile] = useState(null)
  const [link, setLink] = useState('')
  const [form, setForm] = useState({ competitor: '', platform: 'meta', format: 'video', title: '', sourceUrl: '', notes: '', tags: '' })
  const [busy, setBusy] = useState(null)
  const [error, setError] = useState(null)
  const set = patch => setForm(f => ({ ...f, ...patch }))

  async function submit(e) {
    e.preventDefault()
    setError(null)
    if (mode === 'file' && !file) return setError('Choisis un fichier.')
    if (mode === 'link' && !link.trim()) return setError('Colle un lien.')
    try {
      let filePath = null
      if (mode === 'file') {
        setBusy('Envoi du fichier…')
        filePath = await uploadCreativeFile(file, user.id, 'veille')
      }
      const url = mode === 'link' && isDirectMedia(link) ? link.trim() : null
      const id = crypto.randomUUID()
      dispatch({ type: 'ADD_ENTITY', payload: { collection: COLLECTION, item: {
        id,
        competitor: form.competitor.trim(),
        platform: form.platform,
        format: file ? (file.type.startsWith('image/') && form.format === 'video' ? 'image' : form.format) : form.format,
        title: form.title.trim() || null,
        sourceUrl: (mode === 'link' ? link.trim() : form.sourceUrl.trim()) || null,
        url, filePath, fileType: file?.type || null,
        notes: form.notes.trim() || null,
        tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
        status: 'a_analyser', verdict: null, score: null, angle: null, hook: null, adaptation: null, analyses: [],
      } } })
      onCreated(id)
    } catch (err) {
      setBusy(null)
      setError(err?.message || 'Ajout impossible.')
    }
  }

  return (
    <Modal title="Ajouter une créa" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <FileOrLink mode={mode} setMode={setMode} file={file} setFile={setFile} url={link}
          setUrl={v => { setLink(v); if (v) set({ platform: guessPlatform(v) }) }} canUpload={canUpload} accept="image/*,video/*"
          urlPlaceholder="Bibliothèque pub Meta · TikTok · Instagram · Drive" />
        {mode === 'file' && (
          <div>
            <span className={LABEL}>Lien de la publication (facultatif)</span>
            <input className={FIELD} value={form.sourceUrl} onChange={e => set({ sourceUrl: e.target.value, platform: e.target.value ? guessPlatform(e.target.value) : form.platform })} placeholder="https://…" />
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <span className={LABEL}>Concurrent *</span>
            <input className={FIELD} list="studio-competitors" required value={form.competitor} onChange={e => set({ competitor: e.target.value })} />
            <datalist id="studio-competitors">{competitors.map(n => <option key={n} value={n} />)}</datalist>
          </div>
          <div>
            <span className={LABEL}>Réseau</span>
            <select className={FIELD} value={form.platform} onChange={e => set({ platform: e.target.value })}>
              {Object.entries(PLATFORMS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div>
            <span className={LABEL}>Format</span>
            <select className={FIELD} value={form.format} onChange={e => set({ format: e.target.value })}>
              {Object.entries(FORMATS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div className="col-span-2">
            <span className={LABEL}>Titre</span>
            <input className={FIELD} value={form.title} onChange={e => set({ title: e.target.value })} placeholder="Ex. Témoignage client face caméra" />
          </div>
          <div className="col-span-2">
            <span className={LABEL}>Notes</span>
            <textarea className={`${FIELD} min-h-[80px]`} value={form.notes} onChange={e => set({ notes: e.target.value })}
              placeholder="Texte de la pub, voix off, pourquoi elle a retenu ton attention… (aide beaucoup les IA)" />
          </div>
          <div className="col-span-2">
            <span className={LABEL}>Tags</span>
            <input className={FIELD} value={form.tags} onChange={e => set({ tags: e.target.value })} placeholder="ugc, humour, promo" />
          </div>
        </div>
        {error && <p className="rounded-xl px-3 py-2.5 text-[13px]" style={{ background: 'var(--red-bg)', color: 'var(--red-deep)' }}>{error}</p>}
        <button className="flex w-full items-center justify-center gap-2 rounded-full bg-[var(--accent)] py-2.5 text-[14px] font-semibold text-white disabled:opacity-60" disabled={!!busy}>
          {busy ? <><Loader2 size={15} className="animate-spin" /> {busy}</> : 'Ajouter à la veille'}
        </button>
      </form>
    </Modal>
  )
}

function CreativeDetail({ creative: c, onClose }) {
  const { state, dispatch } = useStore()
  const [projectId, setProjectId] = useState(state.projects[0]?.id || '')
  const update = patch => dispatch({ type: 'UPDATE_ENTITY', payload: { collection: COLLECTION, id: c.id, patch } })
  const analyses = c.analyses || []

  function setVerdict(verdict) {
    update({ verdict, status: verdict === 'ignorer' ? 'ignoree' : 'analysee', score: c.score ?? 70 })
  }
  function toTask() {
    dispatch({ type: 'ADD_TASK', payload: {
      title: `Créa à produire : ${c.angle || c.title || 'nouvel angle'} (inspiré de ${c.competitor})`,
      notes: [c.adaptation, c.hook ? `Accroche : ${c.hook}` : '', c.sourceUrl ? `Référence : ${c.sourceUrl}` : ''].filter(Boolean).join('\n\n'),
      projectId, status: 'todo', impact: c.score != null && c.score >= 75 ? 'high' : 'medium',
      tags: ['créatif'], today: false, ship80: false, dueDate: null,
    } })
    update({ status: 'dupliquee' })
    toast.success('Tâche de production créée', { description: state.projects.find(p => p.id === projectId)?.name })
  }
  async function remove() {
    if (!window.confirm('Supprimer définitivement cette créa ?')) return
    await removeCreativeFiles([c.filePath]).catch(() => {})
    dispatch({ type: 'DELETE_ENTITY', payload: { collection: COLLECTION, id: c.id } })
    onClose()
  }

  return (
    <SidePanel onClose={onClose}>
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-tertiary)]">{PLATFORMS[c.platform]} · {FORMATS[c.format]} · {CREATIVE_STATUS[c.status]}</p>
          <h2 className="text-[20px] font-semibold text-[var(--text-primary)]">{c.title || c.competitor}</h2>
          <p className="text-[13px] text-[var(--text-tertiary)]">{c.competitor}</p>
        </div>
        <button type="button" onClick={onClose} className="rounded-full px-3 py-1.5 text-[13px] text-[var(--text-secondary)] hover:bg-[rgba(var(--ink),0.05)]">Fermer</button>
      </div>

      <MediaPreview item={mediaOf(c)} kind={kindOf(c)} />
      {c.sourceUrl && (
        <a href={c.sourceUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-[13px] font-semibold text-[var(--accent)]">
          <ExternalLink size={14} /> Voir la publication d’origine
        </a>
      )}
      {c.notes && <p className="whitespace-pre-wrap rounded-xl bg-[rgba(var(--ink),0.04)] p-3 text-[13px] text-[var(--text-secondary)]">{c.notes}</p>}

      <section className="space-y-3 rounded-2xl p-4" style={{ background: c.verdict ? 'var(--brand-100)' : 'rgba(var(--ink),0.03)', border: '1px solid var(--border-soft)' }}>
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex-1 text-[14px] font-semibold text-[var(--text-primary)]">Verdict</span>
          {c.verdict ? <VerdictPill c={c} /> : <Pill bg="rgba(var(--ink),0.06)" color="var(--text-tertiary)">Pas encore arbitrée</Pill>}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(VERDICTS).map(([v, s]) => (
            <button key={v} type="button" onClick={() => setVerdict(v)} className="rounded-full px-3 py-1.5 text-[12px] font-semibold transition-all"
              style={c.verdict === v ? { background: s.color, color: '#fff' } : { background: s.bg, color: s.color }}>{s.label}</button>
          ))}
          {c.verdict && (
            <label className="ml-auto flex items-center gap-2 text-[12px] text-[var(--text-secondary)]">
              Score <input type="range" min="0" max="100" step="5" value={c.score ?? 70} onChange={e => update({ score: Number(e.target.value) })} /> <b className="w-7 tabular-nums">{c.score ?? 70}</b>
            </label>
          )}
        </div>
        <div>
          <span className={LABEL}>Angle</span>
          <input className={FIELD} value={c.angle || ''} onChange={e => update({ angle: e.target.value || null })} placeholder="Ex. Peur de rater, preuve sociale, avant / après…" />
        </div>
        <div>
          <span className={LABEL}>Accroche</span>
          <input className={FIELD} value={c.hook || ''} onChange={e => update({ hook: e.target.value || null })} placeholder="Les 3 premières secondes" />
        </div>
        <div>
          <span className={LABEL}>Proposition pour nous</span>
          <textarea className={`${FIELD} min-h-[80px]`} value={c.adaptation || ''} onChange={e => update({ adaptation: e.target.value || null })} placeholder="Comment on l’adapte à notre marque…" />
        </div>
        {c.verdict && c.verdict !== 'ignorer' && (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <select className={FIELD_BASE} value={projectId} onChange={e => setProjectId(e.target.value)}>
              {state.projects.map(p => <option key={p.id} value={p.id}>{p.emoji} {p.name}</option>)}
            </select>
            <button type="button" onClick={toTask} className="flex items-center gap-1.5 rounded-full bg-[var(--accent)] px-3 py-2 text-[13px] font-semibold text-white">
              <ListTodo size={14} /> Créer la tâche de production
            </button>
            {c.adaptation && (
              <button type="button" onClick={() => { navigator.clipboard.writeText(c.adaptation); toast.success('Proposition copiée') }} className="flex items-center gap-1.5 rounded-full px-3 py-2 text-[13px] text-[var(--text-secondary)] hover:bg-[rgba(var(--ink),0.05)]">
                <Copy size={14} /> Copier
              </button>
            )}
          </div>
        )}
      </section>

      <section className="space-y-2">
        <h3 className="flex items-center gap-2 text-[14px] font-semibold text-[var(--text-primary)]"><Sparkles size={14} /> Analyses IA ({analyses.length})</h3>
        {analyses.length === 0 && (
          <p className="text-[13px] text-[var(--text-tertiary)]">
            Bientôt : Gemini analysera la créa automatiquement, et Claude pourra déposer son analyse via le MCP (« analyse cette créa et enregistre ton verdict »).
          </p>
        )}
        {analyses.map(a => (
          <details key={a.id} className="rounded-2xl bg-[var(--bg-card)] px-4 py-3 shadow-[var(--shadow-card)]">
            <summary className="flex cursor-pointer items-center gap-2 text-[13px]">
              <span className="font-semibold text-[var(--text-primary)]">{a.model || a.source}</span>
              {a.verdict && <span className="ml-auto"><VerdictPill c={a} /></span>}
            </summary>
            <div className="mt-3 space-y-1.5 text-[13px] text-[var(--text-secondary)]">
              {[['Pourquoi', a.reasoning], ['Angle', a.angle], ['Accroche', a.hook], ['Levier', a.emotion], ['Cible', a.target], ['Appel à l’action', a.cta], ['Forces', a.strengths], ['Limites', a.weaknesses], ['Adaptation', a.adaptation]]
                .filter(([, v]) => v).map(([k, v]) => <p key={k}><b>{k} :</b> {v}</p>)}
            </div>
          </details>
        ))}
      </section>

      <div className="flex flex-wrap gap-2 pt-2" style={{ borderTop: '1px solid var(--border-soft)' }}>
        {c.status !== 'ignoree' ? (
          <button type="button" onClick={() => update({ status: 'ignoree' })} className="flex items-center gap-1.5 rounded-full px-3 py-2 text-[13px] text-[var(--text-secondary)] hover:bg-[rgba(var(--ink),0.05)]"><EyeOff size={14} /> Marquer ignorée</button>
        ) : (
          <button type="button" onClick={() => update({ status: c.verdict ? 'analysee' : 'a_analyser' })} className="rounded-full px-3 py-2 text-[13px] text-[var(--text-secondary)] hover:bg-[rgba(var(--ink),0.05)]">Remettre en analyse</button>
        )}
        <button type="button" onClick={remove} className="ml-auto flex items-center gap-1.5 rounded-full px-3 py-2 text-[13px] font-medium" style={{ color: 'var(--red-deep)' }}><Trash2 size={14} /> Supprimer</button>
      </div>
    </SidePanel>
  )
}

export default function Veille({ adding, setAdding, view }) {
  const { state } = useStore()
  const items = useMemo(() => [...(state.creatives || [])].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')), [state.creatives])
  const [filters, setFilters] = useState({ competitor: '', platform: '', verdict: '', search: '' })
  const [openId, setOpenId] = useState(null)
  const { angles } = useMemo(() => veilleStats(items), [items])
  const competitors = useMemo(() => [...new Set(items.map(c => c.competitor).filter(Boolean))].sort(), [items])
  const set = patch => setFilters(f => ({ ...f, ...patch }))

  const visible = useMemo(() => {
    const q = filters.search.toLowerCase()
    return items.filter(c =>
      (!filters.competitor || c.competitor === filters.competitor)
      && (!filters.platform || c.platform === filters.platform)
      && (!filters.verdict || (filters.verdict === 'none' ? !c.verdict : c.verdict === filters.verdict))
      && (!q || `${c.title || ''} ${c.notes || ''} ${c.angle || ''} ${c.hook || ''} ${(c.tags || []).join(' ')} ${c.competitor}`.toLowerCase().includes(q)))
  }, [items, filters])
  const opened = items.find(c => c.id === openId)

  return (
    <div className="space-y-4">
      {view === 'library' && (
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex min-w-[180px] max-w-xs flex-1 items-center gap-2 rounded-full border border-[var(--border-soft)] bg-[rgba(var(--ink),0.04)] px-3 py-2">
            <Search size={14} className="text-[var(--text-tertiary)]" />
            <input className="flex-1 bg-transparent text-[13px] text-[var(--text-primary)] outline-none" placeholder="Rechercher un angle, un mot…" value={filters.search} onChange={e => set({ search: e.target.value })} />
          </label>
          <select className={`${FIELD_BASE} rounded-full`} value={filters.competitor} onChange={e => set({ competitor: e.target.value })}>
            <option value="">Tous les concurrents</option>
            {competitors.map(c => <option key={c}>{c}</option>)}
          </select>
          <select className={`${FIELD_BASE} rounded-full`} value={filters.platform} onChange={e => set({ platform: e.target.value })}>
            <option value="">Tous les réseaux</option>
            {Object.entries(PLATFORMS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <select className={`${FIELD_BASE} rounded-full`} value={filters.verdict} onChange={e => set({ verdict: e.target.value })}>
            <option value="">Tous les verdicts</option>
            <option value="none">À arbitrer</option>
            {Object.entries(VERDICTS).map(([v, s]) => <option key={v} value={v}>{s.label}</option>)}
          </select>
        </div>
      )}

      {view === 'angles' ? (
        angles.length === 0 ? (
          <div className="rounded-[22px] bg-[var(--bg-card)] py-12 text-center text-[14px] text-[var(--text-tertiary)] shadow-[var(--shadow-card)]">Les angles apparaîtront ici dès que tu en renseignes sur tes créas.</div>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {angles.map(([angle, list]) => {
              const comps = [...new Set(list.map(c => c.competitor))]
              const dup = list.filter(c => c.verdict === 'dupliquer').length
              return (
                <div key={angle} className="space-y-2 rounded-[22px] bg-[var(--bg-card)] p-5 shadow-[var(--shadow-card)]">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-[15px] font-semibold text-[var(--text-primary)]">{angle}</p>
                    <Pill bg="var(--brand-100)" color="var(--accent)">{list.length} créa{list.length > 1 ? 's' : ''}</Pill>
                  </div>
                  <p className="text-[12px] text-[var(--text-tertiary)]">
                    {comps.length} concurrent{comps.length > 1 ? 's' : ''} : {comps.join(', ')}
                    {comps.length >= 3 ? ' · angle très utilisé' : comps.length === 1 ? ' · angle peu exploité' : ''}
                  </p>
                  {dup > 0 && <p className="text-[12px] text-[var(--green-deep)]">{dup} verdict{dup > 1 ? 's' : ''} « dupliquer »</p>}
                  <div className="flex flex-wrap gap-1.5">
                    {list.slice(0, 6).map(c => (
                      <button key={c.id} type="button" onClick={() => setOpenId(c.id)} className="rounded-lg bg-[rgba(var(--ink),0.05)] px-2 py-1 text-[12px] text-[var(--text-secondary)]">{c.title || c.competitor}</button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )
      ) : visible.length === 0 ? (
        <div className="space-y-2 rounded-[22px] bg-[var(--bg-card)] py-12 text-center shadow-[var(--shadow-card)]">
          <Film size={28} className="mx-auto text-[var(--text-tertiary)]" />
          <p className="text-[15px] font-semibold text-[var(--text-primary)]">{items.length ? 'Aucune créa pour ces filtres' : 'Ta veille est vide'}</p>
          <p className="text-[13px] text-[var(--text-tertiary)]">Ajoute une vidéo, une image ou un lien de la bibliothèque pub Meta, TikTok, Instagram ou Drive.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {visible.map(c => (
            <button key={c.id} type="button" onClick={() => setOpenId(c.id)} className="group overflow-hidden rounded-[20px] bg-[var(--bg-card)] text-left shadow-[var(--shadow-card)] transition-transform hover:-translate-y-0.5">
              <div className="relative">
                <MediaThumb item={mediaOf(c)} kind={kindOf(c) || c.format} />
                <span className="absolute left-2 top-2"><Pill bg="rgba(15,15,18,0.72)" color="#fff">{PLATFORMS[c.platform]}</Pill></span>
                {c.verdict && <span className="absolute bottom-2 left-2"><VerdictPill c={c} /></span>}
                {c.status === 'ignoree' && <span className="absolute right-2 top-2"><Pill bg="rgba(15,15,18,0.72)" color="#fff">Ignorée</Pill></span>}
              </div>
              <div className="space-y-0.5 p-3">
                <p className="truncate text-[13px] font-semibold text-[var(--text-primary)]">{c.competitor}</p>
                <p className="truncate text-[12px] text-[var(--text-tertiary)]">{c.angle || c.title || FORMATS[c.format]}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {adding && <AddCreative competitors={competitors} onClose={() => setAdding(false)} onCreated={id => { setAdding(false); setOpenId(id) }} />}
      {opened && <CreativeDetail creative={opened} onClose={() => setOpenId(null)} />}
    </div>
  )
}
