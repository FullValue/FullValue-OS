import { useEffect, useMemo, useRef, useState } from 'react'
import { Send, MessageCircle, ListPlus, Check, CheckCheck, Clock, AlertTriangle, Search } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { useWhatsApp } from '@/contexts/WhatsAppContext'
import { initials, timeAgo } from '@/lib/priorities'
import { toast } from '@/lib/toast'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

const TITLE = 'text-[34px] font-semibold leading-tight tracking-tight text-[var(--text-primary)]'

function formatPhone(p) {
  return p.startsWith('33') && p.length === 11 ? `+33 ${p.slice(2, 3)} ${p.slice(3).replace(/(\d{2})(?=\d)/g, '$1 ')}` : `+${p}`
}

function StatusIcon({ status }) {
  if (status === 'read') return <CheckCheck size={13} className="text-[#53bdeb]" />
  if (status === 'delivered') return <CheckCheck size={13} />
  if (status === 'failed') return <AlertTriangle size={13} className="text-[var(--red-deep)]" />
  if (status === 'sent') return <Check size={13} />
  return <Clock size={12} />
}

function EmptyState({ status, onNavigate }) {
  const text = {
    local: 'Les messages WhatsApp arrivent dans ton compte : active la synchro (bouton en haut) pour les voir ici.',
    'no-table': 'Exécute la migration 007_whatsapp.sql dans Supabase pour activer les messages.',
    error: 'Impossible de charger les messages pour le moment.',
    ready: "Aucun message pour l'instant. Dès qu'un client écrit à ton numéro WhatsApp Business, la conversation apparaît ici.",
  }[status] || 'Chargement…'
  return (
    <Card className="flex flex-col items-center gap-3 p-10 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl" style={{ background: '#25D36622', color: '#25D366' }}><MessageCircle size={22} /></span>
      <p className="max-w-md text-sm text-[var(--text-secondary)]">{text}</p>
      <Button variant="outline" size="sm" onClick={() => onNavigate('integrations')}>Configuration WhatsApp</Button>
    </Card>
  )
}

export default function Messages({ onNavigate }) {
  const { state, dispatch } = useStore()
  const wa = useWhatsApp()
  const [query, setQuery] = useState('')
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef(null)
  const links = state.settings?.waClientLinks || {}

  const selected = wa.openPhone || wa.conversations[0]?.contact_phone || null
  const conv = wa.conversations.find(c => c.contact_phone === selected)
  const thread = useMemo(
    () => wa.messages.filter(m => m.contact_phone === selected).sort((a, b) => new Date(a.created_at) - new Date(b.created_at)),
    [wa.messages, selected],
  )
  const client = state.clients.find(c => c.id === links[selected])
  const nameOf = c => state.clients.find(cl => cl.id === links[c.contact_phone])?.name || c.contact_name || formatPhone(c.contact_phone)

  // Ouvrir une conversation la marque comme lue.
  const { markRead } = wa
  useEffect(() => { if (conv?.unread) markRead(conv.contact_phone) }, [conv?.contact_phone, conv?.unread, markRead])
  useEffect(() => { bottomRef.current?.scrollIntoView({ block: 'end' }) }, [thread.length, selected])

  async function send() {
    if (!draft.trim() || !selected) return
    setSending(true)
    try {
      await wa.send(selected, draft)
      setDraft('')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSending(false)
    }
  }

  function toTask() {
    const lastIn = [...thread].reverse().find(m => m.direction === 'in')
    dispatch({ type: 'ADD_TASK', payload: {
      title: `Répondre à ${conv ? nameOf(conv) : selected} : ${(lastIn?.body || '').slice(0, 80)}`,
      projectId: (state.projects.find(p => /ulycom/i.test(p.name)) || state.projects[0])?.id, clientId: client?.id, status: 'todo', impact: 'high', today: true, dueDate: null, notes: lastIn?.body || '',
    } })
    toast.success('Tâche ajoutée aux priorités du jour')
  }

  const list = wa.conversations.filter(c => !query || nameOf(c).toLowerCase().includes(query.toLowerCase()) || c.contact_phone.includes(query.replace(/\D/g, '')))

  return (
    <div className="space-y-5">
      <div>
        <h1 className={TITLE}>Messages</h1>
        <p className="text-sm text-[var(--text-tertiary)]">Tes conversations WhatsApp Business avec tes clients. Réponds ici, ou laisse Claude / Codex le faire via le MCP.</p>
      </div>

      {wa.status !== 'ready' || !wa.conversations.length ? <EmptyState status={wa.status} onNavigate={onNavigate} /> : (
        <div className="grid gap-4 lg:grid-cols-[320px_1fr]" style={{ height: 'calc(100dvh - 300px)', minHeight: 480 }}>
          {/* Liste des conversations */}
          <Card className="flex min-h-0 flex-col overflow-hidden border-0 p-3">
            <div className="mb-2 flex items-center gap-2 rounded-full bg-[var(--bg-card-soft)] px-3">
              <Search size={14} className="text-[var(--text-tertiary)]" />
              <Input value={query} onChange={e => setQuery(e.target.value)} placeholder="Rechercher" className="h-9 border-transparent bg-transparent px-0 shadow-none focus:bg-transparent focus:ring-0" />
            </div>
            <ul className="min-h-0 flex-1 space-y-0.5 overflow-y-auto">
              {list.map(c => (
                <li key={c.contact_phone}>
                  <button
                    type="button"
                    onClick={() => wa.setOpenPhone(c.contact_phone)}
                    className={`flex w-full items-center gap-3 rounded-2xl px-2.5 py-2.5 text-left transition-colors ${c.contact_phone === selected ? 'bg-[var(--bg-selection)]' : 'hover:bg-[rgba(var(--ink),0.04)]'}`}
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold" style={{ background: '#25D36622', color: '#128C7E' }}>{initials(nameOf(c))}</span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-sm font-semibold text-[var(--text-primary)]">{nameOf(c)}</span>
                        <span className="shrink-0 text-[10px] text-[var(--text-tertiary)]">{timeAgo(new Date(c.last.created_at).getTime())}</span>
                      </span>
                      <span className="flex items-center gap-2">
                        <span className={`min-w-0 flex-1 truncate text-xs ${c.unread ? 'font-medium text-[var(--text-primary)]' : 'text-[var(--text-tertiary)]'}`}>
                          {c.last.direction === 'out' ? 'Toi : ' : ''}{c.last.body}
                        </span>
                        {c.unread > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold text-white" style={{ background: '#25D366' }}>{c.unread}</span>}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </Card>

          {/* Fil de la conversation */}
          <Card className="flex min-h-0 flex-col overflow-hidden border-0 p-0">
            {conv && (
              <div className="flex flex-wrap items-center gap-3 border-b border-[var(--border-soft)] px-5 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-[var(--text-primary)]">{nameOf(conv)}</p>
                  <p className="text-xs text-[var(--text-tertiary)]">{formatPhone(conv.contact_phone)}{conv.contact_name && client ? ` · ${conv.contact_name}` : ''}</p>
                </div>
                <select
                  value={links[selected] || ''}
                  onChange={e => dispatch({ type: 'UPDATE_SETTINGS', payload: { waClientLinks: { ...links, [selected]: e.target.value || undefined } } })}
                  className="h-9 rounded-full border border-[var(--border-medium)] bg-[var(--bg-surface)] px-3 text-xs text-[var(--text-secondary)]"
                  aria-label="Lier à un client"
                >
                  <option value="">Lier à un client…</option>
                  {state.clients.filter(c => c.status !== 'archived').map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <Button size="sm" variant="outline" onClick={toTask}><ListPlus size={13} /> En tâche</Button>
              </div>
            )}
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-5 py-4" style={{ background: 'var(--bg-card-soft)' }}>
              {thread.map(m => (
                <div key={m.id} className={`flex ${m.direction === 'out' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className="max-w-[75%] rounded-2xl px-3.5 py-2 text-sm shadow-[var(--shadow-card)]"
                    style={m.direction === 'out' ? { background: 'var(--accent)', color: '#fff', borderBottomRightRadius: 6 } : { background: 'var(--bg-card)', color: 'var(--text-primary)', borderBottomLeftRadius: 6 }}
                  >
                    <p className="whitespace-pre-wrap break-words">{m.body}</p>
                    <p className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${m.direction === 'out' ? 'text-white/70' : 'text-[var(--text-tertiary)]'}`}>
                      {m.sent_via?.startsWith('mcp:') && <span>{m.sent_via.slice(4)} ·</span>}
                      {new Date(m.created_at).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      {m.direction === 'out' && <StatusIcon status={m.status} />}
                    </p>
                    {m.error && <p className="mt-1 text-[10px] text-white/80">{m.error}</p>}
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
            {conv && (
              conv.windowOpen ? (
                <div className="flex items-end gap-2 border-t border-[var(--border-soft)] p-3">
                  <Textarea
                    value={draft}
                    onChange={e => setDraft(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
                    placeholder="Écrire une réponse… (Entrée pour envoyer, Maj+Entrée pour aller à la ligne)"
                    rows={2}
                    className="min-h-0 flex-1 resize-none"
                  />
                  <Button onClick={send} loading={sending} disabled={!draft.trim()} aria-label="Envoyer">{!sending && <Send size={15} />}</Button>
                </div>
              ) : (
                <p className="border-t border-[var(--border-soft)] px-5 py-3 text-xs text-[var(--text-tertiary)]">
                  Plus de 24 h depuis le dernier message de ce contact : WhatsApp n'autorise qu'un modèle de message validé par Meta. Il pourra te répondre librement dès qu'il réécrit.
                </p>
              )
            )}
          </Card>
        </div>
      )}
    </div>
  )
}
