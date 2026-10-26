// Assets : la matière première des montages (rushs, images, voix, musiques, scripts).
// Importés à la main aujourd'hui ; générés par Kie.ai ou déposés par Claude (MCP) ensuite.
import { useMemo, useState } from 'react'
import { Copy, ExternalLink, Film, Loader2, Plus, Search, Trash2 } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from '@/lib/toast'
import { ASSET_KINDS, ASSET_SOURCES, FIELD, FIELD_BASE, LABEL, isDirectMedia, kindFromMime, uploadCreativeFile, removeCreativeFiles } from '@/lib/studio'
import { Modal, SidePanel, MediaThumb, MediaPreview, FileOrLink, Pill } from './StudioUI'

const COLLECTION = 'creativeAssets'

function AddAsset({ onClose, onCreated }) {
  const { state, dispatch } = useStore()
  const { user } = useAuth()
  const canUpload = !!user && !user.local
  const [mode, setMode] = useState(canUpload ? 'file' : 'link')
  const [file, setFile] = useState(null)
  const [link, setLink] = useState('')
  const [form, setForm] = useState({ title: '', kind: 'video', prompt: '', tags: '', projectId: '' })
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
        filePath = await uploadCreativeFile(file, user.id, 'assets')
      }
      const id = crypto.randomUUID()
      dispatch({ type: 'ADD_ENTITY', payload: { collection: COLLECTION, item: {
        id,
        title: form.title.trim() || file?.name || 'Asset sans titre',
        kind: file ? kindFromMime(file.type) : form.kind,
        source: mode === 'file' ? 'upload' : 'lien',
        filePath, fileType: file?.type || null, fileSize: file?.size || null,
        url: mode === 'link' ? link.trim() : null,
        prompt: form.prompt.trim() || null,
        tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
        projectId: form.projectId || null,
      } } })
      onCreated(id)
    } catch (err) {
      setBusy(null)
      setError(err?.message || 'Ajout impossible.')
    }
  }

  return (
    <Modal title="Ajouter un asset" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <FileOrLink mode={mode} setMode={setMode} file={file} setFile={setFile} url={link} setUrl={setLink} canUpload={canUpload} urlPlaceholder="Lien direct, Drive, Dropbox, Frame.io…" />
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <span className={LABEL}>Titre</span>
            <input className={FIELD} value={form.title} onChange={e => set({ title: e.target.value })} placeholder="Ex. Plan produit en main, voix off v2…" />
          </div>
          {mode === 'link' && (
            <div>
              <span className={LABEL}>Type</span>
              <select className={FIELD} value={form.kind} onChange={e => set({ kind: e.target.value })}>
                {Object.entries(ASSET_KINDS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          )}
          <div className={mode === 'link' ? '' : 'col-span-2'}>
            <span className={LABEL}>Projet</span>
            <select className={FIELD} value={form.projectId} onChange={e => set({ projectId: e.target.value })}>
              <option value="">— Aucun —</option>
              {state.projects.map(p => <option key={p.id} value={p.id}>{p.emoji} {p.name}</option>)}
            </select>
          </div>
          <div className="col-span-2">
            <span className={LABEL}>Prompt / description</span>
            <textarea className={`${FIELD} min-h-[70px]`} value={form.prompt} onChange={e => set({ prompt: e.target.value })} placeholder="Ce que contient l’asset, ou le prompt qui l’a généré" />
          </div>
          <div className="col-span-2">
            <span className={LABEL}>Tags</span>
            <input className={FIELD} value={form.tags} onChange={e => set({ tags: e.target.value })} placeholder="hook, b-roll, voix, musique" />
          </div>
        </div>
        {error && <p className="rounded-xl px-3 py-2.5 text-[13px]" style={{ background: 'var(--red-bg)', color: 'var(--red-deep)' }}>{error}</p>}
        <button className="flex w-full items-center justify-center gap-2 rounded-full bg-[var(--accent)] py-2.5 text-[14px] font-semibold text-white disabled:opacity-60" disabled={!!busy}>
          {busy ? <><Loader2 size={15} className="animate-spin" /> {busy}</> : 'Ajouter aux assets'}
        </button>
      </form>
    </Modal>
  )
}

function AssetDetail({ asset: a, onClose, onAddToMontage }) {
  const { state, dispatch } = useStore()
  const update = patch => dispatch({ type: 'UPDATE_ENTITY', payload: { collection: COLLECTION, id: a.id, patch } })
  const project = state.projects.find(p => p.id === a.projectId)
  const usedIn = (state.montages || []).filter(m => (m.clips || []).some(c => c.assetId === a.id))
  const previewable = a.filePath || isDirectMedia(a.url || '')

  async function remove() {
    if (usedIn.length && !window.confirm(`Cet asset est utilisé dans ${usedIn.length} montage(s). Le supprimer quand même ?`)) return
    if (!usedIn.length && !window.confirm('Supprimer cet asset ?')) return
    await removeCreativeFiles([a.filePath]).catch(() => {})
    dispatch({ type: 'DELETE_ENTITY', payload: { collection: COLLECTION, id: a.id } })
    onClose()
  }

  return (
    <SidePanel onClose={onClose}>
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-tertiary)]">{ASSET_KINDS[a.kind]} · {ASSET_SOURCES[a.source] || a.source}{project ? ` · ${project.emoji || ''} ${project.name}` : ''}</p>
          <input className="w-full bg-transparent text-[20px] font-semibold text-[var(--text-primary)] outline-none" value={a.title} onChange={e => update({ title: e.target.value })} />
        </div>
        <button type="button" onClick={onClose} className="rounded-full px-3 py-1.5 text-[13px] text-[var(--text-secondary)] hover:bg-[rgba(var(--ink),0.05)]">Fermer</button>
      </div>
      {previewable ? <MediaPreview item={{ filePath: a.filePath, url: a.url, fileType: a.fileType }} kind={a.kind} /> : null}
      {a.url && (
        <a href={a.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-[13px] font-semibold text-[var(--accent)]"><ExternalLink size={14} /> Ouvrir le lien</a>
      )}
      <div>
        <span className={LABEL}>Prompt / description</span>
        <textarea className={`${FIELD} min-h-[80px]`} value={a.prompt || ''} onChange={e => update({ prompt: e.target.value || null })} />
        {a.prompt && (
          <button type="button" onClick={() => { navigator.clipboard.writeText(a.prompt); toast.success('Prompt copié') }} className="mt-1.5 flex items-center gap-1.5 text-[12px] text-[var(--text-secondary)]"><Copy size={12} /> Copier le prompt</button>
        )}
      </div>
      <div>
        <span className={LABEL}>Tags</span>
        <input className={FIELD} value={(a.tags || []).join(', ')} onChange={e => update({ tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) })} />
      </div>
      <div className="space-y-2">
        <span className={LABEL}>Montages</span>
        {usedIn.length ? usedIn.map(m => <p key={m.id} className="text-[13px] text-[var(--text-secondary)]">🎬 {m.title}</p>) : <p className="text-[13px] text-[var(--text-tertiary)]">Pas encore utilisé.</p>}
        {(state.montages || []).length > 0 && (
          <select className={FIELD_BASE} value="" onChange={e => { if (e.target.value) { onAddToMontage(e.target.value, a.id); toast.success('Ajouté au montage') } }}>
            <option value="">+ Ajouter à un montage…</option>
            {state.montages.map(m => <option key={m.id} value={m.id}>{m.title}</option>)}
          </select>
        )}
      </div>
      <div className="flex pt-2" style={{ borderTop: '1px solid var(--border-soft)' }}>
        <button type="button" onClick={remove} className="ml-auto flex items-center gap-1.5 rounded-full px-3 py-2 text-[13px] font-medium" style={{ color: 'var(--red-deep)' }}><Trash2 size={14} /> Supprimer</button>
      </div>
    </SidePanel>
  )
}

export default function Assets({ adding, setAdding, onAddToMontage }) {
  const { state } = useStore()
  const items = useMemo(() => [...(state.creativeAssets || [])].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')), [state.creativeAssets])
  const [kind, setKind] = useState('')
  const [search, setSearch] = useState('')
  const [openId, setOpenId] = useState(null)
  const visible = items.filter(a => (!kind || a.kind === kind)
    && (!search || `${a.title} ${a.prompt || ''} ${(a.tags || []).join(' ')}`.toLowerCase().includes(search.toLowerCase())))
  const opened = items.find(a => a.id === openId)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex min-w-[180px] max-w-xs flex-1 items-center gap-2 rounded-full border border-[var(--border-soft)] bg-[rgba(var(--ink),0.04)] px-3 py-2">
          <Search size={14} className="text-[var(--text-tertiary)]" />
          <input className="flex-1 bg-transparent text-[13px] text-[var(--text-primary)] outline-none" placeholder="Rechercher un asset, un prompt…" value={search} onChange={e => setSearch(e.target.value)} />
        </label>
        {[['', 'Tous'], ...Object.entries(ASSET_KINDS)].map(([v, l]) => (
          <button key={v || 'all'} type="button" onClick={() => setKind(v)} className="rounded-full px-3 py-1.5 text-[12px] font-semibold transition-all"
            style={kind === v ? { background: 'var(--text-primary)', color: 'var(--bg-surface)' } : { color: 'var(--text-tertiary)', border: '1px solid var(--border-soft)' }}>{l}</button>
        ))}
      </div>
      {visible.length === 0 ? (
        <div className="space-y-2 rounded-[22px] bg-[var(--bg-card)] py-12 text-center shadow-[var(--shadow-card)]">
          <Film size={28} className="mx-auto text-[var(--text-tertiary)]" />
          <p className="text-[15px] font-semibold text-[var(--text-primary)]">{items.length ? 'Aucun asset pour ces filtres' : 'Aucun asset pour l’instant'}</p>
          <p className="text-[13px] text-[var(--text-tertiary)]">Importe tes rushs, images, voix et musiques. Bientôt, Kie.ai les générera directement ici.</p>
          <button type="button" onClick={() => setAdding(true)} className="mx-auto mt-2 flex items-center gap-1.5 rounded-full bg-[var(--accent)] px-4 py-2 text-[13px] font-semibold text-white"><Plus size={14} /> Ajouter un asset</button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {visible.map(a => (
            <button key={a.id} type="button" onClick={() => setOpenId(a.id)} className="overflow-hidden rounded-[20px] bg-[var(--bg-card)] text-left shadow-[var(--shadow-card)] transition-transform hover:-translate-y-0.5">
              <div className="relative">
                <MediaThumb item={{ filePath: a.filePath, url: isDirectMedia(a.url || '') ? a.url : null, fileType: a.fileType }} kind={a.kind} className="aspect-square" />
                <span className="absolute left-2 top-2"><Pill bg="rgba(15,15,18,0.72)" color="#fff">{ASSET_KINDS[a.kind]}</Pill></span>
                {a.source === 'kie' && <span className="absolute right-2 top-2"><Pill bg="var(--accent)" color="#fff">Kie.ai</Pill></span>}
              </div>
              <div className="p-3">
                <p className="truncate text-[13px] font-semibold text-[var(--text-primary)]">{a.title}</p>
                <p className="truncate text-[11px] text-[var(--text-tertiary)]">{(a.tags || []).join(' · ') || ASSET_SOURCES[a.source]}</p>
              </div>
            </button>
          ))}
        </div>
      )}
      {adding && <AddAsset onClose={() => setAdding(false)} onCreated={id => { setAdding(false); setOpenId(id) }} />}
      {opened && <AssetDetail asset={opened} onClose={() => setOpenId(null)} onAddToMontage={onAddToMontage} />}
    </div>
  )
}
