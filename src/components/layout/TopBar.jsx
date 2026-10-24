import { Search, Mail, Bell, ExternalLink, RefreshCw, AlertTriangle, CalendarClock, Play, Pause, Square, Maximize2 } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { useAuth } from '@/contexts/AuthContext'
import { useGmail } from '@/contexts/GmailContext'
import { localDateStr } from '@/lib/backup'
import { initials, timeAgo } from '@/lib/priorities'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import AppearanceMenu from '@/components/ui/AppearanceMenu'

const ROUND = 'relative flex h-11 w-11 items-center justify-center rounded-full bg-[var(--bg-card)] text-[var(--text-secondary)] shadow-[var(--shadow-card)] transition-colors hover:text-[var(--text-primary)]'

function CountBadge({ count, color = 'var(--red-deep)' }) {
  if (!count) return null
  return (
    <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-bold text-white" style={{ background: color }}>
      {count > 99 ? '99+' : count}
    </span>
  )
}

function MailMenu({ onNavigate }) {
  const gmail = useGmail()
  const connected = gmail.status === 'connected'
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" className={ROUND} aria-label="Mails importants">
          <Mail size={18} />
          <CountBadge count={connected ? gmail.messages.length : 0} />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[360px] bg-[var(--bg-card)] p-0">
        <div className="flex items-center justify-between border-b border-[var(--border-soft)] px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-[var(--text-primary)]">Mails importants</p>
            <p className="text-[11px] text-[var(--text-tertiary)]">{connected ? `${gmail.account || 'Gmail'} · ${gmail.inboxUnread} non lus` : 'Gmail non connecté'}</p>
          </div>
          {connected && (
            <Button variant="ghost" size="icon-sm" onClick={gmail.refresh} aria-label="Actualiser" loading={gmail.loading}>
              {!gmail.loading && <RefreshCw size={13} />}
            </Button>
          )}
        </div>
        {connected ? (
          gmail.messages.length ? (
            <ul className="max-h-[340px] overflow-y-auto py-1">
              {gmail.messages.map(m => (
                <li key={m.id}>
                  <a href={m.url} target="_blank" rel="noreferrer" className="flex gap-3 px-4 py-2.5 hover:bg-[rgba(var(--ink),0.04)]">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--brand-100)] text-[11px] font-bold text-[var(--brand-700)]">{initials(m.from)}</span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-[13px] font-semibold text-[var(--text-primary)]">{m.from}</span>
                        <span className="shrink-0 text-[10px] text-[var(--text-tertiary)]">{timeAgo(m.date)}</span>
                      </span>
                      <span className="block truncate text-xs text-[var(--text-secondary)]">{m.subject}</span>
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          ) : <p className="px-4 py-6 text-center text-sm text-[var(--text-tertiary)]">Aucun mail important non lu. ✨</p>
        ) : (
          <div className="space-y-3 px-4 py-4">
            <p className="text-sm text-[var(--text-secondary)]">
              {gmail.status === 'expired' ? 'La session Gmail a expiré (1 h).' : 'Connecte Gmail pour voir tes mails importants ici et dans le bandeau « À traiter ».'}
            </p>
            {gmail.status === 'unconfigured'
              ? <Button size="sm" className="w-full" onClick={() => onNavigate('integrations')}>Configurer l'intégration</Button>
              : <Button size="sm" className="w-full" onClick={gmail.connect}>{gmail.status === 'expired' ? 'Reconnecter Gmail' : 'Connecter Gmail'}</Button>}
          </div>
        )}
        {gmail.error && <p className="border-t border-[var(--border-soft)] px-4 py-2 text-[11px] text-[var(--red-deep)]">{gmail.error}</p>}
        {connected && (
          <a href="https://mail.google.com" target="_blank" rel="noreferrer" className="flex items-center justify-center gap-1.5 border-t border-[var(--border-soft)] px-4 py-2.5 text-xs font-medium text-[var(--accent)] hover:bg-[rgba(var(--ink),0.04)]">
            Ouvrir Gmail <ExternalLink size={12} />
          </a>
        )}
      </PopoverContent>
    </Popover>
  )
}

function NotificationsMenu({ onNavigate }) {
  const { state } = useStore()
  const today = localDateStr()
  const open = state.tasks.filter(t => t.status !== 'done')
  const overdue = open.filter(t => t.dueDate && t.dueDate < today)
  const dueToday = open.filter(t => t.dueDate === today)
  const events = [
    ...state.calendarEvents.filter(e => e.date === today).map(e => ({ id: e.id, title: e.title, time: e.startTime })),
    ...state.appointments.filter(a => a.date === today).map(a => ({ id: a.id, title: a.title, time: a.time })),
  ].sort((a, b) => (a.time || '').localeCompare(b.time || ''))
  const count = overdue.length + dueToday.length + events.length

  const Row = ({ Icon, color, title, sub, onClick }) => (
    <li>
      <button type="button" onClick={onClick} className="flex w-full items-start gap-3 px-4 py-2.5 text-left hover:bg-[rgba(var(--ink),0.04)]">
        <Icon size={15} className="mt-0.5 shrink-0" style={{ color }} />
        <span className="min-w-0">
          <span className="block truncate text-[13px] text-[var(--text-primary)]">{title}</span>
          <span className="block text-[11px] text-[var(--text-tertiary)]">{sub}</span>
        </span>
      </button>
    </li>
  )

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" className={ROUND} aria-label="Notifications">
          <Bell size={18} />
          <CountBadge count={count} color={overdue.length ? 'var(--red-deep)' : 'var(--accent)'} />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[340px] bg-[var(--bg-card)] p-0">
        <p className="border-b border-[var(--border-soft)] px-4 py-3 text-sm font-semibold text-[var(--text-primary)]">Notifications</p>
        {count ? (
          <ul className="max-h-[360px] overflow-y-auto py-1">
            {events.map(e => <Row key={e.id} Icon={CalendarClock} color="var(--blue-deep)" title={e.title} sub={`Aujourd'hui${e.time ? ` à ${e.time}` : ''}`} onClick={() => onNavigate('calendrier')} />)}
            {overdue.map(t => <Row key={t.id} Icon={AlertTriangle} color="var(--red-deep)" title={t.title} sub={`En retard depuis le ${new Date(t.dueDate + 'T12:00:00').toLocaleDateString('fr-FR')}`} onClick={() => onNavigate('revue')} />)}
            {dueToday.map(t => <Row key={t.id} Icon={CalendarClock} color="var(--orange-deep)" title={t.title} sub="Échéance aujourd'hui" onClick={() => onNavigate('taches')} />)}
          </ul>
        ) : <p className="px-4 py-6 text-center text-sm text-[var(--text-tertiary)]">Rien d'urgent. Bonne concentration.</p>}
      </PopoverContent>
    </Popover>
  )
}

function fmtClock(s) {
  const h = Math.floor(s / 3600)
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, '0')
  const ss = String(s % 60).padStart(2, '0')
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}

// Chrono toujours visible en haut à droite : lancer, mettre en pause, enregistrer, plein écran.
function TimerChip({ timer }) {
  const { state } = useStore()
  const active = timer.running || timer.paused
  if (!active) {
    return (
      <button type="button" onClick={timer.toggle} className={ROUND} aria-label="Lancer le chrono sur la prochaine action (T)" title="Lancer le chrono sur la prochaine action (T)">
        <Play size={17} />
      </button>
    )
  }
  const project = state.projects.find(p => p.id === timer.project)
  const task = state.tasks.find(t => t.id === timer.task)
  const icon = 'flex h-8 w-8 items-center justify-center rounded-full hover:bg-white/15'
  return (
    <div className="flex h-11 items-center gap-1 rounded-full pl-3 pr-1 text-white shadow-[var(--shadow-card)]" style={{ background: 'var(--hero-dark)' }}>
      <span className={`h-2 w-2 rounded-full ${timer.running ? 'animate-pulse bg-[#4ade80]' : 'bg-white/50'}`} />
      <span className="ml-1 font-mono text-sm font-semibold tabular-nums">{fmtClock(timer.elapsed)}</span>
      <span className="ml-1 hidden max-w-[140px] truncate text-xs text-white/70 md:inline" title={task?.title}>{task?.title || project?.name || 'Focus'}</span>
      <button type="button" onClick={timer.running ? timer.pause : timer.resume} className={icon} aria-label={timer.running ? 'Pause (T)' : 'Reprendre (T)'}>
        {timer.running ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
      </button>
      <button type="button" onClick={timer.finish} className={icon} aria-label="Arrêter et enregistrer la session">
        <Square size={13} fill="currentColor" />
      </button>
      <button type="button" onClick={timer.openFocus} className={`${icon} hidden sm:flex`} aria-label="Mode focus plein écran">
        <Maximize2 size={13} />
      </button>
    </div>
  )
}

export default function TopBar({ onOpenPalette, onNavigate, timer }) {
  const { user } = useAuth()
  const gmail = useGmail()
  const name = user?.user_metadata?.full_name || 'Moi'
  return (
    <header className="mb-4 flex items-center gap-3 rounded-[26px] bg-[var(--bg-sidebar)] px-3 py-2.5 sm:px-4">
      <button
        type="button"
        onClick={onOpenPalette}
        className="flex h-11 min-w-0 flex-1 items-center gap-3 rounded-full bg-[var(--bg-card)] px-4 text-left text-sm text-[var(--text-tertiary)] shadow-[var(--shadow-card)] transition-colors hover:text-[var(--text-secondary)] sm:max-w-md"
      >
        <Search size={17} className="shrink-0" />
        <span className="flex-1 truncate">Rechercher une tâche, un client, une page…</span>
        <kbd className="hidden sm:inline">⌘K</kbd>
      </button>
      <div className="ml-auto flex items-center gap-2">
        {timer && <TimerChip timer={timer} />}
        <MailMenu onNavigate={onNavigate} />
        <NotificationsMenu onNavigate={onNavigate} />
        <AppearanceMenu />
        <div className="ml-1 hidden items-center gap-3 lg:flex">
          <span className="flex h-11 w-11 items-center justify-center rounded-full text-sm font-bold text-white" style={{ background: 'var(--hero-gradient)' }}>{initials(name)}</span>
          <span className="leading-tight">
            <span className="block text-sm font-semibold text-[var(--text-primary)]">{name}</span>
            <span className="block text-xs text-[var(--text-tertiary)]">{gmail.account || 'Accès local'}</span>
          </span>
        </div>
      </div>
    </header>
  )
}
