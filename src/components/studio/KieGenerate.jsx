// Génération d'assets avec Kie.ai (images, vidéos, voix off) et suivi des générations en cours.
import { useEffect, useRef, useState } from 'react'
import { Check, Loader2, Sparkles } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { toast } from '@/lib/toast'
import { CREATIVE_BUCKET, FIELD, LABEL, isDirectMedia, uploadCreativeFile } from '@/lib/studio'
import { KIE_MODELS, KIE_VOICES, KIE_RETENTION_DAYS, kieModel, createKieTask, getKieTask } from '@/lib/kie'
import { Modal, MediaThumb, Pill } from './StudioUI'

const COLLECTION = 'creativeAssets'
const KIND_LABEL = { image: 'Image', video: 'Vidéo', audio: 'Voix off' }

// URL publique temporaire d'une image du Studio, pour que Kie puisse la lire.
async function publicUrlOf(asset) {
  if (asset.filePath) {
    const { data, error } = await supabase.storage.from(CREATIVE_BUCKET).createSignedUrl(asset.filePath, 7200)
    if (error) throw error
    return data.signedUrl
  }
  return asset.url
}

export function KieGenerateModal({ onClose, onCreated, initial }) {
  const { state, dispatch } = useStore()
  const imageAssets = (state.creativeAssets || []).filter(a => a.kind === 'image' && a.status !== 'generating' && a.status !== 'failed' && (a.filePath || isDirectMedia(a.url || '')))
  const [kind, setKind] = useState(initial?.kind || 'image')
  const [modelId, setModelId] = useState(initial?.model || KIE_MODELS.find(m => m.kind === (initial?.kind || 'image')).id)
  const model = kieModel(modelId)
  const [form, setForm] = useState({ prompt: initial?.prompt || '', ratio: '9:16', quality: 'basic', duration: '5', sound: false, voice: KIE_VOICES[0][0], title: '', projectId: '' })
  const [refs, setRefs] = useState(initial?.refs || [])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const set = patch => setForm(f => ({ ...f, ...patch }))
  const ratio = model.ratios?.includes(form.ratio) ? form.ratio : model.ratios?.[0]

  function pickKind(k) {
    setKind(k)
    setModelId(KIE_MODELS.find(m => m.kind === k).id)
    setRefs([])
  }
  function toggleRef(id) {
    const max = model.refs?.[1] || 0
    setRefs(r => r.includes(id) ? r.filter(x => x !== id) : max === 1 ? [id] : r.length < max ? [...r, id] : r)
  }

  async function submit(e) {
    e.preventDefault()
    setError(null)
    if (!form.prompt.trim()) return setError(model.voice ? 'Écris le texte à lire.' : 'Décris ce que tu veux générer.')
    if (model.refs && refs.length < model.refs[0]) return setError(`Choisis ${model.refs[0] === 1 && model.refs[1] === 1 ? 'une image' : 'au moins une image'} de référence.`)
    setBusy(true)
    try {
      const refUrls = model.refs ? await Promise.all(refs.map(id => publicUrlOf(imageAssets.find(a => a.id === id)))) : undefined
      const input = model.build({ ...form, prompt: form.prompt.trim(), ratio, refs: refUrls })
      const { taskId } = await createKieTask(model.id, input)
      const id = crypto.randomUUID()
      dispatch({ type: 'ADD_ENTITY', payload: { collection: COLLECTION, item: {
        id,
        title: form.title.trim() || form.prompt.trim().slice(0, 60),
        kind: model.kind, source: 'kie', status: 'generating',
        prompt: form.prompt.trim(), tags: ['kie', model.kind], projectId: form.projectId || null,
        url: null, filePath: null, fileType: null,
        kie: { taskId, model: model.id, input: { ...input, image_urls: undefined }, refs, startedAt: new Date().toISOString() },
      } } })
      toast.success('Génération lancée', { description: `${model.label} · ça prend de quelques secondes à quelques minutes.` })
      onCreated?.(id)
    } catch (err) {
      setError(err?.message || 'Génération impossible.')
      setBusy(false)
    }
  }

  return (
    <Modal title="Générer avec Kie.ai" onClose={onClose} width="max-w-xl">
      <form onSubmit={submit} className="space-y-4">
        <div className="flex gap-0.5 rounded-xl bg-[rgba(var(--ink),0.05)] p-1">
          {Object.entries(KIND_LABEL).map(([k, l]) => (
            <button type="button" key={k} onClick={() => pickKind(k)} className={`flex-1 rounded-lg py-1.5 text-[13px] font-semibold ${kind === k ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm' : 'text-[var(--text-tertiary)]'}`}>{l}</button>
          ))}
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {KIE_MODELS.filter(m => m.kind === kind).map(m => (
            <button type="button" key={m.id} onClick={() => { setModelId(m.id); setRefs([]) }} className="rounded-2xl px-3 py-2.5 text-left transition-all"
              style={modelId === m.id ? { background: 'var(--brand-100)', boxShadow: '0 0 0 2px var(--accent)' } : { background: 'rgba(var(--ink),0.04)' }}>
              <p className="text-[13px] font-semibold text-[var(--text-primary)]">{m.label}</p>
              <p className="text-[11px] text-[var(--text-tertiary)]">{m.hint}</p>
            </button>
          ))}
        </div>

        {model.refs && (
          <div>
            <span className={LABEL}>Image{model.refs[1] > 1 ? 's' : ''} de référence ({refs.length}/{model.refs[1]})</span>
            {imageAssets.length === 0 ? (
              <p className="rounded-xl px-3 py-2.5 text-[12px]" style={{ background: 'var(--yellow-bg)', color: 'var(--yellow-deep)' }}>Ajoute d’abord une image dans tes assets (fichier ou lien direct).</p>
            ) : (
              <div className="grid max-h-48 grid-cols-5 gap-2 overflow-y-auto p-0.5">
                {imageAssets.map(a => (
                  <button type="button" key={a.id} onClick={() => toggleRef(a.id)} className="relative overflow-hidden rounded-xl" style={{ boxShadow: refs.includes(a.id) ? '0 0 0 2px var(--accent)' : 'none' }}>
                    <MediaThumb item={{ filePath: a.filePath, url: a.url, fileType: a.fileType }} kind="image" className="aspect-square" />
                    {refs.includes(a.id) && <span className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--accent)] text-white"><Check size={12} /></span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div>
          <span className={LABEL}>{model.voice ? 'Texte à lire' : 'Prompt'}</span>
          <textarea autoFocus className={`${FIELD} min-h-[110px]`} value={form.prompt} onChange={e => set({ prompt: e.target.value })}
            placeholder={model.voice ? 'Le texte de la voix off…' : model.kind === 'video' ? 'Décris la scène, le mouvement de caméra, l’ambiance…' : 'Décris l’image : sujet, style, lumière, cadrage…'} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          {model.ratios && (
            <div>
              <span className={LABEL}>Format</span>
              <select className={FIELD} value={ratio} onChange={e => set({ ratio: e.target.value })}>{model.ratios.map(r => <option key={r}>{r}</option>)}</select>
            </div>
          )}
          {model.quality && (
            <div>
              <span className={LABEL}>Qualité</span>
              <select className={FIELD} value={form.quality} onChange={e => set({ quality: e.target.value })}>
                <option value="basic">2K</option><option value="high">4K</option>
              </select>
            </div>
          )}
          {model.duration && (
            <div>
              <span className={LABEL}>Durée</span>
              <select className={FIELD} value={form.duration} onChange={e => set({ duration: e.target.value })}><option value="5">5 s</option><option value="10">10 s</option></select>
            </div>
          )}
          {model.sound && (
            <label className="flex items-end gap-2 pb-2 text-[13px] text-[var(--text-secondary)]">
              <input type="checkbox" checked={form.sound} onChange={e => set({ sound: e.target.checked })} /> Avec son (coûte 2× plus)
            </label>
          )}
          {model.voice && (
            <div>
              <span className={LABEL}>Voix</span>
              <select className={FIELD} value={form.voice} onChange={e => set({ voice: e.target.value })}>{KIE_VOICES.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select>
            </div>
          )}
          <div>
            <span className={LABEL}>Projet</span>
            <select className={FIELD} value={form.projectId} onChange={e => set({ projectId: e.target.value })}>
              <option value="">— Aucun —</option>
              {state.projects.map(p => <option key={p.id} value={p.id}>{p.emoji} {p.name}</option>)}
            </select>
          </div>
          <div className="col-span-2">
            <span className={LABEL}>Titre (facultatif)</span>
            <input className={FIELD} value={form.title} onChange={e => set({ title: e.target.value })} placeholder="Par défaut : le début du prompt" />
          </div>
        </div>

        {error && <p className="rounded-xl px-3 py-2.5 text-[13px]" style={{ background: 'var(--red-bg)', color: 'var(--red-deep)' }}>{error}</p>}
        <button className="flex w-full items-center justify-center gap-2 rounded-full bg-[var(--accent)] py-2.5 text-[14px] font-semibold text-white disabled:opacity-60" disabled={busy}>
          {busy ? <><Loader2 size={15} className="animate-spin" /> Envoi à Kie.ai…</> : <><Sparkles size={15} /> Générer</>}
        </button>
        <p className="text-center text-[11px] text-[var(--text-tertiary)]">Consomme des crédits Kie.ai. Le résultat apparaît dans tes assets dès qu’il est prêt.</p>
      </form>
    </Modal>
  )
}

// Suit les générations en cours (toutes les 6 s) et range les résultats dans les assets.
// Le fichier est recopié dans le stockage du cockpit, car Kie le supprime au bout de 14 jours.
export function KiePoller() {
  const { state, dispatch } = useStore()
  const { user } = useAuth()
  const pending = (state.creativeAssets || []).filter(a => a.status === 'generating' && a.kie?.taskId)
  const pendingRef = useRef(pending)
  useEffect(() => { pendingRef.current = pending })
  const busy = useRef(false)
  const hasPending = pending.length > 0

  useEffect(() => {
    if (!hasPending) return
    const update = (id, patch) => dispatch({ type: 'UPDATE_ENTITY', payload: { collection: COLLECTION, id, patch } })

    async function archive(asset, resultUrl) {
      if (!user || user.local) return null
      try {
        const res = await fetch(resultUrl)
        if (!res.ok) return null
        const blob = await res.blob()
        const ext = (resultUrl.split('?')[0].split('.').pop() || 'bin').slice(0, 5)
        const file = new File([blob], `kie-${asset.id}.${ext}`, { type: blob.type })
        return { filePath: await uploadCreativeFile(file, user.id, 'kie'), fileType: blob.type, fileSize: blob.size }
      } catch {
        return null // CORS ou stockage absent : on garde le lien Kie (valable 14 jours)
      }
    }

    async function tick() {
      if (busy.current) return
      busy.current = true
      try {
        for (const asset of pendingRef.current) {
          let info
          try { info = await getKieTask(asset.kie.taskId) } catch { continue }
          if (info.state === 'success' && info.resultUrls?.length) {
            const [first, ...others] = info.resultUrls
            const saved = await archive(asset, first)
            const expiresAt = new Date(Date.now() + KIE_RETENTION_DAYS * 86400000).toISOString()
            update(asset.id, { status: 'ready', url: first, ...(saved || { expiresAt }), kie: { ...asset.kie, credits: info.credits, doneAt: new Date().toISOString() } })
            others.forEach((url, i) => dispatch({ type: 'ADD_ENTITY', payload: { collection: COLLECTION, item: {
              title: `${asset.title} (${i + 2})`, kind: asset.kind, source: 'kie', status: 'ready', url, expiresAt,
              prompt: asset.prompt, tags: asset.tags, projectId: asset.projectId, kie: { ...asset.kie, doneAt: new Date().toISOString() },
            } } }))
            toast.success(`${asset.kind === 'video' ? 'Vidéo' : asset.kind === 'audio' ? 'Voix off' : 'Image'} prête`, { description: asset.title })
          } else if (info.state === 'fail') {
            update(asset.id, { status: 'failed', error: info.failMsg || 'Échec de la génération.' })
            toast.error('Génération échouée', { description: info.failMsg || asset.title })
          } else if (info.progress != null) {
            update(asset.id, { kie: { ...asset.kie, progress: info.progress } })
          }
        }
      } finally {
        busy.current = false
      }
    }

    tick()
    const t = setInterval(tick, 6000)
    return () => clearInterval(t)
  }, [hasPending, user, dispatch])

  return null
}

export function KieStatusPill({ asset }) {
  if (asset.status === 'generating') return <Pill bg="var(--accent)" color="#fff"><Loader2 size={10} className="animate-spin" /> Génération{asset.kie?.progress ? ` ${asset.kie.progress}%` : '…'}</Pill>
  if (asset.status === 'failed') return <Pill bg="var(--red-bg)" color="var(--red-deep)">Échec</Pill>
  if (asset.source === 'kie') return <Pill bg="var(--accent)" color="#fff">Kie.ai</Pill>
  return null
}
