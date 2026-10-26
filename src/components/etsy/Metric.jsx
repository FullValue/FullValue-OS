// Affichage d'une métrique traçable : valeur + statut (Observée / Calculée / Estimée / Indisponible)
// et, au survol ou en détail, source, date de lecture, période, devise et note.
import { STATUS_LABEL, formatMetric, metricDetails, formatDateTime as fmtDate } from '@/lib/etsy/metrics'

const STATUS_STYLE = {
  observed:    { dot: '#22a06b', bg: 'var(--green-bg)', color: 'var(--green-deep)' },
  computed:    { dot: '#2470B0', bg: '#E5F1FB', color: '#2470B0' },
  estimated:   { dot: '#C8930F', bg: '#FFF3D1', color: '#9A6B00' },
  unavailable: { dot: '#9CA3AF', bg: 'rgba(var(--ink),0.06)', color: 'var(--text-tertiary)' },
}

export function StatusBadge({ status }) {
  const s = STATUS_STYLE[status] || STATUS_STYLE.unavailable
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full px-1.5 py-0.5 text-[10px] font-semibold" style={{ background: s.bg, color: s.color }}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: s.dot }} /> {STATUS_LABEL[status]}
    </span>
  )
}

// Cellule compacte (tableaux) : valeur + pastille de statut, détails au survol.
export function MetricCell({ m, digits, suffix, align = 'right' }) {
  const s = STATUS_STYLE[m?.status] || STATUS_STYLE.unavailable
  const unavailable = !m || m.status === 'unavailable'
  return (
    <span title={metricDetails(m)} className={`inline-flex items-center gap-1.5 tabular-nums ${align === 'right' ? 'justify-end' : ''}`}>
      <span className={unavailable ? 'text-[11px] italic text-[var(--text-tertiary)]' : 'text-[13px] text-[var(--text-primary)]'}>
        {unavailable ? (m?.note?.startsWith('Estimation') ? 'Non disponible' : 'Indisponible') : formatMetric(m, { digits, suffix })}
      </span>
      <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full" style={{ background: s.dot }} />
    </span>
  )
}

// Bloc détaillé (fiche produit, boutique) : tout le contexte de la valeur est visible.
export function MetricBlock({ label, m, digits, suffix }) {
  return (
    <div className="rounded-2xl bg-[rgba(var(--ink),0.03)] p-3" style={{ border: '1px solid var(--border-soft)' }}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-tertiary)]">{label}</p>
        <StatusBadge status={m?.status || 'unavailable'} />
      </div>
      <p className={`mt-1 ${m?.status === 'unavailable' ? 'text-[13px] italic text-[var(--text-tertiary)]' : 'text-[18px] font-semibold text-[var(--text-primary)]'}`}>
        {m?.status === 'unavailable' ? (m?.note || 'Indisponible') : formatMetric(m, { digits, suffix })}
      </p>
      <p className="mt-1 text-[10.5px] leading-snug text-[var(--text-tertiary)]">
        {[m?.period, m?.source, m?.observedAt && `lu le ${fmtDate(m.observedAt)}`].filter(Boolean).join(' · ')}
        {m?.status !== 'unavailable' && m?.note ? <><br />{m.note}</> : null}
      </p>
    </div>
  )
}
