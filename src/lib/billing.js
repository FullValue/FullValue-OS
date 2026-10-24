// Facturation : totaux, numérotation, retards et chiffre d'affaires.
// Les devis et factures vivent dans state.clientInvoices (kind: 'quote' | 'invoice').
import { localDateStr } from '@/lib/backup'

export const INVOICE_STATUS = {
  to_emit: { label: 'Brouillon', tone: 'off' },
  sent: { label: 'Envoyée', tone: 'info' },
  overdue: { label: 'En retard', tone: 'bad' },
  paid: { label: 'Payée', tone: 'ok' },
}
export const QUOTE_STATUS = {
  draft: { label: 'Brouillon', tone: 'off' },
  sent: { label: 'Envoyé', tone: 'info' },
  accepted: { label: 'Accepté', tone: 'ok' },
  refused: { label: 'Refusé', tone: 'bad' },
}

export const kindOf = doc => (doc.kind === 'quote' ? 'quote' : 'invoice')

export function totals(doc) {
  if (!doc.lines?.length) {
    const ht = Number(doc.amountHt) || 0
    const ttc = Number(doc.amountTtc) || ht * (1 + (Number(doc.vatRate) || 0) / 100)
    return { ht, vat: ttc - ht, ttc }
  }
  const ht = doc.lines.reduce((s, l) => s + (Number(l.qty) || 0) * (Number(l.unitPrice) || 0), 0)
  const vat = ht * ((Number(doc.vatRate) || 0) / 100)
  return { ht, vat, ttc: ht + vat }
}

// Statut affiché : une facture envoyée dont l'échéance est passée est « en retard ».
export function displayStatus(doc, today = localDateStr()) {
  if (kindOf(doc) === 'quote') return doc.status || 'draft'
  if (doc.status === 'paid') return 'paid'
  if ((doc.status === 'sent' || doc.status === 'overdue') && doc.dueDate && doc.dueDate < today) return 'overdue'
  return doc.status === 'overdue' ? 'sent' : doc.status || 'to_emit'
}

export function nextNumber(docs, kind, date = new Date()) {
  const prefix = `${kind === 'quote' ? 'D' : 'F'}-${date.getFullYear()}-`
  const max = docs
    .filter(d => kindOf(d) === kind)
    .map(d => d.number || d.invoiceNumber || '')
    .filter(n => n.startsWith(prefix))
    .reduce((m, n) => Math.max(m, Number(n.slice(prefix.length)) || 0), 0)
  return prefix + String(max + 1).padStart(3, '0')
}

export function addDays(dateStr, days) {
  const d = new Date(dateStr + 'T12:00:00')
  d.setDate(d.getDate() + days)
  return localDateStr(d)
}

export function revenue(docs, now = new Date()) {
  const today = localDateStr(now)
  const month = today.slice(0, 7)
  const invoices = docs.filter(d => kindOf(d) === 'invoice')
  const paidAt = d => (d.paidAt || d.date || '').slice(0, 7)
  return {
    paidMonth: invoices.filter(d => d.status === 'paid' && paidAt(d) === month).reduce((s, d) => s + totals(d).ttc, 0),
    paidYear: invoices.filter(d => d.status === 'paid' && paidAt(d).slice(0, 4) === month.slice(0, 4)).reduce((s, d) => s + totals(d).ttc, 0),
    pending: invoices.filter(d => ['sent', 'overdue'].includes(displayStatus(d, today))).reduce((s, d) => s + totals(d).ttc, 0),
    overdue: invoices.filter(d => displayStatus(d, today) === 'overdue'),
  }
}

export const eur = n => (Number(n) || 0).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))

// Document A4 imprimable (le navigateur l'enregistre en PDF).
export function printableHtml(doc, client, billing = {}) {
  const t = totals(doc)
  const isQuote = kindOf(doc) === 'quote'
  const lines = (doc.lines?.length ? doc.lines : [{ label: doc.description || 'Prestation', qty: 1, unitPrice: t.ht }])
  const fr = d => (d ? new Date(d + 'T12:00:00').toLocaleDateString('fr-FR') : '')
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${esc(doc.number || doc.invoiceNumber)}</title>
<style>
  @page { size: A4; margin: 18mm }
  body { font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif; color: #111; font-size: 12px; margin: 0 }
  h1 { font-size: 26px; margin: 0 0 4px; letter-spacing: -0.02em }
  .top { display: flex; justify-content: space-between; gap: 24px; margin-bottom: 32px }
  .muted { color: #6b7280 } .right { text-align: right }
  .box { border: 1px solid #e5e7eb; border-radius: 10px; padding: 12px 14px; min-width: 220px }
  table { width: 100%; border-collapse: collapse; margin-top: 8px }
  th { text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: .06em; color: #6b7280; border-bottom: 1px solid #e5e7eb; padding: 8px 6px }
  td { padding: 10px 6px; border-bottom: 1px solid #f1f2f4; vertical-align: top }
  .totals { margin-left: auto; width: 260px; margin-top: 16px } .totals div { display: flex; justify-content: space-between; padding: 4px 0 }
  .grand { font-size: 16px; font-weight: 700; border-top: 2px solid #111; margin-top: 6px; padding-top: 8px !important }
  .foot { margin-top: 40px; font-size: 10px; color: #6b7280; line-height: 1.6 }
  .accent { color: #1f4fd1 }
</style></head><body>
<div class="top">
  <div>
    <h1 class="accent">${isQuote ? 'Devis' : 'Facture'}</h1>
    <div><b>${esc(doc.number || doc.invoiceNumber)}</b></div>
    <div class="muted">Date : ${fr(doc.date)}${doc.dueDate ? `<br>${isQuote ? 'Valable jusqu’au' : 'Échéance'} : ${fr(doc.dueDate)}` : ''}</div>
  </div>
  <div class="right">
    <b>${esc(billing.company || 'Mon entreprise')}</b><br>
    ${esc(billing.address || '').replace(/\n/g, '<br>')}${billing.siret ? `<br>SIRET ${esc(billing.siret)}` : ''}${billing.vatNumber ? `<br>TVA ${esc(billing.vatNumber)}` : ''}${billing.email ? `<br>${esc(billing.email)}` : ''}${billing.phone ? `<br>${esc(billing.phone)}` : ''}
  </div>
</div>
<div class="box"><span class="muted">${isQuote ? 'Pour' : 'Facturé à'}</span><br><b>${esc(client?.name || '—')}</b>${client?.city ? `<br>${esc(client.city)}` : ''}</div>
<table><thead><tr><th>Désignation</th><th class="right">Qté</th><th class="right">Prix unitaire HT</th><th class="right">Total HT</th></tr></thead><tbody>
${lines.map(l => `<tr><td>${esc(l.label)}</td><td class="right">${esc(l.qty)}</td><td class="right">${eur(l.unitPrice)}</td><td class="right">${eur((Number(l.qty) || 0) * (Number(l.unitPrice) || 0))}</td></tr>`).join('')}
</tbody></table>
<div class="totals">
  <div><span>Total HT</span><span>${eur(t.ht)}</span></div>
  ${Number(doc.vatRate) ? `<div><span>TVA ${esc(doc.vatRate)} %</span><span>${eur(t.vat)}</span></div>` : ''}
  <div class="grand"><span>Total ${Number(doc.vatRate) ? 'TTC' : ''}</span><span>${eur(t.ttc)}</span></div>
</div>
${doc.notes ? `<p style="margin-top:24px">${esc(doc.notes).replace(/\n/g, '<br>')}</p>` : ''}
<div class="foot">
  ${!Number(doc.vatRate) && billing.vatExempt ? 'TVA non applicable, art. 293 B du CGI.<br>' : ''}
  ${isQuote ? 'Bon pour accord : date et signature précédées de la mention « Bon pour accord ».' : `Paiement à réception${doc.dueDate ? ` et au plus tard le ${fr(doc.dueDate)}` : ''}. Pénalités de retard : 3 fois le taux d’intérêt légal. Indemnité forfaitaire pour frais de recouvrement : 40 €.`}
  ${billing.iban ? `<br>IBAN : ${esc(billing.iban)}` : ''}
</div>
<script>window.onload = () => setTimeout(() => window.print(), 300)</script>
</body></html>`
}
