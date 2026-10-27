// Boutiques suivies : métriques boutique (avec contexte), couverture du catalogue lu,
// et variations du compteur de ventes entre deux observations (si le suivi est autorisé).
import { ExternalLink, Trash2 } from 'lucide-react'
import { Pill } from '@/components/studio/StudioUI'
import { catalogCoverage } from '@/lib/etsy/normalize'
import { counterVariations, summarizeVariation } from '@/lib/etsy/observations'
import { MetricBlock } from './Metric'

const fmt = iso => new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
const KIND = {
  increase: { label: 'hausse', color: 'var(--green-deep)' },
  flat: { label: 'stable', color: 'var(--text-tertiary)' },
  correction: { label: 'correction du compteur (baisse) — pas une vente négative', color: '#9A6B00' },
  missing: { label: 'valeur manquante dans une observation', color: 'var(--text-tertiary)' },
}

// Ventes réelles par relevé (écart du compteur boutique), 14 derniers relevés.
function DailySales({ days }) {
  if (!days?.length) return null
  const last = days.slice(-14)
  const max = Math.max(1, ...last.map(d => d.sales ?? 0))
  return (
    <div className="space-y-1.5">
      <p className="text-[12px] font-semibold text-[var(--text-primary)]">Ventes réelles par jour (compteur Etsy de la boutique)</p>
      <div className="flex h-16 items-end gap-1">
        {last.map(d => (
          <div key={d.day} className="flex flex-1 flex-col items-center gap-0.5" title={`${d.day}${d.span > 1 ? ` (sur ${d.span} j)` : ''} : ${d.sales ?? 'correction / indisponible'}`}>
            <span className="text-[10px] tabular-nums text-[var(--text-tertiary)]">{d.sales ?? '—'}</span>
            <div className="w-full rounded-t" style={{ height: `${d.sales == null ? 2 : Math.max(2, (d.sales / max) * 40)}px`, background: d.sales == null ? 'var(--border-medium)' : 'var(--accent)' }} />
          </div>
        ))}
      </div>
      <p className="text-[11px] text-[var(--text-tertiary)]">Différence du compteur de ventes entre deux relevés quotidiens. Barre grise : correction du compteur ou valeur manquante.</p>
    </div>
  )
}

function Variations({ shop, observations, trackingNote, days }) {
  const segs = counterVariations(observations, shop.id, 'soldCount')
  const summary = summarizeVariation(segs)
  return (
    <div className="space-y-2 rounded-2xl p-3" style={{ background: 'rgba(var(--ink),0.03)', border: '1px solid var(--border-soft)' }}>
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-[12px] font-semibold text-[var(--text-primary)]">Compteur de ventes boutique · suivi</p>
        {trackingNote && <Pill bg="#FFF3D1" color="#9A6B00">{trackingNote}</Pill>}
      </div>
      <DailySales days={days} />
      {!segs.length ? (
        <p className="text-[12px] italic text-[var(--text-tertiary)]">Pas assez d’observations (il en faut au moins deux). Aucun historique n’est reconstruit à partir d’une seule lecture.</p>
      ) : (
        <>
          <ul className="space-y-0.5 text-[12px]">
            {segs.map(s => (
              <li key={s.to} className="flex flex-wrap gap-x-2 text-[var(--text-secondary)]">
                <span className="tabular-nums">{fmt(s.from)} → {fmt(s.to)}</span>
                <span className="tabular-nums font-semibold" style={{ color: KIND[s.kind].color }}>
                  {s.kind === 'increase' || s.kind === 'flat' ? `+${s.delta}` : '—'}
                </span>
                <span style={{ color: KIND[s.kind].color }}>{KIND[s.kind].label}</span>
                {s.longGap && <span className="text-[var(--yellow-deep)]">· intervalle long ({Math.round(s.days)} j)</span>}
              </li>
            ))}
          </ul>
          <p className="text-[12px] text-[var(--text-secondary)]">
            {summary.available
              ? <><b>{summary.label}</b> : +{summary.delta} sur {Math.round(summary.days)} jours. Ce n’est pas un nombre exact de commandes sur la période.</>
              : <i className="text-[var(--text-tertiary)]">{summary.reason}</i>}
          </p>
        </>
      )}
    </div>
  )
}

export default function ShopsPanel({ dailySales, shops, listings, observations, trackingNote, onRemove, selected, onToggleSelect }) {
  if (!shops.length) return <p className="rounded-[22px] bg-[var(--bg-card)] py-12 text-center text-[14px] text-[var(--text-tertiary)] shadow-[var(--shadow-card)]">Ajoute une boutique pour commencer.</p>
  return (
    <div className="space-y-4">
      {shops.map(shop => {
        const cov = catalogCoverage(shop, listings)
        return (
          <div key={shop.id} className="space-y-3 rounded-[22px] bg-[var(--bg-card)] p-5 shadow-[var(--shadow-card)]">
            <div className="flex flex-wrap items-start gap-3">
              <input type="checkbox" className="mt-1.5" checked={selected.has(shop.id)} disabled={!selected.has(shop.id) && selected.size >= 5} onChange={() => onToggleSelect(shop.id)} aria-label="Sélectionner pour comparaison" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[17px] font-semibold text-[var(--text-primary)]">{shop.name}</p>
                  {shop.source === 'demo' && <Pill bg="#FFF3D1" color="#9A6B00">Démonstration</Pill>}
                  {shop.currency && <Pill bg="rgba(var(--ink),0.06)" color="var(--text-secondary)">{shop.currency}</Pill>}
                  {shop.country && <Pill bg="rgba(var(--ink),0.06)" color="var(--text-secondary)">{shop.country}</Pill>}
                  {shop.isVacation && <Pill bg="var(--red-bg)" color="var(--red-deep)">En vacances</Pill>}
                </div>
                <p className="text-[12px] text-[var(--text-tertiary)]">{shop.title || <i>Titre indisponible</i>} · ID {shop.id}</p>
              </div>
              {shop.url && <a href={shop.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[12px] font-semibold text-[var(--accent)]"><ExternalLink size={12} /> {shop.source === 'demo' ? 'Lien (fictif)' : 'Etsy'}</a>}
              <button type="button" onClick={() => onRemove(shop.id)} className="rounded-full p-1.5 text-[var(--text-tertiary)] hover:text-[var(--red-deep)]" aria-label="Retirer la boutique"><Trash2 size={14} /></button>
            </div>
            <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
              <MetricBlock label="Ventes cumulées (boutique)" m={shop.metrics.soldCount} />
              <MetricBlock label="Favoris boutique" m={shop.metrics.favorites} />
              <MetricBlock label="Avis" m={shop.metrics.reviewCount} />
              <MetricBlock label="Note moyenne" m={shop.metrics.reviewAverage} digits={2} suffix=" / 5" />
              <MetricBlock label="Fiches actives" m={shop.metrics.activeListings} />
              <MetricBlock label="Fiches numériques" m={shop.metrics.digitalListings} />
              <MetricBlock label="Ancienneté" m={shop.metrics.ageDays} suffix=" jours" />
              <div className="rounded-2xl bg-[rgba(var(--ink),0.03)] p-3" style={{ border: '1px solid var(--border-soft)' }}>
                <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-tertiary)]">Catalogue lu</p>
                <p className="mt-1 text-[18px] font-semibold text-[var(--text-primary)]">{cov.fetched}{cov.announced != null ? ` / ${cov.announced}` : ''}</p>
                <p className="text-[10.5px] text-[var(--text-tertiary)]">{cov.complete === false ? 'Catalogue partiel : les analyses portent sur les fiches lues' : cov.complete ? 'Catalogue complet' : 'Total annoncé indisponible'}</p>
              </div>
            </div>
            <p className="text-[11px] italic text-[var(--text-tertiary)]">Le compteur de ventes est global à la boutique : il n’est jamais réparti entre les fiches.</p>
            <Variations shop={shop} observations={observations} trackingNote={trackingNote} days={dailySales?.get(shop.id)} />
          </div>
        )
      })}
    </div>
  )
}
