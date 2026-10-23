// Bandeau « À traiter » : les tâches urgentes et les mails importants en pastilles rondes,
// chacune ouvre une fiche avec les actions utiles (terminer, lancer le focus, transformer un mail en tâche).
import { Plus, Play, Check, ExternalLink, ListPlus, Mail } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { useGmail } from '@/contexts/GmailContext'
import { topTasks, URGENCY_LABEL, URGENCY_COLOR, initials, timeAgo } from '@/lib/priorities'
import { toast } from '@/lib/toast'
import { Popover, PopoverTrigger, PopoverContent, PopoverClose } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'

function Bubble({ children, ring, badge, badgeColor, label }) {
  return (
    <PopoverTrigger asChild>
      <button
        type="button"
        aria-label={label}
        title={label}
        className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--bg-card)] text-lg shadow-[var(--shadow-card)] transition-transform hover:-translate-y-0.5"
        style={{ boxShadow: `0 0 0 2px var(--bg-sidebar), 0 0 0 4px ${ring}` }}
      >
        {children}
        {badge && (
          <span className="absolute -bottom-1 left-1/2 flex h-[18px] min-w-[18px] -translate-x-1/2 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white" style={{ background: badgeColor }}>
            {badge}
          </span>
        )}
      </button>
    </PopoverTrigger>
  )
}

function TaskBubble({ task, level, project, onStartTask }) {
  const { dispatch } = useStore()
  return (
    <Popover>
      <Bubble ring={URGENCY_COLOR[level]} badge={level === 'overdue' ? '!' : null} badgeColor="var(--red-deep)" label={task.title}>
        {project?.emoji || '•'}
      </Bubble>
      <PopoverContent className="w-72 space-y-3 bg-[var(--bg-card)]">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ color: URGENCY_COLOR[level] }}>{URGENCY_LABEL[level]}</p>
          <p className="text-sm font-semibold text-[var(--text-primary)]">{task.title}</p>
          <p className="text-xs text-[var(--text-tertiary)]">
            {project ? `${project.emoji || ''} ${project.name}` : 'Sans projet'}
            {task.dueDate ? ` · échéance ${new Date(task.dueDate + 'T12:00:00').toLocaleDateString('fr-FR')}` : ''}
          </p>
        </div>
        <div className="flex gap-2">
          <PopoverClose asChild>
            <Button size="sm" className="flex-1" onClick={() => onStartTask(task.projectId, task.id)}><Play size={12} /> Focus</Button>
          </PopoverClose>
          <PopoverClose asChild>
            <Button size="sm" variant="outline" className="flex-1" onClick={() => { dispatch({ type: 'TOGGLE_TASK_DONE', payload: task.id }); toast.success('Tâche terminée') }}><Check size={12} /> Terminé</Button>
          </PopoverClose>
        </div>
      </PopoverContent>
    </Popover>
  )
}

function MailBubble({ mail }) {
  const { dispatch } = useStore()
  return (
    <Popover>
      <Bubble ring="var(--blue-deep)" badge={<Mail size={10} />} badgeColor="var(--blue-deep)" label={`${mail.from} — ${mail.subject}`}>
        <span className="text-sm font-bold text-[var(--blue-deep)]">{initials(mail.from)}</span>
      </Bubble>
      <PopoverContent className="w-80 space-y-3 bg-[var(--bg-card)]">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--blue-deep)]">Mail important · {timeAgo(mail.date)}</p>
          <p className="text-sm font-semibold text-[var(--text-primary)]">{mail.subject}</p>
          <p className="text-xs text-[var(--text-tertiary)]">{mail.from} · {mail.fromEmail}</p>
          {mail.snippet && <p className="mt-2 line-clamp-3 text-xs text-[var(--text-secondary)]">{mail.snippet}</p>}
        </div>
        <div className="flex gap-2">
          <Button size="sm" className="flex-1" asChild>
            <a href={mail.url} target="_blank" rel="noreferrer"><ExternalLink size={12} /> Ouvrir</a>
          </Button>
          <PopoverClose asChild>
            <Button size="sm" variant="outline" className="flex-1" onClick={() => {
              dispatch({ type: 'ADD_INBOX', payload: { text: `Répondre à ${mail.from} : ${mail.subject}`, type: 'task' } })
              toast.success("Ajouté à l'Inbox")
            }}><ListPlus size={12} /> En tâche</Button>
          </PopoverClose>
        </div>
      </PopoverContent>
    </Popover>
  )
}

export default function PriorityStrip({ onStartTask, onOpenPalette, onNavigate }) {
  const { state } = useStore()
  const gmail = useGmail()
  const tasks = topTasks(state.tasks, 7)
  const mails = gmail.status === 'connected' ? gmail.messages.slice(0, 6) : []
  const projectsById = Object.fromEntries(state.projects.map(p => [p.id, p]))
  const total = tasks.length + mails.length

  return (
    <section className="mb-5 flex items-center gap-4 overflow-hidden rounded-[26px] bg-[var(--bg-sidebar)] px-4 py-3">
      <div className="hidden shrink-0 sm:block">
        <p className="text-sm font-semibold text-[var(--text-primary)]">À traiter</p>
        <p className="text-[11px] text-[var(--text-tertiary)]">{total ? `${tasks.length} tâche${tasks.length > 1 ? 's' : ''} · ${mails.length} mail${mails.length > 1 ? 's' : ''}` : 'Rien d’urgent'}</p>
      </div>
      <div className="flex min-w-0 flex-1 items-center gap-3 overflow-x-auto overflow-y-hidden px-1 py-2">
        {tasks.map(({ task, level }) => (
          <TaskBubble key={task.id} task={task} level={level} project={projectsById[task.projectId]} onStartTask={onStartTask} />
        ))}
        {tasks.length > 0 && mails.length > 0 && <span className="h-8 w-px shrink-0 bg-[var(--border-medium)]" />}
        {mails.map(m => <MailBubble key={m.id} mail={m} />)}
        {gmail.status !== 'connected' && (
          <button
            type="button"
            onClick={gmail.status === 'unconfigured' ? () => onNavigate('integrations') : gmail.connect}
            className="flex h-12 shrink-0 items-center gap-2 rounded-full border border-dashed border-[var(--border-strong)] px-4 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            <Mail size={14} /> {gmail.status === 'expired' ? 'Reconnecter Gmail' : 'Connecter Gmail'}
          </button>
        )}
      </div>
      <Button variant="outline" size="icon" className="h-11 w-11 shrink-0" onClick={onOpenPalette} aria-label="Capturer ou créer">
        <Plus size={16} />
      </Button>
    </section>
  )
}
