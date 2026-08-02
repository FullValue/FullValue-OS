import { useState } from 'react'
import { Plus, ExternalLink, Play, FileText, BookOpen, Puzzle, Mic, X, Trash2, Plus as PlusIcon, Paperclip, ArrowLeft, GraduationCap } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/select'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { toast, toastUndo } from '@/lib/toast'
import Drawer from '@/components/ui/Drawer'
import FileUploader from '@/components/files/FileUploader'
import GlowSearchBar from '@/components/ui/GlowSearchBar'
import FilePreview from '@/components/files/FilePreview'
import YouTubeEmbed from '@/components/youtube/YouTubeEmbed'
import YouTubeThumbnail from '@/components/youtube/YouTubeThumbnail'
import AddYouTubeForm from '@/components/youtube/AddYouTubeForm'

const TYPE_CONFIG = {
  video:     { label: 'Vidéo',     Icon: Play,      color: '#F87171' },
  article:   { label: 'Article',   Icon: FileText,  color: '#A8D4F0' },
  livre:     { label: 'Livre',     Icon: BookOpen,  color: '#A8E6BD' },
  framework: { label: 'Framework', Icon: Puzzle,    color: '#FFD66B' },
  podcast:   { label: 'Podcast',   Icon: Mic,       color: '#FFB088' },
  fichier:   { label: 'Fichier',   Icon: Paperclip, color: '#8B7CFF' },
  youtube:   { label: 'YouTube',   Icon: Play,      color: '#F87171' },
}

const STATUS_CONFIG = {
  a_voir:   { label: '🔵 À voir',   color: '#A8D4F0' },
  en_cours: { label: '🟡 En cours', color: '#FFD66B' },
  done:     { label: '🟢 Vu',       color: '#A8E6BD' },
}

const CATEGORIES = ['Business', 'Tech', 'Mindset', 'Productivité', 'Marketing', 'Design', 'Autre']

// ── Cards ───────────────────────────────────────────────────────────────────────

function YouTubeCard({ resource, onClick, onDelete }) {
  const status = STATUS_CONFIG[resource.status] || STATUS_CONFIG.a_voir
  return (
    <Card className="overflow-hidden group relative">
      <YouTubeThumbnail youtubeId={resource.youtubeId} title={resource.title} onClick={() => onClick(resource)} />
      <div className="p-3">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className="text-[9px] font-medium" style={{ color: status.color }}>{status.label}</span>
          <span className="text-[10px] bg-red-500/15 text-red-400 px-2 py-0.5 rounded-full font-medium">▶ YouTube</span>
          {resource.category && <span className="text-[10px] text-white/25 bg-white/5 px-2 py-0.5 rounded-full">{resource.category}</span>}
        </div>
        <h3 className="text-white/90 text-sm font-medium leading-tight line-clamp-2">{resource.title}</h3>
        {resource.youtubeChannel && <p className="text-white/30 text-xs mt-0.5">{resource.youtubeChannel}</p>}
      </div>
      <Button variant="ghost" size="icon-sm" onClick={() => onDelete(resource.id)} className="absolute top-2 right-2 bg-black/60 text-white/40 hover:text-[var(--red-deep)] opacity-0 group-hover:opacity-100">
        <Trash2 size={12} />
      </Button>
    </Card>
  )
}

function LearningCard({ resource, onClick, onDelete }) {
  const config = TYPE_CONFIG[resource.type] || TYPE_CONFIG.article
  const status = STATUS_CONFIG[resource.status] || STATUS_CONFIG.a_voir
  const { Icon } = config

  return (
    <Card hover onClick={() => onClick(resource)} className="text-left w-full cursor-pointer p-4 group">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: config.color + '15' }}>
          <Icon size={16} style={{ color: config.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-[9px] font-medium" style={{ color: status.color }}>{status.label}</span>
            <span className="text-[10px] text-white/25 bg-white/5 px-2 py-0.5 rounded-full">{resource.category}</span>
            {resource.type === 'fichier' && <span className="text-[10px] text-white/25 bg-white/5 px-2 py-0.5 rounded-full">📎</span>}
          </div>
          <h3 className="text-white/90 text-sm font-medium leading-tight truncate">{resource.title}</h3>
          {resource.author && <p className="text-white/35 text-xs mt-0.5">{resource.author}</p>}
          {resource.fileName && <p className="text-white/25 text-xs mt-0.5 truncate font-mono">{resource.fileName}</p>}
          {resource.takeaways?.length > 0 && <p className="text-white/25 text-xs mt-1.5">{resource.takeaways.length} takeaway{resource.takeaways.length > 1 ? 's' : ''}</p>}
        </div>
      </div>
    </Card>
  )
}

// ── Video Detail Page ────────────────────────────────────────────────────────────

function VideoDetailPage({ resource, onBack }) {
  const { dispatch } = useStore()
  const [notes, setNotes] = useState(resource.notes || '')
  const [takeaways, setTakeaways] = useState(resource.takeaways || [])
  const [citations, setCitations] = useState(resource.citations || [])
  const [newTakeaway, setNewTakeaway] = useState('')
  const [newCitation, setNewCitation] = useState('')

  function save(updates) { dispatch({ type: 'UPDATE_LEARNING', payload: { id: resource.id, ...updates } }) }

  function addTakeaway() {
    if (!newTakeaway.trim()) return
    const u = [...takeaways, newTakeaway.trim()]; setTakeaways(u); save({ takeaways: u }); setNewTakeaway('')
  }

  function addCitation() {
    if (!newCitation.trim()) return
    const u = [...citations, newCitation.trim()]; setCitations(u); save({ citations: u }); setNewCitation('')
  }

  const statusOrder = ['a_voir', 'en_cours', 'done']

  return (
    <div className="max-w-5xl mx-auto px-4 py-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" onClick={onBack} className="px-2 text-white/40 hover:text-white/80">
          <ArrowLeft size={15} /> Formation
        </Button>
        <span className="text-white/20">/</span>
        <span className="text-sm text-white/60 truncate">{resource.title}</span>
        <div className="ml-auto flex gap-1.5">
          {statusOrder.map(s => {
            const sc = STATUS_CONFIG[s]
            return (
              <Button key={s} variant="ghost" onClick={() => save({ status: s })}
                className="h-auto py-1.5 px-3 rounded-lg text-xs font-medium"
                style={resource.status === s ? { background: sc.color + '20', color: sc.color, border: `1px solid ${sc.color}40` } : { background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.35)' }}>
                {sc.label}
              </Button>
            )
          })}
        </div>
      </div>

      {/* Split layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-6">
        {/* Left: video + meta */}
        <div>
          <YouTubeEmbed youtubeId={resource.youtubeId} title={resource.title} />
          <div className="mt-4">
            <h1 className="text-lg font-semibold text-white">{resource.title}</h1>
            {resource.youtubeChannel && <p className="text-white/40 text-sm mt-0.5">par {resource.youtubeChannel}</p>}
            <div className="flex gap-2 mt-2">
              {resource.category && <span className="text-[11px] bg-white/8 text-white/40 px-2.5 py-1 rounded-full">{resource.category}</span>}
              <a href={resource.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[11px] text-white/30 hover:text-white/60 px-2.5 py-1 rounded-full bg-white/5 transition-colors">
                <ExternalLink size={10} /> Ouvrir sur YouTube
              </a>
            </div>
          </div>
        </div>

        {/* Right: notes panel */}
        <div className="flex flex-col gap-4">
          {/* Notes */}
          <div className="rounded-2xl p-4" style={{ background: 'var(--c-card)', border: '1px solid var(--c-border)' }}>
            <p className="text-white/30 text-[10px] uppercase tracking-wider mb-2">Notes personnelles</p>
            <Textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              onBlur={() => save({ notes })}
              placeholder="Tes notes sur cette vidéo…"
              rows={6}
              className="bg-transparent border-transparent px-0 resize-none leading-relaxed text-white/70 focus:bg-transparent focus:border-transparent focus:ring-0"
            />
          </div>

          {/* Takeaways */}
          <div className="rounded-2xl p-4" style={{ background: 'var(--c-card)', border: '1px solid var(--c-border)' }}>
            <p className="text-white/30 text-[10px] uppercase tracking-wider mb-3">Takeaways clés</p>
            <div className="flex flex-col gap-1.5 mb-3">
              {takeaways.map((t, i) => (
                <div key={i} className="flex items-start gap-2 group">
                  <span className="text-[var(--violet-deep)] text-xs mt-0.5 flex-shrink-0">•</span>
                  <span className="text-sm text-white/70 flex-1 leading-relaxed">{t}</span>
                  <Button variant="ghost" size="icon-sm" onClick={() => { const u = takeaways.filter((_, j) => j !== i); setTakeaways(u); save({ takeaways: u }) }} className="opacity-0 group-hover:opacity-100 shrink-0 text-white/20 hover:text-[var(--red-deep)]">
                    <X size={11} />
                  </Button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Input value={newTakeaway} onChange={e => setNewTakeaway(e.target.value)} onKeyDown={e => e.key === 'Enter' && addTakeaway()} placeholder="Ajouter un takeaway…" className="flex-1 text-xs" />
              <Button size="icon" onClick={addTakeaway} className="bg-[var(--violet-bg)] text-[var(--violet-deep)] hover:bg-[var(--violet-solid)] shrink-0"><PlusIcon size={13} /></Button>
            </div>
          </div>

          {/* Citations */}
          <div className="rounded-2xl p-4" style={{ background: 'var(--c-card)', border: '1px solid var(--c-border)' }}>
            <p className="text-white/30 text-[10px] uppercase tracking-wider mb-3">Citations</p>
            <div className="flex flex-col gap-1.5 mb-3">
              {citations.map((c, i) => (
                <div key={i} className="flex items-start gap-2 group">
                  <span className="text-yellow text-xs mt-0.5 flex-shrink-0">"</span>
                  <span className="text-sm text-white/60 italic flex-1 leading-relaxed">{c}</span>
                  <Button variant="ghost" size="icon-sm" onClick={() => { const u = citations.filter((_, j) => j !== i); setCitations(u); save({ citations: u }) }} className="opacity-0 group-hover:opacity-100 shrink-0 text-white/20 hover:text-[var(--red-deep)]">
                    <X size={11} />
                  </Button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Input value={newCitation} onChange={e => setNewCitation(e.target.value)} onKeyDown={e => e.key === 'Enter' && addCitation()} placeholder="Ajouter une citation…" className="flex-1 text-xs italic" />
              <Button size="icon" onClick={addCitation} className="bg-[var(--yellow-bg)] text-[var(--yellow-deep)] hover:bg-[var(--yellow-solid)] shrink-0"><PlusIcon size={13} /></Button>
            </div>
          </div>

          <Button variant="ghost" size="sm" onClick={() => { const snap = resource; dispatch({ type: 'DELETE_LEARNING', payload: resource.id }); toastUndo('Ressource supprimée', () => dispatch({ type: 'RESTORE_ITEMS', payload: { learningResources: [snap] } })); onBack() }}
            className="self-start px-2 text-[var(--red-deep)] hover:bg-[var(--red-bg)]">
            <Trash2 size={12} /> Supprimer cette ressource
          </Button>
        </div>
      </div>
    </div>
  )
}

// ── Drawer: detail non-YouTube ──────────────────────────────────────────────────

function LearningDrawer({ resource, onClose }) {
  const { dispatch } = useStore()
  const [notes, setNotes] = useState(resource.notes || '')
  const [takeaways, setTakeaways] = useState(resource.takeaways || [])
  const [citations, setCitations] = useState(resource.citations || [])
  const [newTakeaway, setNewTakeaway] = useState('')
  const [newCitation, setNewCitation] = useState('')

  const config = TYPE_CONFIG[resource.type] || TYPE_CONFIG.article

  function save(updates) { dispatch({ type: 'UPDATE_LEARNING', payload: { id: resource.id, ...updates } }) }
  function addTakeaway() { if (!newTakeaway.trim()) return; const u = [...takeaways, newTakeaway.trim()]; setTakeaways(u); save({ takeaways: u }); setNewTakeaway('') }
  function addCitation() { if (!newCitation.trim()) return; const u = [...citations, newCitation.trim()]; setCitations(u); save({ citations: u }); setNewCitation('') }

  const statusOrder = ['a_voir', 'en_cours', 'done']

  return (
    <div className="flex flex-col gap-5">
      {resource.filePath && (
        <FilePreview bucket="training-files" filePath={resource.filePath} fileName={resource.fileName}
          fileSizeBytes={resource.fileSizeBytes} fileMimeType={resource.fileMimeType}
          onDelete={() => { save({ filePath: null, fileName: null, fileSizeBytes: null, fileMimeType: null }); onClose() }} />
      )}

      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: config.color + '15' }}>
          {(() => { const { Icon } = config; return <Icon size={18} style={{ color: config.color }} /> })()}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-white font-semibold">{resource.title}</h3>
          {resource.author && <p className="text-white/40 text-sm">{resource.author}</p>}
          {resource.url && <a href={resource.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-[var(--violet-deep)] mt-1 hover:opacity-80 transition-opacity"><ExternalLink size={11} /> Ouvrir</a>}
        </div>
      </div>

      <div>
        <p className="text-white/30 text-xs mb-2 uppercase tracking-wider">Statut</p>
        <div className="flex gap-2">
          {statusOrder.map(s => {
            const sc = STATUS_CONFIG[s]
            return <Button key={s} variant="ghost" onClick={() => save({ status: s })} className="flex-1 h-auto py-2 rounded-xl text-xs font-medium"
              style={resource.status === s ? { background: sc.color + '20', color: sc.color, border: `1px solid ${sc.color}40` } : { background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.35)' }}>{sc.label}</Button>
          })}
        </div>
      </div>

      <div>
        <p className="text-white/30 text-xs mb-2 uppercase tracking-wider">Notes personnelles</p>
        <Textarea value={notes} onChange={e => setNotes(e.target.value)} onBlur={() => save({ notes })} placeholder="Tes notes…" rows={5} className="resize-none" />
      </div>

      <div>
        <p className="text-white/30 text-xs mb-2 uppercase tracking-wider">Takeaways clés</p>
        <div className="flex flex-col gap-1.5 mb-2">
          {takeaways.map((t, i) => (
            <div key={i} className="flex items-start gap-2 group">
              <span className="text-[var(--violet-deep)] text-xs mt-0.5">•</span>
              <span className="text-sm text-white/70 flex-1">{t}</span>
              <Button variant="ghost" size="icon-sm" onClick={() => { const u = takeaways.filter((_, j) => j !== i); setTakeaways(u); save({ takeaways: u }) }} className="opacity-0 group-hover:opacity-100 shrink-0 text-white/20 hover:text-[var(--red-deep)]"><X size={11} /></Button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <Input value={newTakeaway} onChange={e => setNewTakeaway(e.target.value)} onKeyDown={e => e.key === 'Enter' && addTakeaway()} placeholder="Ajouter un takeaway…" className="flex-1 text-xs" />
          <Button size="icon" onClick={addTakeaway} className="bg-[var(--violet-bg)] text-[var(--violet-deep)] hover:bg-[var(--violet-solid)] shrink-0"><PlusIcon size={13} /></Button>
        </div>
      </div>

      <div>
        <p className="text-white/30 text-xs mb-2 uppercase tracking-wider">Citations</p>
        <div className="flex flex-col gap-1.5 mb-2">
          {citations.map((c, i) => (
            <div key={i} className="flex items-start gap-2 group">
              <span className="text-yellow text-xs mt-0.5">"</span>
              <span className="text-sm text-white/60 italic flex-1">{c}</span>
              <Button variant="ghost" size="icon-sm" onClick={() => { const u = citations.filter((_, j) => j !== i); setCitations(u); save({ citations: u }) }} className="opacity-0 group-hover:opacity-100 shrink-0 text-white/20 hover:text-[var(--red-deep)]"><X size={11} /></Button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <Input value={newCitation} onChange={e => setNewCitation(e.target.value)} onKeyDown={e => e.key === 'Enter' && addCitation()} placeholder="Ajouter une citation…" className="flex-1 text-xs italic" />
          <Button size="icon" onClick={addCitation} className="bg-[var(--yellow-bg)] text-[var(--yellow-deep)] hover:bg-[var(--yellow-solid)] shrink-0"><PlusIcon size={13} /></Button>
        </div>
      </div>

      <div className="mt-2 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <Button variant="ghost" size="sm" onClick={() => { const snap = resource; dispatch({ type: 'DELETE_LEARNING', payload: resource.id }); toastUndo('Ressource supprimée', () => dispatch({ type: 'RESTORE_ITEMS', payload: { learningResources: [snap] } })); onClose() }} className="px-2 text-[var(--red-deep)] hover:bg-[var(--red-bg)]">
          <Trash2 size={12} /> Supprimer
        </Button>
      </div>
    </div>
  )
}

// ── Add Form (3 modes) ──────────────────────────────────────────────────────────

function AddForm({ onSubmit, onClose }) {
  const [mode, setMode] = useState('link') // 'link' | 'file' | 'youtube'
  const [type, setType] = useState('video')
  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')
  const [url, setUrl] = useState('')
  const [category, setCategory] = useState('Business')
  const [status, setStatus] = useState('a_voir')
  const [uploadedFile, setUploadedFile] = useState(null)
  const [uploadError, setUploadError] = useState('')

  function handleLinkSubmit(e) {
    e.preventDefault()
    if (!title.trim()) return
    const payload = { type: mode === 'file' ? 'fichier' : type, title: title.trim(), author: author.trim(), url: mode === 'file' ? '' : url.trim(), category, status, notes: '', takeaways: [], citations: [] }
    if (uploadedFile) Object.assign(payload, uploadedFile)
    onSubmit(payload)
  }

  const MODES = [
    ['link', '🔗 Lien'],
    ['file', '📎 Fichier'],
    ['youtube', '▶ YouTube'],
  ]

  return (
    <div className="flex flex-col gap-4">
      {/* Mode switch */}
      <div className="flex gap-2">
        {MODES.map(([m, label]) => (
          <Button key={m} variant="ghost" type="button" onClick={() => setMode(m)}
            className="flex-1 h-auto py-2 rounded-xl text-xs font-medium"
            style={mode === m
              ? { background: m === 'youtube' ? 'rgba(239,68,68,0.15)' : 'rgba(139,124,255,0.15)', color: m === 'youtube' ? '#ef4444' : '#8B7CFF', border: `1px solid ${m === 'youtube' ? 'rgba(239,68,68,0.3)' : 'rgba(139,124,255,0.3)'}` }
              : { background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)' }}>
            {label}
          </Button>
        ))}
      </div>

      {mode === 'youtube' ? (
        <AddYouTubeForm
          onCancel={onClose}
          onSubmit={payload => onSubmit({ ...payload, status: 'a_voir', category, notes: '', takeaways: [], citations: [] })}
          extraFields={
            <div className="flex gap-3">
              <div className="flex-1">
                <Label>Catégorie</Label>
                <NativeSelect value={category} onChange={e => setCategory(e.target.value)}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </NativeSelect>
              </div>
              <div className="flex-1">
                <Label>Statut initial</Label>
                <NativeSelect value={status} onChange={e => setStatus(e.target.value)}>
                  {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </NativeSelect>
              </div>
            </div>
          }
        />
      ) : (
        <form onSubmit={handleLinkSubmit} className="flex flex-col gap-4">
          {mode === 'file' && (
            uploadedFile ? (
              <div className="rounded-xl px-4 py-3 flex items-center gap-3" style={{ background: 'rgba(168,230,189,0.1)', border: '1px solid rgba(168,230,189,0.2)' }}>
                <span>✓</span>
                <div className="flex-1 min-w-0"><p className="text-sm text-white/80 truncate">{uploadedFile.fileName}</p></div>
                <Button type="button" variant="ghost" size="icon-sm" onClick={() => setUploadedFile(null)} className="text-white/30 shrink-0"><X size={14} /></Button>
              </div>
            ) : (
              <>
                <FileUploader bucket="training-files" onSuccess={r => { setUploadedFile(r); setUploadError('') }} onError={msg => setUploadError(msg)} />
                {uploadError && <p className="text-xs text-red">{uploadError}</p>}
              </>
            )
          )}

          {mode === 'link' && (
            <div>
              <Label className="mb-1.5">Type</Label>
              <div className="flex gap-2 flex-wrap">
                {Object.entries(TYPE_CONFIG).filter(([k]) => k !== 'fichier' && k !== 'youtube').map(([k, v]) => (
                  <Button key={k} variant="ghost" type="button" onClick={() => setType(k)}
                    className="h-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                    style={type === k ? { background: v.color + '20', color: v.color, border: `1px solid ${v.color}40` } : { background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)' }}>
                    {v.label}
                  </Button>
                ))}
              </div>
            </div>
          )}

          <div>
            <Label>Titre *</Label>
            <Input autoFocus value={title} onChange={e => setTitle(e.target.value)} placeholder="Titre" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Auteur / Source</Label>
              <Input value={author} onChange={e => setAuthor(e.target.value)} placeholder="Auteur…" />
            </div>
            <div>
              <Label>Catégorie</Label>
              <NativeSelect value={category} onChange={e => setCategory(e.target.value)}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </NativeSelect>
            </div>
          </div>

          {mode === 'link' && (
            <div>
              <Label>URL</Label>
              <Input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://…" className="font-mono" />
            </div>
          )}

          <div>
            <Label>Statut initial</Label>
            <div className="flex gap-2">
              {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                <Button key={k} variant="ghost" type="button" onClick={() => setStatus(k)}
                  className="flex-1 h-auto py-2 rounded-xl text-xs font-medium"
                  style={status === k ? { background: v.color + '20', color: v.color, border: `1px solid ${v.color}40` } : { background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.35)' }}>
                  {v.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={mode === 'file' && !uploadedFile} className="flex-1">
              Ajouter
            </Button>
            <Button type="button" variant="subtle" onClick={onClose} className="flex-1">Annuler</Button>
          </div>
        </form>
      )}
    </div>
  )
}

// ── Main ────────────────────────────────────────────────────────────────────────

export default function Formation() {
  const { state, dispatch } = useStore()
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [addDrawer, setAddDrawer] = useState(false)
  const [selectedResource, setSelectedResource] = useState(null)
  const [videoDetail, setVideoDetail] = useState(null)

  let resources = state.learningResources
  if (typeFilter !== 'all') resources = resources.filter(r => r.type === typeFilter)
  if (statusFilter !== 'all') resources = resources.filter(r => r.status === statusFilter)
  if (search) resources = resources.filter(r => r.title.toLowerCase().includes(search.toLowerCase()) || r.author?.toLowerCase().includes(search.toLowerCase()) || r.youtubeChannel?.toLowerCase().includes(search.toLowerCase()))

  const drawerResource = selectedResource ? state.learningResources.find(l => l.id === selectedResource.id) : null
  const videoDetailResource = videoDetail ? state.learningResources.find(l => l.id === videoDetail) : null

  function handleDelete(id) {
    const snap = state.learningResources.find(l => l.id === id)
    dispatch({ type: 'DELETE_LEARNING', payload: id })
    if (snap) toastUndo('Ressource supprimée', () => dispatch({ type: 'RESTORE_ITEMS', payload: { learningResources: [snap] } }))
  }

  // Show video detail page
  if (videoDetailResource) {
    return <VideoDetailPage resource={videoDetailResource} onBack={() => setVideoDetail(null)} />
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-white">Formation</h1>
          <p className="text-white/30 text-sm mt-0.5">{state.learningResources.length} ressource{state.learningResources.length > 1 ? 's' : ''}</p>
        </div>
        <Button onClick={() => setAddDrawer(true)}>
          <Plus size={14} /> Ajouter
        </Button>
      </div>

      <div className="flex flex-col gap-3 mb-5">
        <GlowSearchBar value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher…" />
        <div className="flex gap-2 flex-wrap">
          <Button variant="ghost" onClick={() => setTypeFilter('all')} className={`h-auto px-3 py-1.5 rounded-lg text-xs font-medium ${typeFilter === 'all' ? 'bg-white/10 text-white/90' : 'text-white/30 hover:text-white/60'}`}>Tous</Button>
          {Object.entries(TYPE_CONFIG).filter(([k]) => k !== 'youtube').map(([k, v]) => (
            <Button key={k} variant="ghost" onClick={() => setTypeFilter(k)} className="h-auto px-3 py-1.5 rounded-lg text-xs font-medium"
              style={typeFilter === k ? { background: v.color + '20', color: v.color } : { color: 'rgba(255,255,255,0.3)' }}>
              {v.label}
            </Button>
          ))}
          <Button variant="ghost" onClick={() => setTypeFilter('youtube')} className="h-auto px-3 py-1.5 rounded-lg text-xs font-medium"
            style={typeFilter === 'youtube' ? { background: 'rgba(239,68,68,0.2)', color: '#ef4444' } : { color: 'rgba(255,255,255,0.3)' }}>
            ▶ YouTube
          </Button>
          <div className="ml-auto flex gap-2">
            {Object.entries(STATUS_CONFIG).map(([k, v]) => (
              <Button key={k} variant="ghost" onClick={() => setStatusFilter(statusFilter === k ? 'all' : k)} className="h-auto px-3 py-1.5 rounded-lg text-[11px] font-medium"
                style={statusFilter === k ? { background: v.color + '20', color: v.color } : { color: 'rgba(255,255,255,0.3)' }}>
                {v.label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {resources.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title="Aucune ressource"
          description="Ajoute une vidéo, un article, un livre ou un fichier à ta bibliothèque."
          action={<Button size="sm" onClick={() => setAddDrawer(true)}><Plus size={14} /> Ajouter</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {resources.map(r => r.type === 'youtube'
            ? <YouTubeCard key={r.id} resource={r} onClick={() => setVideoDetail(r.id)} onDelete={handleDelete} />
            : <LearningCard key={r.id} resource={r} onClick={res => setSelectedResource(res)} onDelete={handleDelete} />
          )}
        </div>
      )}

      <Drawer isOpen={!!drawerResource} onClose={() => setSelectedResource(null)} title={drawerResource?.title || ''}>
        {drawerResource && <LearningDrawer resource={drawerResource} onClose={() => setSelectedResource(null)} />}
      </Drawer>

      <Drawer isOpen={addDrawer} onClose={() => setAddDrawer(false)} title="Ajouter une ressource">
        <AddForm onClose={() => setAddDrawer(false)} onSubmit={payload => { dispatch({ type: 'ADD_LEARNING', payload }); toast.success('Ressource ajoutée'); setAddDrawer(false) }} />
      </Drawer>
    </div>
  )
}
