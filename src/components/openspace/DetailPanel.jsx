import { X, ArrowRight, Send, Bot, Inbox as InboxIcon } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'

const SECTION = 'mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-tertiary)]'

function TaskList({ tasks }) {
  const { dispatch } = useStore()
  if (!tasks.length) return <p className="text-xs text-[var(--text-tertiary)]">Aucune tâche ouverte.</p>
  return (
    <ul className="space-y-1.5">
      {tasks.slice(0, 8).map(t => (
        <li key={t.id} className="flex items-start gap-2 text-sm text-[var(--text-primary)]">
          <Checkbox
            checked={t.status === 'done'}
            onCheckedChange={() => dispatch({ type: 'TOGGLE_TASK_DONE', payload: t.id })}
            aria-label={`Terminer « ${t.title} »`}
            className="mt-0.5"
          />
          <span className={t.status === 'done' ? 'line-through text-[var(--text-tertiary)]' : ''}>
            {t.title}
            {t.status === 'inprogress' && <span className="ml-1.5 text-[10px] text-[var(--yellow-deep)]">en cours</span>}
          </span>
        </li>
      ))}
      {tasks.length > 8 && <li className="text-xs text-[var(--text-tertiary)]">+ {tasks.length - 8} autres</li>}
    </ul>
  )
}

// Envoi aux prestataires : affiché partout pour montrer où ça vivra, actif quand Supabase sera branché.
function RequestButton() {
  return (
    <div>
      <Button variant="outline" size="sm" className="w-full" disabled>
        <Send size={13} /> Envoyer une demande à un prestataire
      </Button>
      <p className="mt-1.5 text-[11px] text-[var(--text-tertiary)]">Disponible dès que Supabase sera rebranché.</p>
    </div>
  )
}

function Body({ entity, state, onNavigate }) {
  switch (entity.type) {
    case 'pole': {
      const { pole } = entity.zone
      const open = state.tasks.filter(t => t.projectId === pole.id && t.status !== 'done')
      return (
        <>
          <Header title={`${pole.emoji || ''} ${pole.name}`.trim()} subtitle="Pôle" color={pole.color} />
          {pole.northStar && (
            <div>
              <p className={SECTION}>North Star</p>
              <p className="mb-2 text-sm text-[var(--text-primary)]">{pole.northStar}</p>
              <Progress value={pole.northStarProgress || 0} />
            </div>
          )}
          <div><p className={SECTION}>Tâches ouvertes · {open.length}</p><TaskList tasks={open} /></div>
          <Button size="sm" className="w-full" onClick={() => onNavigate('projet_' + pole.id)}>Ouvrir le pôle <ArrowRight size={13} /></Button>
        </>
      )
    }
    case 'client': {
      const client = state.clients.find(c => c.id === entity.desk.refId)
      if (!client) return null
      const open = state.tasks.filter(t => t.clientId === client.id && t.status !== 'done')
      const unpaid = state.clientInvoices.filter(i => i.clientId === client.id && i.status !== 'paid')
      return (
        <>
          <Header title={client.name} subtitle={[client.activityType, client.city].filter(Boolean).join(' · ') || 'Client'} color={entity.desk.color} />
          <div className="grid grid-cols-2 gap-2 text-center">
            <Stat value={open.length} label="tâches ouvertes" />
            <Stat value={unpaid.length} label="factures non payées" />
          </div>
          <div><p className={SECTION}>Tâches</p><TaskList tasks={open} /></div>
          <Button size="sm" className="w-full" onClick={() => onNavigate('ulycom_clients')}>Ouvrir l'espace clients <ArrowRight size={13} /></Button>
          <RequestButton />
        </>
      )
    }
    case 'task': {
      const task = state.tasks.find(t => t.id === entity.desk.refId)
      if (!task) return null
      return (
        <>
          <Header title={task.title} subtitle={entity.zone.pole.name} color={entity.desk.color} />
          {task.notes && <p className="whitespace-pre-wrap text-sm text-[var(--text-secondary)]">{task.notes}</p>}
          <div className="flex flex-wrap gap-1.5 text-[11px]">
            <Chip>{task.status === 'inprogress' ? 'En cours' : 'À faire'}</Chip>
            {task.impact === 'high' && <Chip>Fort impact</Chip>}
            {task.dueDate && <Chip>Échéance {new Date(task.dueDate).toLocaleDateString('fr-FR')}</Chip>}
          </div>
          <TaskList tasks={[task]} />
          <Button size="sm" variant="outline" className="w-full" onClick={() => onNavigate('projet_' + task.projectId)}>Voir le pôle <ArrowRight size={13} /></Button>
          <RequestButton />
        </>
      )
    }
    case 'agent':
      return (
        <>
          <Header title={entity.agent.name} subtitle="Agent IA" color={entity.agent.color} />
          <p className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
            <Bot size={16} className="mt-0.5 shrink-0" />
            Hors ligne. Le serveur MCP est prêt ; {entity.agent.name} pourra lire et modifier pôles, projets clients, tâches et demandes une fois Supabase rebranché. Ses actions s'afficheront ici.
          </p>
        </>
      )
    case 'hub': {
      const today = state.tasks.filter(t => t.today && t.status !== 'done')
      return (
        <>
          <Header title="Ton bureau" subtitle="Pilotage de la journée" color="#8B7CFF" />
          <div><p className={SECTION}>Priorités du jour · {today.length}</p><TaskList tasks={today} /></div>
          <div className="grid grid-cols-2 gap-2">
            <Button size="sm" onClick={() => onNavigate('journee')}>Journée</Button>
            <Button size="sm" variant="outline" onClick={() => onNavigate('inbox')}><InboxIcon size={13} /> Inbox ({state.inbox.length})</Button>
          </div>
        </>
      )
    }
    case 'meeting':
      return (
        <>
          <Header title="Salle prestataires" subtitle="Demandes & réunions" color="#5BA8E0" />
          <p className="text-sm text-[var(--text-secondary)]">
            Tes prestataires rejoindront l'open space avec leur avatar ici. Chaque demande envoyée apparaîtra sur la table, avec son statut (envoyée, vue, acceptée, livrée).
          </p>
          <RequestButton />
        </>
      )
    default:
      return null
  }
}

function Header({ title, subtitle, color }) {
  return (
    <div className="flex items-center gap-2.5 pr-8">
      <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: color }} />
      <div className="min-w-0">
        <h2 className="truncate text-base font-semibold text-[var(--text-primary)]">{title}</h2>
        <p className="truncate text-xs text-[var(--text-tertiary)]">{subtitle}</p>
      </div>
    </div>
  )
}

function Stat({ value, label }) {
  return (
    <div className="rounded-xl bg-[var(--bg-page)] px-2 py-2">
      <div className="text-lg font-semibold text-[var(--text-primary)]">{value}</div>
      <div className="text-[10px] text-[var(--text-tertiary)]">{label}</div>
    </div>
  )
}

function Chip({ children }) {
  return <span className="rounded-full bg-[var(--bg-page)] px-2 py-0.5 text-[var(--text-secondary)]">{children}</span>
}

export default function DetailPanel({ entity, onClose, onNavigate }) {
  const { state } = useStore()
  if (!entity) return null
  return (
    <Card className="absolute inset-x-2 bottom-2 z-10 max-h-[55%] overflow-y-auto p-4 sm:inset-x-auto sm:bottom-auto sm:right-3 sm:top-3 sm:max-h-[calc(100%-1.5rem)] sm:w-80">
      <Button variant="ghost" size="icon-sm" className="absolute right-2 top-2" onClick={onClose} aria-label="Fermer le panneau">
        <X size={14} />
      </Button>
      <div className="space-y-4">
        <Body entity={entity} state={state} onNavigate={onNavigate} />
      </div>
    </Card>
  )
}
