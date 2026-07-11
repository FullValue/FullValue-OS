import { useMemo, useState, useEffect } from 'react'
import {
  Home, Inbox, Calendar, CheckSquare, Timer, BookOpen, GraduationCap,
  Users, FileJson, Sun, Moon, Plus, Zap, Focus, ClipboardCheck,
  Keyboard, Folder, LayoutGrid, Play, Database,
} from 'lucide-react'
import {
  CommandDialog, CommandInput, CommandList, CommandEmpty,
  CommandGroup, CommandItem, CommandShortcut, CommandSeparator,
} from '@/components/ui/command'
import { useStore } from '@/store/useStore'
import { parseQuickAdd, parsePreview } from '@/lib/quickadd'
import { toast } from '@/lib/toast'

const PAGES = [
  { id: 'journee', label: 'Journée', Icon: Home, kbd: 'G J' },
  { id: 'inbox', label: 'Inbox', Icon: Inbox, kbd: 'G I' },
  { id: 'calendrier', label: 'Calendrier', Icon: Calendar, kbd: 'G C' },
  { id: 'taches', label: 'Tâches', Icon: CheckSquare, kbd: 'G T' },
  { id: 'sessions', label: 'Sessions', Icon: Timer, kbd: 'G S' },
  { id: 'projets', label: 'Projets', Icon: LayoutGrid, kbd: 'G P' },
  { id: 'ulycom_clients', label: 'Espace Clients', Icon: Users, kbd: 'G U' },
  { id: 'hub-ressources', label: 'Hub Ressources', Icon: BookOpen, kbd: 'G R' },
  { id: 'formation', label: 'Formation', Icon: GraduationCap, kbd: 'G F' },
  { id: 'import', label: 'Import bulk', Icon: FileJson },
  { id: 'migrate', label: 'Migration Supabase', Icon: Database },
]

function Chip({ children }) {
  return (
    <span className="rounded-md bg-[var(--violet-bg)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--violet-deep)]">
      {children}
    </span>
  )
}

export default function CommandPalette({
  open,
  onOpenChange,
  onNavigate,
  theme,
  onToggleTheme,
  onOpenFocus,
  onOpenClosing,
  onOpenShortcuts,
  onStartTask,
}) {
  const { state, dispatch } = useStore()
  const [query, setQuery] = useState('')

  useEffect(() => {
    if (!open) setQuery('')
  }, [open])

  const parsed = useMemo(
    () => parseQuickAdd(query, state.projects),
    [query, state.projects]
  )
  const chips = useMemo(() => parsePreview(parsed), [parsed])

  const openTasks = useMemo(
    () => state.tasks.filter(t => t.status !== 'done').slice(0, 60),
    [state.tasks]
  )

  const projectById = useMemo(
    () => Object.fromEntries(state.projects.map(p => [p.id, p])),
    [state.projects]
  )

  function close() {
    onOpenChange(false)
  }

  function go(page) {
    onNavigate(page)
    close()
  }

  function createTask() {
    if (!parsed.title) return
    dispatch({
      type: 'ADD_TASK',
      payload: {
        title: parsed.title,
        projectId: parsed.projectId || state.projects[0]?.id,
        status: 'todo',
        impact: parsed.impact,
        ship80: parsed.ship80,
        today: parsed.today,
        dueDate: parsed.dueDate,
        notes: '',
      },
    })
    const proj = parsed.projectId ? projectById[parsed.projectId] : state.projects[0]
    toast.success('Tâche créée', {
      description: `${parsed.title}${proj ? ` — ${proj.name}` : ''}${parsed.dueLabel ? ` · ${parsed.dueLabel}` : ''}`,
    })
    close()
  }

  function captureInbox() {
    if (!query.trim()) return
    dispatch({ type: 'ADD_INBOX', payload: { text: query.trim(), type: 'task' } })
    toast.success('Capturé dans l’Inbox')
    close()
  }

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        value={query}
        onValueChange={setQuery}
        placeholder="Rechercher, naviguer ou créer…  (#projet !haute demain)"
      />
      <CommandList>
        <CommandEmpty>Aucun résultat — Entrée pour créer la tâche.</CommandEmpty>

        {query.trim() && (
          <CommandGroup heading="Créer">
            <CommandItem value={`creer-tache ${query}`} onSelect={createTask}>
              <Plus size={15} className="text-[var(--violet-deep)]" />
              <span className="truncate">
                Créer la tâche <span className="font-medium">« {parsed.title || query} »</span>
              </span>
              <span className="ml-auto flex shrink-0 items-center gap-1">
                {chips.map((c, i) => (
                  <Chip key={i}>{c.label}</Chip>
                ))}
              </span>
            </CommandItem>
            <CommandItem value={`capturer-inbox ${query}`} onSelect={captureInbox}>
              <Zap size={15} className="text-[var(--yellow-deep)]" />
              <span className="truncate">
                Capturer <span className="font-medium">« {query} »</span> dans l’Inbox
              </span>
            </CommandItem>
          </CommandGroup>
        )}

        <CommandGroup heading="Navigation">
          {PAGES.map(p => (
            <CommandItem key={p.id} value={`page ${p.label}`} onSelect={() => go(p.id)}>
              <p.Icon size={15} className="text-[var(--text-tertiary)]" />
              {p.label}
              {p.kbd && <CommandShortcut>{p.kbd}</CommandShortcut>}
            </CommandItem>
          ))}
          {state.projects.map(p => (
            <CommandItem
              key={p.id}
              value={`projet ${p.name}`}
              onSelect={() => go(`projet_${p.id}`)}
            >
              <span className="flex h-[15px] w-[15px] items-center justify-center text-[13px] leading-none">
                {p.emoji || <Folder size={15} />}
              </span>
              {p.name}
              <span className="ml-auto text-[10px] text-[var(--text-tertiary)]">Projet</span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Actions">
          <CommandItem value="action session demarrer timer" onSelect={() => go('sessions')}>
            <Play size={15} className="text-[var(--green-deep)]" />
            Démarrer une session
          </CommandItem>
          <CommandItem
            value="action mode focus"
            onSelect={() => {
              onOpenFocus?.()
              close()
            }}
          >
            <Focus size={15} className="text-[var(--text-tertiary)]" />
            Mode focus
          </CommandItem>
          <CommandItem
            value="action cloture journee bilan"
            onSelect={() => {
              onOpenClosing?.()
              close()
            }}
          >
            <ClipboardCheck size={15} className="text-[var(--text-tertiary)]" />
            Clôturer la journée
          </CommandItem>
          <CommandItem
            value="action theme sombre clair dark light"
            onSelect={() => {
              onToggleTheme?.()
              close()
            }}
          >
            {theme === 'dark' ? (
              <Sun size={15} className="text-[var(--yellow-deep)]" />
            ) : (
              <Moon size={15} className="text-[var(--text-tertiary)]" />
            )}
            {theme === 'dark' ? 'Passer en mode clair' : 'Passer en mode sombre'}
          </CommandItem>
          <CommandItem
            value="action raccourcis clavier aide"
            onSelect={() => {
              onOpenShortcuts?.()
              close()
            }}
          >
            <Keyboard size={15} className="text-[var(--text-tertiary)]" />
            Raccourcis clavier
            <CommandShortcut>?</CommandShortcut>
          </CommandItem>
        </CommandGroup>

        {query.trim().length > 1 && openTasks.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Tâches ouvertes">
              {openTasks.map(t => {
                const proj = projectById[t.projectId]
                return (
                  <CommandItem
                    key={t.id}
                    value={`tache ${t.title} ${proj?.name || ''}`}
                    onSelect={() => {
                      onStartTask?.(t.projectId, t.id)
                      close()
                    }}
                  >
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ background: proj?.color || 'var(--text-tertiary)' }}
                    />
                    <span className="truncate">{t.title}</span>
                    <span className="ml-auto shrink-0 text-[10px] text-[var(--text-tertiary)]">
                      Session ↵
                    </span>
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </>
        )}

        {query.trim().length > 1 && state.clients.length > 0 && (
          <CommandGroup heading="Clients">
            {state.clients.map(c => (
              <CommandItem
                key={c.id}
                value={`client ${c.name} ${c.city || ''}`}
                onSelect={() => go('ulycom_clients')}
              >
                <Users size={15} className="text-[var(--text-tertiary)]" />
                <span className="truncate">{c.name}</span>
                {c.city && (
                  <span className="ml-auto text-[10px] text-[var(--text-tertiary)]">{c.city}</span>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {query.trim().length > 1 && state.resources.length > 0 && (
          <CommandGroup heading="Ressources">
            {state.resources.slice(0, 20).map(r => (
              <CommandItem
                key={r.id}
                value={`ressource ${r.title} ${r.category || ''} ${r.tag || ''}`}
                onSelect={() => go('hub-ressources')}
              >
                <BookOpen size={15} className="text-[var(--text-tertiary)]" />
                <span className="truncate">{r.title}</span>
                <span className="ml-auto text-[10px] text-[var(--text-tertiary)]">{r.type}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>

      <div className="flex items-center gap-3 border-t border-[var(--border-soft)] px-4 py-2 text-[10px] text-[var(--text-tertiary)]">
        <span className="flex items-center gap-1">
          <kbd>↑↓</kbd> naviguer
        </span>
        <span className="flex items-center gap-1">
          <kbd>↵</kbd> valider
        </span>
        <span className="flex items-center gap-1">
          <kbd>esc</kbd> fermer
        </span>
        <span className="ml-auto hidden sm:inline">
          Astuce : <span className="font-mono">#projet !haute demain</span>
        </span>
      </div>
    </CommandDialog>
  )
}
