import { useState } from 'react'
import { Plus, Trash2, FileDown, Send, CheckCircle2, Mail, ArrowRightLeft, Settings2, X } from 'lucide-react'
import { useStore, nanoid } from '@/store/useStore'
import { localDateStr } from '@/lib/backup'
import { INVOICE_STATUS, QUOTE_STATUS, addDays, displayStatus, eur, kindOf, nextNumber, printableHtml, revenue, totals } from '@/lib/billing'
import { toast, toastUndo } from '@/lib/toast'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

const TITLE = 'text-[34px] font-semibold leading-tight tracking-tight text-[var(--text-primary)]'
const TONES = {
  off: ['rgba(var(--ink),0.06)', 'var(--text-tertiary)'],
  info: ['var(--blue-bg)', 'var(--blue-deep)'],
  ok: ['var(--green-bg)', 'var(--green-deep)'],
  bad: ['var(--red-bg)', 'var(--red-deep)'],
}
const SELECT = 'h-10 w-full rounded-xl border border-[var(--border-medium)] bg-[var(--bg-surface)] px-3 text-sm text-[var(--text-primary)]'

function Pill({ status, kind }) {
  const cfg = (kind === 'quote' ? QUOTE_STATUS : INVOICE_STATUS)[status] || { label: status, tone: 'off' }
  const [bg, fg] = TONES[cfg.tone]
  return <span className="rounded-full px-2.5 py-1 text-[11px] font-semibold" style={{ background: bg, color: fg }}>{cfg.label}</span>
}

function openPdf(doc, client, billing) {
  const w = window.open('', '_blank')
  if (!w) { toast.error('Autorise les fenêtres pop-up pour générer le PDF.'); return }
  w.document.write(printableHtml(doc, client, billing))
  w.document.close()
}

function BillingSettings({ onClose }) {
  const { state, dispatch } = useStore()
  const b = state.settings?.billing || {}
  const set = patch => dispatch({ type: 'UPDATE_SETTINGS', payload: { billing: { ...b, ...patch } } })
  const f = (key, label, props = {}) => (
    <label className="text-xs text-[var(--text-tertiary)]">{label}<Input value={b[key] ?? ''} onChange={e => set({ [key]: e.target.value })} {...props} /></label>
  )
  return (
    <Card className="space-y-3 p-5">
      <div className="flex items-center justify-between">
        <p className="font-semibold text-[var(--text-primary)]">Tes informations de facturation</p>
        <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Fermer"><X size={14} /></Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {f('company', 'Raison sociale / nom')}
        {f('siret', 'SIRET')}
        <label className="text-xs text-[var(--text-tertiary)] sm:col-span-2">Adresse<Textarea rows={2} value={b.address ?? ''} onChange={e => set({ address: e.target.value })} /></label>
        {f('email', 'Email')}
        {f('phone', 'Téléphone')}
        {f('iban', 'IBAN')}
        {f('vatNumber', 'N° TVA intracommunautaire')}
        {f('paymentDays', 'Délai de paiement (jours)', { type: 'number', min: 0 })}
        {f('defaultVat', 'TVA par défaut (%)', { type: 'number', min: 0 })}
      </div>
      <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
        <input type="checkbox" checked={!!b.vatExempt} onChange={e => set({ vatExempt: e.target.checked })} /> Auto-entrepreneur : TVA non applicable (art. 293 B du CGI)
      </label>
    </Card>
  )
}

function Editor({ doc, onClose }) {
  const { state, dispatch } = useStore()
  const t = totals(doc)
  const kind = kindOf(doc)
  const patch = p => {
    const next = { ...doc, ...p }
    const tt = totals(next)
    dispatch({ type: 'UPDATE_CLIENT_INVOICE', payload: { id: doc.id, ...p, amountHt: tt.ht, amountTtc: tt.ttc } })
  }
  const lines = doc.lines || []
  const setLine = (id, p) => patch({ lines: lines.map(l => (l.id === id ? { ...l, ...p } : l)) })

  return (
    <Card className="space-y-4 p-5">
      <div className="flex items-center justify-between">
        <p className="text-lg font-semibold text-[var(--text-primary)]">{kind === 'quote' ? 'Devis' : 'Facture'} {doc.number}</p>
        <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Fermer"><X size={14} /></Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-4">
        <label className="text-xs text-[var(--text-tertiary)] sm:col-span-2">Client
          <select className={SELECT} value={doc.clientId || ''} onChange={e => patch({ clientId: e.target.value })}>
            <option value="">Choisir…</option>
            {state.clients.filter(c => c.status !== 'archived').map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <label className="text-xs text-[var(--text-tertiary)]">Date<Input type="date" value={doc.date || ''} onChange={e => patch({ date: e.target.value })} /></label>
        <label className="text-xs text-[var(--text-tertiary)]">{kind === 'quote' ? 'Valable jusqu’au' : 'Échéance'}<Input type="date" value={doc.dueDate || ''} onChange={e => patch({ dueDate: e.target.value })} /></label>
      </div>

      <div className="space-y-2">
        <div className="grid grid-cols-[1fr_70px_120px_110px_32px] gap-2 px-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-tertiary)]">
          <span>Désignation</span><span>Qté</span><span>Prix HT</span><span className="text-right">Total</span><span />
        </div>
        {lines.map(l => (
          <div key={l.id} className="grid grid-cols-[1fr_70px_120px_110px_32px] items-center gap-2">
            <Input value={l.label} onChange={e => setLine(l.id, { label: e.target.value })} placeholder="Ex. Création du site vitrine" />
            <Input type="number" min="0" value={l.qty} onChange={e => setLine(l.id, { qty: e.target.value })} />
            <Input type="number" min="0" value={l.unitPrice} onChange={e => setLine(l.id, { unitPrice: e.target.value })} />
            <span className="text-right text-sm text-[var(--text-primary)]">{eur((Number(l.qty) || 0) * (Number(l.unitPrice) || 0))}</span>
            <Button variant="ghost" size="icon-sm" onClick={() => patch({ lines: lines.filter(x => x.id !== l.id) })} aria-label="Retirer la ligne"><X size={12} /></Button>
          </div>
        ))}
        <Button size="sm" variant="subtle" onClick={() => patch({ lines: [...lines, { id: nanoid(), label: '', qty: 1, unitPrice: 0 }] })}><Plus size={12} /> Ligne</Button>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <label className="min-w-[240px] flex-1 text-xs text-[var(--text-tertiary)]">Note (conditions, acompte…)<Textarea rows={2} value={doc.notes || ''} onChange={e => patch({ notes: e.target.value })} /></label>
        <div className="w-64 space-y-1 text-sm">
          <div className="flex justify-between text-[var(--text-secondary)]"><span>Total HT</span><span>{eur(t.ht)}</span></div>
          <div className="flex items-center justify-between text-[var(--text-secondary)]">
            <span className="flex items-center gap-1">TVA <Input type="number" min="0" value={doc.vatRate ?? 0} onChange={e => patch({ vatRate: Number(e.target.value) })} className="h-7 w-16 px-2" /> %</span>
            <span>{eur(t.vat)}</span>
          </div>
          <div className="flex justify-between border-t border-[var(--border-medium)] pt-1 text-base font-semibold text-[var(--text-primary)]"><span>Total</span><span>{eur(t.ttc)}</span></div>
        </div>
      </div>
    </Card>
  )
}

export default function Facturation() {
  const { state, dispatch } = useStore()
  const [tab, setTab] = useState('invoice')
  const [openId, setOpenId] = useState(null)
  const billing = state.settings?.billing || {}
  // Ouvert d'office tant que les infos ne sont pas remplies, et reste ouvert pendant la saisie.
  const [showSettings, setShowSettings] = useState(() => !billing.company)
  const docs = state.clientInvoices || []
  const today = localDateStr()
  const rev = revenue(docs)
  const list = docs.filter(d => kindOf(d) === tab).sort((a, b) => (b.date || '').localeCompare(a.date || ''))
  const clientOf = d => state.clients.find(c => c.id === d.clientId)
  const update = (id, p) => dispatch({ type: 'UPDATE_CLIENT_INVOICE', payload: { id, ...p } })

  function create(kind, from) {
    const date = today
    const vat = billing.vatExempt ? 0 : Number(billing.defaultVat ?? 20)
    const doc = {
      kind,
      number: nextNumber(docs, kind),
      clientId: from?.clientId || '',
      date,
      dueDate: addDays(date, kind === 'quote' ? 30 : Number(billing.paymentDays ?? 30)),
      lines: from?.lines?.map(l => ({ ...l, id: nanoid() })) || [{ id: nanoid(), label: '', qty: 1, unitPrice: 0 }],
      vatRate: from?.vatRate ?? vat,
      notes: from?.notes || '',
      status: kind === 'quote' ? 'draft' : 'to_emit',
      ...(from ? { fromQuote: from.number } : {}),
    }
    const t = totals(doc)
    dispatch({ type: 'ADD_CLIENT_INVOICE', payload: { ...doc, invoiceNumber: doc.number, amountHt: t.ht, amountTtc: t.ttc, description: doc.lines[0]?.label || '' } })
    setTab(kind)
    toast.success(`${kind === 'quote' ? 'Devis' : 'Facture'} ${doc.number} créé${kind === 'quote' ? '' : 'e'}`)
    // L'id est généré par le store : on ouvre le document le plus récent de ce numéro.
    setTimeout(() => setOpenId(`number:${doc.number}`), 0)
  }

  function remind(doc) {
    const client = clientOf(doc)
    const subject = `Relance — facture ${doc.number || doc.invoiceNumber}`
    const body = `Bonjour,\n\nSauf erreur de ma part, la facture ${doc.number || doc.invoiceNumber} de ${eur(totals(doc).ttc)}${doc.dueDate ? `, arrivée à échéance le ${new Date(doc.dueDate + 'T12:00:00').toLocaleDateString('fr-FR')}` : ''}, n'a pas encore été réglée.\n\nPourrais-tu me confirmer la date du paiement ?${billing.iban ? `\n\nIBAN : ${billing.iban}` : ''}\n\nMerci et bonne journée,\n${billing.company || ''}`
    window.location.href = `mailto:${encodeURIComponent(client?.email || '')}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    update(doc.id, { remindedAt: new Date().toISOString(), reminders: (doc.reminders || 0) + 1 })
  }

  const openDoc = openId?.startsWith('number:') ? docs.find(d => d.number === openId.slice(7)) : docs.find(d => d.id === openId)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className={TITLE}>Facturation</h1>
          <p className="text-sm text-[var(--text-tertiary)]">Devis, factures, paiements et relances. Le PDF s'ouvre prêt à imprimer ou à enregistrer.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => create('invoice')}><Plus size={14} /> Facture</Button>
          <Button variant="outline" onClick={() => create('quote')}><Plus size={14} /> Devis</Button>
          <Button variant="ghost" onClick={() => setShowSettings(s => !s)}><Settings2 size={14} /> Mes infos</Button>
        </div>
      </div>

      {showSettings && <BillingSettings onClose={() => setShowSettings(false)} />}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="border-0 p-4" style={{ background: 'var(--hero-gradient)', color: '#fff' }}>
          <p className="text-xs text-white/80">Encaissé ce mois</p>
          <p className="text-2xl font-semibold tracking-tight">{eur(rev.paidMonth)}</p>
        </Card>
        <Card className="p-4"><p className="text-xs text-[var(--text-tertiary)]">Encaissé cette année</p><p className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">{eur(rev.paidYear)}</p></Card>
        <Card className="p-4"><p className="text-xs text-[var(--text-tertiary)]">À encaisser</p><p className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">{eur(rev.pending)}</p></Card>
        <Card className="p-4"><p className="text-xs text-[var(--text-tertiary)]">En retard</p><p className="text-2xl font-semibold tracking-tight" style={{ color: rev.overdue.length ? 'var(--red-deep)' : 'var(--text-primary)' }}>{rev.overdue.length}</p></Card>
      </div>

      {openDoc && <Editor doc={openDoc} onClose={() => setOpenId(null)} />}

      <div className="flex gap-1 self-start rounded-full bg-[var(--bg-sidebar)] p-1" style={{ width: 'fit-content' }}>
        {[['invoice', 'Factures'], ['quote', 'Devis']].map(([k, label]) => (
          <button key={k} type="button" onClick={() => setTab(k)} className={`rounded-full px-4 py-2 text-sm font-medium ${tab === k ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-[var(--shadow-card)]' : 'text-[var(--text-tertiary)]'}`}>
            {label} <span className="ml-1 text-[11px] opacity-70">{docs.filter(d => kindOf(d) === k).length}</span>
          </button>
        ))}
      </div>

      <Card className="overflow-hidden p-0">
        {list.length ? list.map(d => {
          const st = displayStatus(d, today)
          const client = clientOf(d)
          return (
            <div key={d.id} className="flex flex-wrap items-center gap-3 border-b border-[var(--border-soft)] px-5 py-3 last:border-0 hover:bg-[rgba(var(--ink),0.02)]">
              <button type="button" onClick={() => setOpenId(d.id)} className="min-w-0 flex-1 text-left">
                <p className="text-sm font-semibold text-[var(--text-primary)]">{d.number || d.invoiceNumber || '—'} · {client?.name || 'Client à choisir'}</p>
                <p className="text-xs text-[var(--text-tertiary)]">
                  {d.date ? new Date(d.date + 'T12:00:00').toLocaleDateString('fr-FR') : ''}
                  {d.dueDate ? ` · ${kindOf(d) === 'quote' ? 'valable jusqu’au' : 'échéance'} ${new Date(d.dueDate + 'T12:00:00').toLocaleDateString('fr-FR')}` : ''}
                  {d.reminders ? ` · ${d.reminders} relance${d.reminders > 1 ? 's' : ''}` : ''}
                </p>
              </button>
              <span className="w-28 text-right text-sm font-semibold text-[var(--text-primary)]">{eur(totals(d).ttc)}</span>
              <Pill status={st} kind={kindOf(d)} />
              <div className="flex gap-1">
                <Button size="icon-sm" variant="ghost" title="PDF" aria-label="PDF" onClick={() => openPdf(d, client, billing)}><FileDown size={14} /></Button>
                {kindOf(d) === 'invoice' ? (<>
                  {['to_emit'].includes(st) && <Button size="icon-sm" variant="ghost" title="Marquer envoyée" aria-label="Marquer envoyée" onClick={() => update(d.id, { status: 'sent', sentAt: new Date().toISOString() })}><Send size={14} /></Button>}
                  {['sent', 'overdue'].includes(st) && <Button size="icon-sm" variant="ghost" title="Relancer par email" aria-label="Relancer" onClick={() => remind(d)}><Mail size={14} /></Button>}
                  {st !== 'paid' && <Button size="icon-sm" variant="ghost" title="Marquer payée" aria-label="Marquer payée" onClick={() => { update(d.id, { status: 'paid', paidAt: today }); toast.success('Paiement enregistré 💶') }}><CheckCircle2 size={14} /></Button>}
                </>) : (<>
                  {st === 'draft' && <Button size="icon-sm" variant="ghost" title="Marquer envoyé" aria-label="Marquer envoyé" onClick={() => update(d.id, { status: 'sent' })}><Send size={14} /></Button>}
                  {st === 'sent' && <Button size="icon-sm" variant="ghost" title="Accepté" aria-label="Accepté" onClick={() => update(d.id, { status: 'accepted' })}><CheckCircle2 size={14} /></Button>}
                  <Button size="icon-sm" variant="ghost" title="Convertir en facture" aria-label="Convertir en facture" onClick={() => { update(d.id, { status: 'accepted' }); create('invoice', d) }}><ArrowRightLeft size={14} /></Button>
                </>)}
                <Button size="icon-sm" variant="ghost" title="Supprimer" aria-label="Supprimer" onClick={() => {
                  dispatch({ type: 'DELETE_CLIENT_INVOICE', payload: d.id })
                  toastUndo('Document supprimé', () => dispatch({ type: 'RESTORE_ITEMS', payload: { clientInvoices: [d] } }))
                }}><Trash2 size={14} /></Button>
              </div>
            </div>
          )
        }) : <p className="px-5 py-10 text-center text-sm text-[var(--text-tertiary)]">Aucun{tab === 'quote' ? ' devis' : 'e facture'} pour l'instant.</p>}
      </Card>
    </div>
  )
}
