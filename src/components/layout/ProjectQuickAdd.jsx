// « + » sur chaque projet de la barre latérale : ajoute une tâche, une note ou un lien
// dans l'espace du projet sans quitter la page en cours.
import { useState } from 'react'
import { Plus, CheckSquare, FileText, Link2 } from 'lucide-react'
import { useStore, nanoid } from '@/store/useStore'
import { toast } from '@/lib/toast'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const KINDS = [
  { id: 'task', label: 'Tâche', Icon: CheckSquare, placeholder: 'Nouvelle tâche…' },
  { id: 'note', label: 'Note', Icon: FileText, placeholder: 'Titre de la note…' },
  { id: 'link', label: 'Lien', Icon: Link2, placeholder: 'Nom du lien…' },
]

export default function ProjectQuickAdd({ project, triggerClassName, triggerStyle }) {
  const { dispatch } = useStore()
  const [open, setOpen] = useState(false)
  const [kind, setKind] = useState('task')
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [today, setToday] = useState(false)

  function submit(e) {
    e.preventDefault()
    if (!title.trim() || (kind === 'link' && !url.trim())) return
    if (kind === 'task') {
      dispatch({ type: 'ADD_TASK', payload: { title: title.trim(), projectId: project.id, status: 'todo', impact: 'low', ship80: false, today, dueDate: null, notes: '' } })
    } else if (kind === 'note') {
      const note = { id: nanoid(), title: title.trim(), content: '', createdAt: new Date().toISOString() }
      dispatch({ type: 'UPDATE_PROJECT', payload: { id: project.id, notes: [...(project.notes || []), note] } })
    } else {
      const href = /^https?:\/\//.test(url.trim()) ? url.trim() : `https://${url.trim()}`
      dispatch({ type: 'ADD_RESOURCE', payload: { type: 'lien', title: title.trim(), url: href, projectId: project.id, category: 'Autre', tag: 'Autre', description: '', content: '' } })
    }
    toast.success(`${KINDS.find(k => k.id === kind).label} ajoutée à ${project.name}`)
    setTitle('')
    setUrl('')
    setToday(false)
    setOpen(false)
  }

  const current = KINDS.find(k => k.id === kind)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button" variant="ghost" size="icon-sm"
          onClick={e => e.stopPropagation()}
          className={triggerClassName} style={triggerStyle}
          title={`Ajouter dans ${project.name}`} aria-label={`Ajouter dans ${project.name}`}
        >
          <Plus size={11} />
        </Button>
      </PopoverTrigger>
      <PopoverContent side="right" align="start" className="w-80 bg-[var(--bg-card)]" onClick={e => e.stopPropagation()}>
        <form onSubmit={submit} className="space-y-3">
          <p className="text-sm font-semibold text-[var(--text-primary)]">{project.emoji} Ajouter dans {project.name}</p>
          <div className="flex gap-1 rounded-full bg-[var(--bg-card-soft)] p-1">
            {KINDS.map(k => (
              <button
                key={k.id} type="button" onClick={() => setKind(k.id)}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-full py-1.5 text-xs font-medium transition-colors ${kind === k.id ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-[var(--shadow-card)]' : 'text-[var(--text-tertiary)]'}`}
              >
                <k.Icon size={12} /> {k.label}
              </button>
            ))}
          </div>
          <Input autoFocus value={title} onChange={e => setTitle(e.target.value)} placeholder={current.placeholder} />
          {kind === 'link' && <Input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://…" />}
          {kind === 'task' && (
            <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
              <input type="checkbox" checked={today} onChange={e => setToday(e.target.checked)} /> Priorité du jour
            </label>
          )}
          <Button type="submit" size="sm" className="w-full">Ajouter · Entrée</Button>
        </form>
      </PopoverContent>
    </Popover>
  )
}
