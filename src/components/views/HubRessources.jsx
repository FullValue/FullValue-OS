import { useState } from 'react'
import { Plus, Copy, Check, Trash2, ChevronDown, ChevronUp, ExternalLink, FileCode, FileText, Layout, Link, File, Paperclip, X } from 'lucide-react'
import { useStore } from '@/store/useStore'
import Drawer from '@/components/ui/Drawer'
import FileUploader from '@/components/files/FileUploader'
import GlowSearchBar from '@/components/ui/GlowSearchBar'
import FilePreview from '@/components/files/FilePreview'
import YouTubeThumbnail from '@/components/youtube/YouTubeThumbnail'
import YouTubeEmbed from '@/components/youtube/YouTubeEmbed'
import AddYouTubeForm from '@/components/youtube/AddYouTubeForm'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/select'
import { UIBadge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/empty-state'
import { toast, toastUndo } from '@/lib/toast'

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
    <Card hover className="overflow-hidden group">
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: config.color + '15' }}>
            <Icon size={16} style={{ color: config.color }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: config.color + '15', color: config.color }}>{config.label}</span>
              {resource.category && <UIBadge variant="default" className="text-[10px]">{resource.category}</UIBadge>}
              {project && <span className="text-[10px]" style={{ color: project.color }}>{project.emoji} {project.name}</span>}
            </div>
            <h3 className="text-[var(--text-primary)] text-sm font-medium leading-tight">{resource.title}</h3>
            {resource.description && <p className="text-[var(--text-tertiary)] text-xs mt-0.5 line-clamp-1">{resource.description}</p>}
            {resource.fileName && <p className="text-[var(--text-tertiary)] text-xs mt-0.5 truncate font-mono">{resource.fileName}</p>}
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {(resource.type === 'prompt' || resource.type === 'template') && (
              <Button size="xs" variant="subtle" onClick={copy} className={copied ? 'bg-[var(--green-bg)] text-[var(--green-deep)] hover:bg-[var(--green-bg)]' : ''}>
                {copied ? <><Check size={10} /> Copié</> : <><Copy size={10} /> Copier</>}
              </Button>
            )}
            {resource.type === 'lien' && resource.url && (
              <Button asChild size="xs" variant="subtle">
                <a href={resource.url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink size={10} /> Ouvrir
                </a>
              </Button>
            )}
            {!hasFile && (resource.content || resource.url) && (
              <Button size="icon-sm" variant="subtle" onClick={() => setExpanded(!expanded)}>
                {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              </Button>
            )}
            <Button size="icon-sm" variant="ghost" onClick={() => onDelete(resource.id)} className="text-[var(--text-tertiary)] hover:text-[var(--red-deep)] hover:bg-[var(--red-bg)] opacity-0 group-hover:opacity-100">
              <Trash2 size={13} />
            </Button>
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
        <div className="px-4 pb-4 pt-0" style={{ borderTop: '1px solid var(--border-soft)' }}>
          <pre className="text-[var(--text-secondary)] text-xs leading-relaxed whitespace-pre-wrap font-mono mt-3 overflow-x-auto max-h-48">{resource.content || resource.url}</pre>
        </div>
      )}
    </Card>
  )
}

function YouTubeCard({ resource, project, onDelete, onPlay }) {
  return (
    <Card className="overflow-hidden group relative">
      <YouTubeThumbnail youtubeId={resource.youtubeId} title={resource.title} onClick={() => onPlay(resource)} />
      <div className="p-3">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <UIBadge variant="red" className="text-[10px]">▶ YouTube</UIBadge>
          {resource.category && <UIBadge variant="default" className="text-[10px]">{resource.category}</UIBadge>}
          {project && <span className="text-[10px]" style={{ color: project.color }}>{project.emoji} {project.name}</span>}
        </div>
        <h3 className="text-[var(--text-primary)] text-sm font-medium line-clamp-2 leading-tight">{resource.title}</h3>
        {resource.youtubeChannel && <p className="text-[var(--text-tertiary)] text-xs mt-0.5">{resource.youtubeChannel}</p>}
      </div>
      <Button size="icon-sm" variant="ghost" onClick={() => onDelete(resource.id)} className="absolute top-2 right-2 bg-black/60 text-white/70 hover:text-[var(--red-deep)] opacity-0 group-hover:opacity-100">
        <Trash2 size={12} />
      </Button>
    </Card>
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
          <Button key={m} type="button" variant="ghost" size="sm" onClick={() => setMode(m)}
            className={`flex-1 ${mode === m ? 'bg-[var(--violet-bg)] text-[var(--violet-deep)]' : ''}`}>
            {label}
          </Button>
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
                  <Label>Projet</Label>
                  <NativeSelect value={projectId} onChange={e => setProjectId(e.target.value)}>
                    <option value="">Global</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.emoji} {p.name}</option>)}
                  </NativeSelect>
                </div>
                <div>
                  <Label>Catégorie</Label>
                  <NativeSelect value={category} onChange={e => setCategory(e.target.value)}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </NativeSelect>
                </div>
              </div>
              <div>
                <Label>Description</Label>
                <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Courte description…" />
              </div>
            </div>
          }
        />
      )}

      {mode === 'file' && (
        <div>
          {uploadedFile ? (
            <div className="rounded-xl px-4 py-3 flex items-center gap-3" style={{ background: 'var(--green-bg)', border: '1px solid var(--green-solid)' }}>
              <span className="text-lg">✓</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-[var(--text-primary)] truncate">{uploadedFile.fileName}</p>
                <p className="text-xs text-[var(--text-tertiary)]">Fichier prêt</p>
              </div>
              <Button type="button" size="icon-sm" variant="ghost" onClick={() => setUploadedFile(null)}><X size={14} /></Button>
            </div>
          ) : (
            <>
              <FileUploader bucket="resource-files" onSuccess={r => { setUploadedFile(r); setUploadError('') }} onError={msg => setUploadError(msg)} />
              {uploadError && <p className="text-xs text-[var(--red-deep)] mt-2">{uploadError}</p>}
            </>
          )}
        </div>
      )}

      {mode !== 'youtube' && (
        <>
          {mode === 'manual' && (
            <div>
              <Label>Type</Label>
              <div className="flex gap-2 flex-wrap">
                {Object.entries(TYPE_CONFIG).filter(([k]) => k !== 'fichier' && k !== 'youtube').map(([k, v]) => (
                  <Button key={k} variant="ghost" type="button" onClick={() => setType(k)}
                    className="h-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                    style={type === k ? { background: v.color + '20', color: v.color, border: `1px solid ${v.color}40` } : { background: 'rgba(var(--ink),0.05)', color: 'var(--text-secondary)' }}>
                    {v.label}
                  </Button>
                ))}
              </div>
            </div>
          )}

          <div>
            <Label>Titre *</Label>
            <Input autoFocus value={title} onChange={e => setTitle(e.target.value)} placeholder="Nom de la ressource" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Projet</Label>
              <NativeSelect value={projectId} onChange={e => setProjectId(e.target.value)}>
                <option value="">Global</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.emoji} {p.name}</option>)}
              </NativeSelect>
            </div>
            <div>
              <Label>Catégorie</Label>
              <NativeSelect value={category} onChange={e => setCategory(e.target.value)}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </NativeSelect>
            </div>
          </div>

          <div>
            <Label>Description</Label>
            <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Courte description..." />
          </div>

          {mode === 'manual' && (type === 'prompt' || type === 'template') && (
            <div>
              <Label>Contenu</Label>
              <Textarea value={content} onChange={e => setContent(e.target.value)} rows={6} placeholder="Contenu complet..." className="font-mono resize-none" />
            </div>
          )}

          {mode === 'manual' && (type === 'lien' || type === 'doc' || type === 'pdf') && (
            <div>
              <Label>URL</Label>
              <Input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://..." className="font-mono" />
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={mode === 'file' && !uploadedFile} className="flex-1">
              Enregistrer
            </Button>
            <Button type="button" variant="subtle" onClick={onClose} className="flex-1">Annuler</Button>
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

  function handleDelete(id) {
    const snap = state.resources.find(r => r.id === id)
    dispatch({ type: 'DELETE_RESOURCE', payload: id })
    if (snap) toastUndo('Ressource supprimée', () => dispatch({ type: 'RESTORE_ITEMS', payload: { resources: [snap] } }))
  }

  let resources = state.resources
  if (typeFilter !== 'all') resources = resources.filter(r => r.type === typeFilter)
  if (projectFilter !== 'all') resources = resources.filter(r => r.projectId === projectFilter)
  if (search) resources = resources.filter(r => r.title.toLowerCase().includes(search.toLowerCase()) || r.description?.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">Hub Ressources</h1>
          <p className="text-[var(--text-tertiary)] text-sm mt-0.5">{state.resources.length} ressource{state.resources.length > 1 ? 's' : ''}</p>
        </div>
        <Button onClick={() => setAddDrawer(true)}>
          <Plus size={14} /> Ajouter
        </Button>
      </div>

      <div className="flex flex-col gap-3 mb-5">
        <GlowSearchBar value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..." />
        <div className="flex gap-2 flex-wrap">
          <Button variant="ghost" size="sm" onClick={() => setTypeFilter('all')} className={typeFilter === 'all' ? 'bg-[var(--active-bg)] text-[var(--active-text)]' : ''}>Tous</Button>
          {Object.entries(TYPE_CONFIG).map(([k, v]) => (
            <Button key={k} variant="ghost" onClick={() => setTypeFilter(k)} className="h-auto px-3 py-1.5 rounded-lg text-xs font-medium"
              style={typeFilter === k ? { background: v.color + '20', color: v.color } : { color: 'var(--text-tertiary)' }}>
              {v.label}
            </Button>
          ))}
          <div className="ml-auto">
            <NativeSelect value={projectFilter} onChange={e => setProjectFilter(e.target.value)} className="h-8 text-xs">
              <option value="all">Tous les projets</option>
              {state.projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </NativeSelect>
          </div>
        </div>
      </div>

      {resources.length === 0 ? (
        <EmptyState
          icon={Paperclip}
          title="Aucune ressource trouvée"
          description="Ajoute ta première ressource pour la retrouver ici."
          action={<Button onClick={() => setAddDrawer(true)}><Plus size={14} /> Ajouter une ressource</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {resources.map(r => (
            <ResourceCard key={r.id} resource={r} project={getProject(r.projectId)} onDelete={handleDelete} />
          ))}
        </div>
      )}

      <Drawer isOpen={addDrawer} onClose={() => setAddDrawer(false)} title="Nouvelle ressource">
        <ResourceForm
          projects={state.projects}
          onClose={() => setAddDrawer(false)}
          onSubmit={payload => { dispatch({ type: 'ADD_RESOURCE', payload }); toast.success('Ressource ajoutée'); setAddDrawer(false) }}
        />
      </Drawer>
    </div>
  )
}
