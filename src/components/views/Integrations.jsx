import { useState } from 'react'
import { Mail, Bot, CalendarDays, MessageSquare, Check, ExternalLink, Copy, Trash2, RefreshCw, MessageCircle } from 'lucide-react'
import { useStore, nanoid } from '@/store/useStore'
import { useAuth } from '@/contexts/AuthContext'
import { useExternalCalendars } from '@/hooks/useExternalCalendars'
import { useWhatsApp } from '@/contexts/WhatsAppContext'
import { Input } from '@/components/ui/input'
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

function randomToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(24))
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

// Apple Calendar dans les deux sens : abonnement iPhone au Cockpit, import d'un calendrier iCloud public.
function AppleCalendarCard() {
  const { state, dispatch } = useStore()
  const { user } = useAuth()
  const external = useExternalCalendars()
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const token = state.settings?.calendarFeedToken
  const feed = token ? `webcal://${window.location.host}/api/calendar?token=${token}` : null
  const imports = state.settings?.icsImports || []

  function addImport(e) {
    e.preventDefault()
    if (!url.trim()) return
    dispatch({ type: 'UPDATE_SETTINGS', payload: { icsImports: [...imports, { id: nanoid(), name: name.trim() || 'iCloud', url: url.trim(), color: '#5BA8E0' }] } })
    setName('')
    setUrl('')
    toast.success('Calendrier ajouté : il apparaît dans le Calendrier du Cockpit')
  }

  return (
    <IntegrationCard
      Icon={CalendarDays} color="#FF3B30" name="Apple Calendar"
      description="Tes échéances, événements et RDV du Cockpit sur ton iPhone, et tes calendriers iCloud dans le Cockpit."
      status={<StatusPill tone={token || imports.length ? 'ok' : 'off'}>{token || imports.length ? 'Actif' : 'À configurer'}</StatusPill>}
    >
      <div className="space-y-2">
        <p className="text-xs font-semibold text-[var(--text-primary)]">1 · Le Cockpit dans le Calendrier de ton iPhone</p>
        {user?.local ? (
          <p className="text-xs text-[var(--text-tertiary)]">Active d'abord la synchro (bouton en haut) : le lien lit tes données depuis ton compte.</p>
        ) : feed ? (
          <>
            <CopyLine text={feed} />
            <div className="flex flex-wrap gap-2">
              <Button size="sm" asChild><a href={feed}>Ouvrir sur cet appareil</a></Button>
              <Button size="sm" variant="ghost" onClick={() => dispatch({ type: 'UPDATE_SETTINGS', payload: { calendarFeedToken: randomToken() } })}>Révoquer et régénérer</Button>
            </div>
            <p className="text-[11px] text-[var(--text-tertiary)]">Sur l'iPhone : ouvre ce lien dans Safari, ou Réglages → Calendrier → Comptes → Ajouter un compte → Autre → « Ajouter un calendrier avec abonnement ». Mise à jour toutes les 15 min environ.</p>
          </>
        ) : (
          <Button size="sm" onClick={() => dispatch({ type: 'UPDATE_SETTINGS', payload: { calendarFeedToken: randomToken() } })}>Générer mon lien d'abonnement</Button>
        )}
      </div>

      <div className="space-y-2 border-t border-[var(--border-soft)] pt-4">
        <p className="text-xs font-semibold text-[var(--text-primary)]">2 · Tes calendriers iCloud dans le Cockpit</p>
        <p className="text-[11px] text-[var(--text-tertiary)]">Dans Calendrier (Mac ou iPhone) : ⓘ à côté du calendrier → active « Calendrier public » → copie le lien (webcal://…). Les liens Google « adresse secrète au format iCal » marchent aussi.</p>
        {imports.map(src => (
          <div key={src.id} className="flex items-center gap-2 rounded-xl bg-[var(--bg-card-soft)] px-3 py-2 text-xs">
            <span className="h-2 w-2 rounded-full" style={{ background: src.color }} />
            <span className="font-medium text-[var(--text-primary)]">{src.name}</span>
            <span className="min-w-0 flex-1 truncate text-[var(--text-tertiary)]">
              {external.status[src.id]?.error ? <span className="text-[var(--red-deep)]">{external.status[src.id].error}</span> : `${external.status[src.id]?.events?.length ?? '…'} événements`}
            </span>
            <button type="button" aria-label="Retirer" onClick={() => dispatch({ type: 'UPDATE_SETTINGS', payload: { icsImports: imports.filter(i => i.id !== src.id) } })} className="text-[var(--text-tertiary)] hover:text-[var(--red-deep)]"><Trash2 size={13} /></button>
          </div>
        ))}
        <form onSubmit={addImport} className="flex flex-wrap gap-2">
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="Nom (ex. Perso)" className="w-32" />
          <Input value={url} onChange={e => setUrl(e.target.value)} placeholder="webcal://p…-caldav.icloud.com/published/…" className="min-w-[200px] flex-1" />
          <Button type="submit" size="sm" className="h-10">Ajouter</Button>
          {imports.length > 0 && <Button type="button" size="sm" variant="ghost" className="h-10" onClick={external.refresh}><RefreshCw size={13} /></Button>}
        </form>
      </div>
    </IntegrationCard>
  )
}

// WhatsApp Business (API Cloud de Meta) : messages des clients dans le Cockpit, réponses ici ou par MCP.
function WhatsAppCard({ origin }) {
  const wa = useWhatsApp()
  const live = wa.status === 'ready' && wa.conversations.length > 0
  return (
    <IntegrationCard
      Icon={MessageCircle} color="#25D366" name="WhatsApp Business"
      description="Messages de tes clients dans le Cockpit (page Messages, bandeau « À traiter »), réponses ici ou par Claude / Codex."
      status={<StatusPill tone={live ? 'ok' : 'warn'}>{live ? `${wa.conversations.length} conversation${wa.conversations.length > 1 ? 's' : ''}` : 'À configurer'}</StatusPill>}
    >
      <ol className="list-decimal space-y-1.5 pl-4 text-xs text-[var(--text-secondary)]">
        <li>Meta for Developers → crée une app de type « Business », ajoute le produit <b>WhatsApp</b> et ton numéro professionnel.</li>
        <li>Webhook → URL de rappel : <div className="mt-1.5"><CopyLine text={`${origin}/api/whatsapp/webhook`} /></div> Jeton de vérification : la valeur de <code>WHATSAPP_VERIFY_TOKEN</code>. Abonne le champ <b>messages</b>.</li>
        <li>Dans Vercel, ajoute <code>WHATSAPP_TOKEN</code> (jeton permanent d'un utilisateur système), <code>WHATSAPP_PHONE_NUMBER_ID</code>, <code>WHATSAPP_VERIFY_TOKEN</code>, <code>WHATSAPP_APP_SECRET</code>, <code>WHATSAPP_OWNER_EMAIL</code> (l'email de ton compte Cockpit) et <code>SUPABASE_SERVICE_ROLE_KEY</code>.</li>
        <li>Exécute la migration <code>007_whatsapp.sql</code> dans Supabase.</li>
      </ol>
      <p className="text-[11px] text-[var(--text-tertiary)]">Règle WhatsApp : tu peux répondre librement pendant 24 h après le dernier message d'un client ; au-delà, seul un modèle validé par Meta est autorisé. Le guide complet est dans <code>docs/WHATSAPP.md</code>.</p>
    </IntegrationCard>
  )
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

        <AppleCalendarCard />
        <WhatsAppCard origin={origin} />
        <IntegrationCard Icon={MessageSquare} color="#611f69" name="Slack" description="Messages directs et mentions importantes dans le bandeau « À traiter »." status={<StatusPill tone="off">Bientôt</StatusPill>} />
      </div>

      <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--accent)] hover:underline">
        Ouvrir Google Cloud Console <ExternalLink size={12} />
      </a>
    </div>
  )
}
