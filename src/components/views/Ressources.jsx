import { useState } from 'react'
import { Plus, Copy, Trash2, ChevronDown, ChevronUp, Check } from 'lucide-react'
import { useStore } from '../../store/useStore'
import Badge from '../ui/Badge'
import Drawer from '../ui/Drawer'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/select'
import { UIBadge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/empty-state'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast, toastUndo } from '@/lib/toast'

function ResourceForm({ onSubmit, onClose, projects, initial = {} }) {
  const [type, setType] = useState(initial.type || 'prompt')
  const [title, setTitle] = useState(initial.title || '')
  const [projectId, setProjectId] = useState(initial.projectId || projects[0]?.id || '')
  const [tag, setTag] = useState(initial.tag || '')
  const [content, setContent] = useState(initial.content || '')

  function handleSubmit(e) {
    e.preventDefault()
    if (!title.trim() || !content.trim()) return
    onSubmit({ type, title: title.trim(), projectId, tag: tag.trim(), content: content.trim() })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <Label>Type</Label>
        <div className="flex gap-2">
          {['prompt', 'template'].map(v => (
            <Button
              key={v}
              type="button"
              variant="ghost"
              onClick={() => setType(v)}
              className={`flex-1 capitalize ${type === v ? 'bg-[var(--violet-bg)] text-[var(--violet-deep)]' : ''}`}
            >
              {v === 'prompt' ? '💬 Prompt' : '📄 Template'}
            </Button>
          ))}
        </div>
      </div>

      <div>
        <Label>Titre *</Label>
        <Input
          autoFocus
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Nom de la ressource..."
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Projet</Label>
          <NativeSelect value={projectId} onChange={e => setProjectId(e.target.value)}>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </NativeSelect>
        </div>
        <div>
          <Label>Tag</Label>
          <Input
            value={tag}
            onChange={e => setTag(e.target.value)}
            placeholder="ex: Prospection"
          />
        </div>
      </div>

      <div>
        <Label>Contenu *</Label>
        <Textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="Contenu du prompt ou template..."
          rows={8}
          className="resize-none font-mono"
        />
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="submit" className="flex-1">
          Enregistrer
        </Button>
        <Button type="button" variant="subtle" onClick={onClose} className="flex-1">
          Annuler
        </Button>
      </div>
    </form>
  )
}

function ResourceCard({ resource, project, onDelete }) {
  const [expanded, setExpanded] = useState(false)
  const [copied, setCopied] = useState(false)

  function copyToClipboard() {
    navigator.clipboard.writeText(resource.content).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <Card hover className="overflow-hidden group">
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              <span className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider">
                {resource.type === 'prompt' ? '💬 Prompt' : '📄 Template'}
              </span>
              {resource.tag && (
                <UIBadge variant="default" className="text-[10px]">{resource.tag}</UIBadge>
              )}
            </div>
            <h3 className="text-[var(--text-primary)] text-sm font-medium">{resource.title}</h3>
            {project && <div className="mt-1.5"><Badge color={project.color} name={project.name} /></div>}
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <Button
              size="sm"
              variant="subtle"
              onClick={copyToClipboard}
              className={copied ? 'bg-[var(--green-bg)] text-[var(--green-deep)] hover:bg-[var(--green-bg)]' : ''}
            >
              {copied ? <><Check size={12} /> Copié</> : <><Copy size={12} /> Copier</>}
            </Button>
            <Button
              size="icon-sm"
              variant="subtle"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </Button>
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={() => onDelete(resource.id)}
              className="text-[var(--text-tertiary)] hover:text-[var(--red-deep)] hover:bg-[var(--red-bg)] opacity-0 group-hover:opacity-100"
            >
              <Trash2 size={14} />
            </Button>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-[var(--border-soft)] px-4 py-3 bg-[var(--bg-card-soft)]">
          <pre className="text-[var(--text-secondary)] text-xs leading-relaxed whitespace-pre-wrap font-mono overflow-x-auto">
            {resource.content}
          </pre>
        </div>
      )}
    </Card>
  )
}

export default function Ressources() {
  const { state, dispatch } = useStore()
  const [subTab, setSubTab] = useState('prompt')
  const [projectFilter, setProjectFilter] = useState('all')
  const [addDrawer, setAddDrawer] = useState(false)

  function getProject(id) {
    return state.projects.find(p => p.id === id)
  }

  function handleDelete(id) {
    const snap = state.resources.find(r => r.id === id)
    dispatch({ type: 'DELETE_RESOURCE', payload: id })
    if (snap) toastUndo('Ressource supprimée', () => dispatch({ type: 'RESTORE_ITEMS', payload: { resources: [snap] } }))
  }

  let resources = state.resources.filter(r => r.type === subTab)
  if (projectFilter !== 'all') resources = resources.filter(r => r.projectId === projectFilter)

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading font-bold text-[var(--text-primary)] text-2xl">Ressources</h1>
        <Button size="sm" onClick={() => setAddDrawer(true)}>
          <Plus size={12} /> Nouveau
        </Button>
      </div>

      {/* Sub-tabs */}
      <div className="mb-4">
        <Tabs value={subTab} onValueChange={setSubTab}>
          <TabsList>
            <TabsTrigger value="prompt">💬 Prompts</TabsTrigger>
            <TabsTrigger value="template">📄 Templates</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Project filter */}
      <div className="flex gap-2 mb-5 flex-wrap">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setProjectFilter('all')}
          className={projectFilter === 'all' ? 'bg-[var(--active-bg)] text-[var(--active-text)]' : ''}
        >
          Tous
        </Button>
        {state.projects.map(p => (
          <Button
            key={p.id}
            variant="ghost"
            size="sm"
            onClick={() => setProjectFilter(projectFilter === p.id ? 'all' : p.id)}
            className={projectFilter === p.id ? 'bg-[var(--active-bg)] text-[var(--active-text)]' : ''}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: p.color }} />
            {p.name}
          </Button>
        ))}
      </div>

      {/* Resource cards */}
      {resources.length === 0 ? (
        <EmptyState
          title={`Aucun ${subTab === 'prompt' ? 'prompt' : 'template'}`}
          description="Crée ta première ressource pour la retrouver ici."
          action={
            <Button onClick={() => setAddDrawer(true)}>
              <Plus size={14} /> Nouveau {subTab === 'prompt' ? 'prompt' : 'template'}
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-3">
          {resources.map(resource => (
            <ResourceCard
              key={resource.id}
              resource={resource}
              project={getProject(resource.projectId)}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Add drawer */}
      <Drawer isOpen={addDrawer} onClose={() => setAddDrawer(false)} title={`Nouvelle ressource`}>
        <ResourceForm
          projects={state.projects}
          initial={{ type: subTab }}
          onClose={() => setAddDrawer(false)}
          onSubmit={payload => {
            dispatch({ type: 'ADD_RESOURCE', payload })
            toast.success('Ressource ajoutée')
            setAddDrawer(false)
          }}
        />
      </Drawer>
    </div>
  )
}
