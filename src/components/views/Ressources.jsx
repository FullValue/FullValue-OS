import { useState } from 'react'
import { Plus, Copy, Trash2, ChevronDown, ChevronUp, Check } from 'lucide-react'
import { useStore } from '../../store/useStore'
import Badge from '../ui/Badge'
import Drawer from '../ui/Drawer'

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
        <label className="text-white/50 text-xs mb-1 block">Type</label>
        <div className="flex gap-2">
          {['prompt', 'template'].map(v => (
            <button
              key={v}
              type="button"
              onClick={() => setType(v)}
              className={`flex-1 py-2 rounded-lg text-xs font-medium capitalize transition-colors ${type === v ? 'bg-accent/25 text-accent border border-accent/40' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}
            >
              {v === 'prompt' ? '💬 Prompt' : '📄 Template'}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-white/50 text-xs mb-1 block">Titre *</label>
        <input
          autoFocus
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Nom de la ressource..."
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-accent/50"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-white/50 text-xs mb-1 block">Projet</label>
          <select
            value={projectId}
            onChange={e => setProjectId(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-accent/50"
          >
            {projects.map(p => (
              <option key={p.id} value={p.id} style={{ background: '#161B22' }}>{p.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-white/50 text-xs mb-1 block">Tag</label>
          <input
            value={tag}
            onChange={e => setTag(e.target.value)}
            placeholder="ex: Prospection"
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-accent/50"
          />
        </div>
      </div>

      <div>
        <label className="text-white/50 text-xs mb-1 block">Contenu *</label>
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="Contenu du prompt ou template..."
          rows={8}
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-accent/50 resize-none font-mono"
        />
      </div>

      <div className="flex gap-3 pt-2">
        <button type="submit" className="flex-1 bg-accent hover:bg-accent/90 text-white py-2.5 rounded-lg text-sm font-medium transition-colors">
          Enregistrer
        </button>
        <button type="button" onClick={onClose} className="flex-1 bg-white/5 hover:bg-white/10 text-white/60 py-2.5 rounded-lg text-sm transition-colors">
          Annuler
        </button>
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
    <div className="bg-white/3 border border-white/5 rounded-xl overflow-hidden hover:border-white/10 transition-all group">
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              <span className="text-[10px] text-white/30 uppercase tracking-wider">
                {resource.type === 'prompt' ? '💬 Prompt' : '📄 Template'}
              </span>
              {resource.tag && (
                <span className="text-[10px] bg-white/5 text-white/40 px-2 py-0.5 rounded-full">{resource.tag}</span>
              )}
            </div>
            <h3 className="text-white/90 text-sm font-medium">{resource.title}</h3>
            {project && <div className="mt-1.5"><Badge color={project.color} name={project.name} /></div>}
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              onClick={copyToClipboard}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all ${copied ? 'bg-emerald/20 text-emerald' : 'bg-white/5 hover:bg-white/10 text-white/50 hover:text-white/80'}`}
            >
              {copied ? <><Check size={12} /> Copié</> : <><Copy size={12} /> Copier</>}
            </button>
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 hover:text-white/70 transition-colors"
            >
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            <button
              onClick={() => onDelete(resource.id)}
              className="p-1.5 rounded-lg text-white/10 hover:text-red-400 hover:bg-red-400/10 transition-all opacity-0 group-hover:opacity-100"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-white/5 px-4 py-3 bg-white/2">
          <pre className="text-white/60 text-xs leading-relaxed whitespace-pre-wrap font-mono overflow-x-auto">
            {resource.content}
          </pre>
        </div>
      )}
    </div>
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

  let resources = state.resources.filter(r => r.type === subTab)
  if (projectFilter !== 'all') resources = resources.filter(r => r.projectId === projectFilter)

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading font-bold text-white text-2xl">Ressources</h1>
        <button
          onClick={() => setAddDrawer(true)}
          className="flex items-center gap-1.5 text-xs bg-accent/15 hover:bg-accent/25 text-accent px-3 py-1.5 rounded-lg transition-colors"
        >
          <Plus size={12} /> Nouveau
        </button>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setSubTab('prompt')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${subTab === 'prompt' ? 'bg-accent/20 text-accent border border-accent/30' : 'bg-white/5 text-white/40 hover:bg-white/8'}`}
        >
          💬 Prompts
        </button>
        <button
          onClick={() => setSubTab('template')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${subTab === 'template' ? 'bg-accent/20 text-accent border border-accent/30' : 'bg-white/5 text-white/40 hover:bg-white/8'}`}
        >
          📄 Templates
        </button>
      </div>

      {/* Project filter */}
      <div className="flex gap-2 mb-5 flex-wrap">
        <button
          onClick={() => setProjectFilter('all')}
          className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${projectFilter === 'all' ? 'bg-white/10 text-white/80' : 'text-white/30 hover:text-white/60'}`}
        >
          Tous
        </button>
        {state.projects.map(p => (
          <button
            key={p.id}
            onClick={() => setProjectFilter(projectFilter === p.id ? 'all' : p.id)}
            className={`px-3 py-1.5 rounded-lg text-xs transition-colors flex items-center gap-1.5 ${projectFilter === p.id ? 'bg-white/10 text-white/80' : 'text-white/30 hover:text-white/60'}`}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: p.color }} />
            {p.name}
          </button>
        ))}
      </div>

      {/* Resource cards */}
      {resources.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-white/30 text-sm mb-3">
            Aucun {subTab === 'prompt' ? 'prompt' : 'template'} — crée ta première ressource
          </p>
          <button onClick={() => setAddDrawer(true)} className="text-accent text-sm hover:text-accent/80 transition-colors">
            + Nouveau {subTab === 'prompt' ? 'prompt' : 'template'}
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {resources.map(resource => (
            <ResourceCard
              key={resource.id}
              resource={resource}
              project={getProject(resource.projectId)}
              onDelete={id => dispatch({ type: 'DELETE_RESOURCE', payload: id })}
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
            setAddDrawer(false)
          }}
        />
      </Drawer>
    </div>
  )
}
