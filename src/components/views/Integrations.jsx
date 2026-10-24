import { Mail, Bot, CalendarDays, MessageSquare, Check, ExternalLink, Copy } from 'lucide-react'
import { useGmail } from '@/contexts/GmailContext'
import { toast } from '@/lib/toast'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

function StatusPill({ tone, children }) {
  const colors = {
    ok: ['var(--green-bg)', 'var(--green-deep)'],
    warn: ['var(--yellow-bg)', 'var(--yellow-deep)'],
    off: ['rgba(var(--ink),0.06)', 'var(--text-tertiary)'],
  }[tone]
  return <span className="rounded-full px-2.5 py-1 text-[11px] font-semibold" style={{ background: colors[0], color: colors[1] }}>{children}</span>
}

function IntegrationCard({ Icon, color, name, description, status, children }) {
  return (
    <Card className="flex flex-col gap-4 p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl" style={{ background: `${color}22`, color }}>
          <Icon size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-[var(--text-primary)]">{name}</p>
          <p className="text-xs text-[var(--text-tertiary)]">{description}</p>
        </div>
        {status}
      </div>
      {children}
    </Card>
  )
}

function CopyLine({ text }) {
  return (
    <div className="flex items-center gap-2 rounded-xl bg-[var(--bg-card-soft)] px-3 py-2 font-mono text-[11px] text-[var(--text-secondary)]">
      <span className="min-w-0 flex-1 truncate">{text}</span>
      <button type="button" aria-label="Copier" onClick={() => { navigator.clipboard?.writeText(text); toast.success('Copié') }} className="shrink-0 hover:text-[var(--text-primary)]">
        <Copy size={12} />
      </button>
    </div>
  )
}

const GMAIL_STATUS = {
  connected: ['ok', 'Connecté'],
  expired: ['warn', 'Session expirée'],
  disconnected: ['off', 'Non connecté'],
  unconfigured: ['warn', 'À configurer'],
}

export default function Integrations() {
  const gmail = useGmail()
  const [tone, label] = GMAIL_STATUS[gmail.status]
  const origin = typeof window !== 'undefined' ? window.location.origin : ''

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[34px] font-semibold leading-tight tracking-tight text-[var(--text-primary)]">Intégrations</h1>
        <p className="text-sm text-[var(--text-tertiary)]">Branche tes outils pour que le Cockpit remonte ce qui compte, et que tes agents IA puissent agir.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <IntegrationCard
          Icon={Mail} color="#EA4335" name="Gmail"
          description="Mails importants non lus dans la barre du haut et le bandeau « À traiter ». Lecture seule."
          status={<StatusPill tone={tone}>{label}</StatusPill>}
        >
          {gmail.status === 'connected' && (
            <div className="space-y-3">
              <p className="flex items-center gap-2 text-sm text-[var(--text-secondary)]"><Check size={14} className="text-[var(--green-deep)]" /> {gmail.account} · {gmail.inboxUnread} non lus · {gmail.messages.length} importants</p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={gmail.refresh} loading={gmail.loading}>Actualiser</Button>
                <Button size="sm" variant="ghost" onClick={gmail.disconnect}>Déconnecter</Button>
              </div>
            </div>
          )}
          {(gmail.status === 'disconnected' || gmail.status === 'expired') && (
            <Button size="sm" className="self-start" onClick={gmail.connect}>{gmail.status === 'expired' ? 'Reconnecter Gmail' : 'Connecter Gmail'}</Button>
          )}
          {gmail.status === 'unconfigured' && (
            <ol className="list-decimal space-y-1.5 pl-4 text-xs text-[var(--text-secondary)]">
              <li>Google Cloud Console → crée un projet, active l'<b>API Gmail</b>.</li>
              <li>Écran de consentement OAuth : type « Externe », ajoute ton adresse en utilisateur test et le scope <code>gmail.readonly</code>.</li>
              <li>Identifiants → <b>ID client OAuth</b> de type « Application Web », avec ces origines JavaScript autorisées :
                <div className="mt-1.5"><CopyLine text={origin} /></div>
              </li>
              <li>Mets l'ID client dans <code>VITE_GOOGLE_CLIENT_ID</code> (fichier <code>.env.local</code> et variables Vercel), puis relance l'app.</li>
            </ol>
          )}
          {gmail.error && <p className="text-xs text-[var(--red-deep)]">{gmail.error}</p>}
        </IntegrationCard>

        <IntegrationCard
          Icon={Bot} color="#1f4fd1" name="Claude & Codex (MCP)"
          description="Tes agents lisent et modifient pôles, projets clients, tâches et demandes via le serveur MCP du Cockpit."
          status={<StatusPill tone="warn">Attend Supabase</StatusPill>}
        >
          <p className="text-xs text-[var(--text-secondary)]">
            Le serveur <code>/api/mcp</code> est déployé. Il s'activera dès que la base Supabase sera branchée : tu génèreras alors un jeton par agent, puis :
          </p>
          <CopyLine text={`claude mcp add --transport http cockpit ${origin}/api/mcp --header "Authorization: Bearer <jeton>"`} />
          <p className="text-xs text-[var(--text-tertiary)]">
            Pour que Claude trie tes mails, branche aussi son connecteur Gmail : il pourra lire tes mails et créer les tâches dans le Cockpit.
          </p>
        </IntegrationCard>

        <IntegrationCard Icon={CalendarDays} color="#4285F4" name="Google Agenda" description="Rendez-vous du jour dans les rappels et les notifications." status={<StatusPill tone="off">Bientôt</StatusPill>} />
        <IntegrationCard Icon={MessageSquare} color="#611f69" name="Slack" description="Messages directs et mentions importantes dans le bandeau « À traiter »." status={<StatusPill tone="off">Bientôt</StatusPill>} />
      </div>

      <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--accent)] hover:underline">
        Ouvrir Google Cloud Console <ExternalLink size={12} />
      </a>
    </div>
  )
}
