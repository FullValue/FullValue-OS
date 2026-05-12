import { useState } from 'react'
import { Plus, Copy, Check, Trash2, ChevronDown, ChevronUp, ExternalLink, Search, FileCode, FileText, Layout, Link, File, Paperclip, X } from 'lucide-react'
import { useStore } from '@/store/useStore'
import Drawer from '@/components/ui/Drawer'
import FileUploader from '@/components/files/FileUploader'
import FilePreview from '@/components/files/FilePreview'
import YouTubeThumbnail from '@/components/youtube/YouTubeThumbnail'
import YouTubeEmbed from '@/components/youtube/YouTubeEmbed'
import AddYouTubeForm from '@/components/youtube/AddYouTubeForm'

const TYPE_CONFIG = {
  prompt:   { label: 'Prompt IA',  Icon: FileCode,   color: '#8B7CFF' },
  template: { label: 'Template',   Icon: Layout,     color: '#A8E6BD' },
  lien:     { label: 'Lien',       Icon: Link,       color: '#A8D4F0' },
  doc:      { label: 'Document',   Icon: FileText,   color: '#FFD66B' },
  pdf:      { label: 'PDF',        Icon: File,       color: '#FFB088' },
  fichier:  { label: 'Fichier',    Icon: Paperclip,  color: '#8B7CFF' },
  youtube:  { label: 'YouTube',    Icon: File,       color: '#F87171' },
}

const CATEGORIES = ['Stratégie', 'Tech', 'Marketing', 'Commercial', 'Design', 'Autre']

function ResourceCard({ resource, project, onDelete }) {
  const [expanded, setExpanded] = useState(false)
  const [copied, setCopied] = useState(false)

  const config = TYPE_CONFIG[resource.type] || TYPE_CONFIG.doc
  const { Icon } = config

  function copy() {
    navigator.clipboard.writeText(resource.content || resource.url || '').then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2000)
    })
  }

  const hasFile = resource.type === 'fichier' && resource.filePath

  return (
    <div className="rounded-2xl overflow-hidden group" style={{ background: 'var(--c-card)', border: '1px solid var(--c-border)' }}>
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: config.color + '15' }}>
            <Icon size={16} style={{ color: config.color }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: config.color + '15', color: config.color }}>{config.label}</span>
              {resource.category && <span className="text-[10px] text-white/30 bg-white/5 px-2 py-0.5 rounded-full">{resource.category}</span>}
              {project && <span className="text-[10px]" style={{ color: project.color }}>{project.emoji} {project.name}</span>}
            </div>
            <h3 className="text-white/90 text-sm font-medium leading-tight">{resource.title}</h3>
            {resource.description && <p className="text-white/35 text-xs mt-0.5 line-clamp-1">{resource.description}</p>}
            {resource.fileName && <p className="text-white/25 text-xs mt-0.5 truncate font-mono">{resource.fileName}</p>}
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {(resource.type === 'prompt' || resource.type === 'template') && (
              <button onClick={copy} className={`flex items-center gap-1 text-[10px] px-2 py-1.5 rounded-lg transition-all ${copied ? 'bg-green/15 text-green' : 'bg-white/5 hover:bg-white/10 text-white/40 hover:text-white/70'}`}>
                {copied ? <><Check size={10} /> Copié</> : <><Copy size={10} /> Copier</>}
              </button>
            )}
            {resource.type === 'lien' && resource.url && (
              <a href={resource.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[10px] px-2 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 hover:text-white/70 transition-colors">
                <ExternalLink size={10} /> Ouvrir
              </a>
            )}
            {!hasFile && (resource.content || resource.url) && (
              <button onClick={() => setExpanded(!expanded)} className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/30 hover:text-white/60 transition-colors">
                {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              </button>
            )}
            <button onClick={() => onDelete(resource.id)} className="p-1.5 rounded-lg text-white/10 hover:text-red hover:bg-red/10 transition-all opacity-0 group-hover:opacity-100">
              <Trash2 size={13} />
            </button>
          </div>
        </div>

        {/* File preview inline */}
        {hasFile && (
          <div className="mt-3">
            <FilePreview
              bucket="resource-files"
              filePath={resource.filePath}
              fileName={resource.fileName}
              fileSizeBytes={resource.fileSizeBytes}
              fileMimeType={resource.fileMimeType}
            />
          </div>
        )}
      </div>

      {expanded && (resource.content || resource.url) && (
        <div className="px-4 pb-4 pt-0" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
          <pre className="text-white/50 text-xs leading-relaxed whitespace-pre-wrap font-mono mt-3 overflow-x-auto max-h-48">{resource.content || resource.url}</pre>
        </div>
      )}
    </div>
  )
}

function YouTubeCard({ resource, project, onDelete, onPlay }) {
  return (
    <div className="rounded-2xl overflow-hidden group relative" style={{ background: 'var(--c-card)', border: '1px solid var(--c-border)' }}>
      <YouTubeThumbnail youtubeId={resource.youtubeId} title={resource.title} onClick={() => onPlay(resource)} />
      <div className="p-3">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className="text-[10px] bg-red-500/15 text-red-400 px-2 py-0.5 rounded-full font-medium">▶ YouTube</span>
          {resource.category && <span className="text-[10px] text-white/30 bg-white/5 px-2 py-0.5 rounded-full">{resource.category}</span>}
          {project && <span className="text-[10px]" style={{ color: project.color }}>{project.emoji} {project.name}</span>}
        </div>
        <h3 className="text-white/90 text-sm font-medium line-clamp-2 leading-tight">{resource.title}</h3>
        {resource.youtubeChannel && <p className="text-white/30 text-xs mt-0.5">{resource.youtubeChannel}</p>}
      </div>
      <button onClick={() => onDelete(resource.id)} className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 text-white/40 hover:text-red transition-all opacity-0 group-hover:opacity-100">
        <Trash2 size={12} />
      </button>
    </div>
  )
}

function ResourceForm({ onSubmit, onClose, projects }) {
  const [mode, setMode] = useState('manual') // 'manual' | 'file' | 'youtube'
  const [type, setType] = useState('prompt')
  const [title, setTitle] = useState('')
  const [projectId, setProjectId] = useState('')
  const [category, setCategory] = useState('Stratégie')
  const [description, setDescription] = useState('')
  const [content, setContent] = useState('')
  const [url, setUrl] = useState('')
  const [uploadedFile, setUploadedFile] = useState(null)
  const [uploadError, setUploadError] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    if (!title.trim()) return
    const payload = {
      type: mode === 'file' ? 'fichier' : type,
      title: title.trim(),
      projectId: projectId || null,
      category,
      description: description.trim(),
      content: mode === 'file' ? '' : content.trim(),
      url: mode === 'file' ? '' : url.trim(),
      tag: category,
    }
    if (uploadedFile) Object.assign(payload, uploadedFile)
    onSubmit(payload)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* Mode switch */}
      <div className="flex gap-2">
        {[['manual', '✏️ Manuellement'], ['file', '📎 Fichier'], ['youtube', '▶ YouTube']].map(([m, label]) => (
          <button key={m} type="button" onClick={() => setMode(m)}
            className="flex-1 py-2 rounded-xl text-xs font-medium transition-colors"
            style={mode === m ? { background: 'rgba(139,124,255,0.15)', color: '#8B7CFF', border: '1px solid rgba(139,124,255,0.3)' } : { background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)' }}>
            {label}
          </button>
        ))}
      </div>

      {mode === 'youtube' && (
        <AddYouTubeForm
          onCancel={onClose}
          onSubmit={payload => onSubmit({ ...payload, projectId: projectId || null, category, description: description.trim() })}
          extraFields={
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-white/40 text-xs mb-1 block">Projet</label>
                  <select value={projectId} onChange={e => setProjectId(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none">
                    <option value="" style={{ background: '#1A1A20' }}>Global</option>
                    {projects.map(p => <option key={p.id} value={p.id} style={{ background: '#1A1A20' }}>{p.emoji} {p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-white/40 text-xs mb-1 block">Catégorie</label>
                  <select value={category} onChange={e => setCategory(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none">
                    {CATEGORIES.map(c => <option key={c} value={c} style={{ background: '#1A1A20' }}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-white/40 text-xs mb-1 block">Description</label>
                <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Courte description…" className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none" />
              </div>
            </div>
          }
        />
      )}

      {mode === 'file' && (
        <div>
          {uploadedFile ? (
            <div className="rounded-xl px-4 py-3 flex items-center gap-3" style={{ background: 'rgba(168,230,189,0.1)', border: '1px solid rgba(168,230,189,0.2)' }}>
              <span className="text-lg">✓</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white/80 truncate">{uploadedFile.fileName}</p>
                <p className="text-xs text-white/30">Fichier prêt</p>
              </div>
              <button type="button" onClick={() => setUploadedFile(null)} className="text-white/30 hover:text-white/60"><X size={14} /></button>
            </div>
          ) : (
            <>
              <FileUploader bucket="resource-files" onSuccess={r => { setUploadedFile(r); setUploadError('') }} onError={msg => setUploadError(msg)} />
              {uploadError && <p className="text-xs text-red mt-2">{uploadError}</p>}
            </>
          )}
        </div>
      )}

      {mode !== 'youtube' && (
        <>
          {mode === 'manual' && (
            <div>
              <label className="text-white/40 text-xs mb-1.5 block">Type</label>
              <div className="flex gap-2 flex-wrap">
                {Object.entries(TYPE_CONFIG).filter(([k]) => k !== 'fichier' && k !== 'youtube').map(([k, v]) => (
                  <button key={k} type="button" onClick={() => setType(k)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                    style={type === k ? { background: v.color + '20', color: v.color, border: `1px solid ${v.color}40` } : { background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)' }}>
                    {v.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="text-white/40 text-xs mb-1 block">Titre *</label>
            <input autoFocus value={title} onChange={e => setTitle(e.target.value)} placeholder="Nom de la ressource"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:ring-2 focus:ring-violet/40" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-white/40 text-xs mb-1 block">Projet</label>
              <select value={projectId} onChange={e => setProjectId(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none">
                <option value="" style={{ background: '#1A1A20' }}>Global</option>
                {projects.map(p => <option key={p.id} value={p.id} style={{ background: '#1A1A20' }}>{p.emoji} {p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-white/40 text-xs mb-1 block">Catégorie</label>
              <select value={category} onChange={e => setCategory(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none">
                {CATEGORIES.map(c => <option key={c} value={c} style={{ background: '#1A1A20' }}>{c}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="text-white/40 text-xs mb-1 block">Description</label>
            <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Courte description..."
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none" />
          </div>

          {mode === 'manual' && (type === 'prompt' || type === 'template') && (
            <div>
              <label className="text-white/40 text-xs mb-1 block">Contenu</label>
              <textarea value={content} onChange={e => setContent(e.target.value)} rows={6} placeholder="Contenu complet..."
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none resize-none font-mono" />
            </div>
          )}

          {mode === 'manual' && (type === 'lien' || type === 'doc' || type === 'pdf') && (
            <div>
              <label className="text-white/40 text-xs mb-1 block">URL</label>
              <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://..."
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none font-mono" />
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={mode === 'file' && !uploadedFile}
              className="flex-1 bg-violet hover:bg-violet/90 text-white py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-40">
              Enregistrer
            </button>
            <button type="button" onClick={onClose} className="flex-1 bg-white/5 hover:bg-white/8 text-white/50 py-2.5 rounded-xl text-sm transition-colors">Annuler</button>
          </div>
        </>
      )}
    </form>
  )
}

export default function HubRessources() {
  const { state, dispatch } = useStore()
  const [typeFilter, setTypeFilter] = useState('all')
  const [projectFilter, setProjectFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [addDrawer, setAddDrawer] = useState(false)

  function getProject(id) { return state.projects.find(p => p.id === id) }

  let resources = state.resources
  if (typeFilter !== 'all') resources = resources.filter(r => r.type === typeFilter)
  if (projectFilter !== 'all') resources = resources.filter(r => r.projectId === projectFilter)
  if (search) resources = resources.filter(r => r.title.toLowerCase().includes(search.toLowerCase()) || r.description?.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-white">Hub Ressources</h1>
          <p className="text-white/30 text-sm mt-0.5">{state.resources.length} ressource{state.resources.length > 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setAddDrawer(true)} className="flex items-center gap-1.5 text-sm bg-violet/15 hover:bg-violet/25 text-violet px-4 py-2 rounded-xl transition-colors">
          <Plus size={14} /> Ajouter
        </button>
      </div>

      <div className="flex flex-col gap-3 mb-5">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..."
            className="w-full bg-white/3 border border-white/6 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:ring-2 focus:ring-violet/40" />
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setTypeFilter('all')} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${typeFilter === 'all' ? 'bg-white/10 text-white/90' : 'text-white/30 hover:text-white/60'}`}>Tous</button>
          {Object.entries(TYPE_CONFIG).map(([k, v]) => (
            <button key={k} onClick={() => setTypeFilter(k)} className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
              style={typeFilter === k ? { background: v.color + '20', color: v.color } : { color: 'rgba(255,255,255,0.3)' }}>
              {v.label}
            </button>
          ))}
          <div className="ml-auto">
            <select value={projectFilter} onChange={e => setProjectFilter(e.target.value)} className="bg-white/5 border border-white/6 rounded-lg px-2 py-1.5 text-xs text-white/50 focus:outline-none">
              <option value="all" style={{ background: '#1A1A20' }}>Tous les projets</option>
              {state.projects.map(p => <option key={p.id} value={p.id} style={{ background: '#1A1A20' }}>{p.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      {resources.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-3xl mb-3">📎</p>
          <p className="text-white/30 text-sm">Aucune ressource trouvée</p>
          <button onClick={() => setAddDrawer(true)} className="mt-3 text-violet text-sm hover:text-violet/80 transition-colors">+ Ajouter une ressource</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {resources.map(r => (
            <ResourceCard key={r.id} resource={r} project={getProject(r.projectId)} onDelete={id => dispatch({ type: 'DELETE_RESOURCE', payload: id })} />
          ))}
        </div>
      )}

      <Drawer isOpen={addDrawer} onClose={() => setAddDrawer(false)} title="Nouvelle ressource">
        <ResourceForm
          projects={state.projects}
          onClose={() => setAddDrawer(false)}
          onSubmit={payload => { dispatch({ type: 'ADD_RESOURCE', payload }); setAddDrawer(false) }}
        />
      </Drawer>
    </div>
  )
}
