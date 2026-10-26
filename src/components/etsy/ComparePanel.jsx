// Comparaison côte à côte de 2 à 5 boutiques ou fiches. Les montants de devises différentes
// ne sont jamais classés entre eux ; le « meilleur » n'est marqué que sur des valeurs comparables.
import { buildComparison } from '@/lib/etsy/filters'
import { MetricCell } from './Metric'

const LISTING_ROWS = [
  { label: 'Prix (minimum affiché)', get: l => l.metrics.price, monetary: true, better: 'low' },
  { label: 'Favoris', get: l => l.metrics.favorites, better: 'high' },
  { label: 'Avis (période lue)', get: l => l.metrics.reviews, better: 'high' },
  { label: 'Ancienneté (jours)', get: l => l.metrics.ageDays },
  { label: 'Stock affiché', get: l => l.metrics.quantity },
  { label: 'Ventes estimées', get: l => l.metrics.estSales, better: 'high' },
  { label: 'CA estimé (scénario brut)', get: l => l.metrics.estRevenue, monetary: true, better: 'high' },
]
const SHOP_ROWS = [
  { label: 'Ventes cumulées (compteur boutique)', get: s => s.metrics.soldCount, better: 'high' },
  { label: 'Favoris boutique', get: s => s.metrics.favorites, better: 'high' },
  { label: 'Avis (12 derniers mois)', get: s => s.metrics.reviewCount, better: 'high' },
  { label: 'Note moyenne (12 mois)', get: s => s.metrics.reviewAverage, better: 'high' },
  { label: 'Fiches actives', get: s => s.metrics.activeListings },
  { label: 'Ancienneté (jours)', get: s => s.metrics.ageDays },
]

export default function ComparePanel({ mode, setMode, shops, listings, shopsById }) {
  const items = mode === 'shops' ? shops : listings
  const cmp = buildComparison(items, mode === 'shops' ? SHOP_ROWS : LISTING_ROWS)
  return (
    <div className="space-y-4">
      <div className="inline-flex gap-1 rounded-full bg-[var(--bg-sidebar)] p-1">
        {[['listings', `Fiches (${listings.length})`], ['shops', `Boutiques (${shops.length})`]].map(([v, l]) => (
          <button key={v} type="button" onClick={() => setMode(v)} className={`rounded-full px-4 py-1.5 text-[13px] font-medium ${mode === v ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-[var(--shadow-card)]' : 'text-[var(--text-tertiary)]'}`}>{l}</button>
        ))}
      </div>
      {!cmp.ok ? (
        <p className="rounded-[22px] bg-[var(--bg-card)] py-10 text-center text-[13px] text-[var(--text-tertiary)] shadow-[var(--shadow-card)]">
          {cmp.reason} {mode === 'shops' ? 'Coche des boutiques dans l’onglet Boutiques.' : 'Coche des fiches dans l’onglet Produits.'}
        </p>
      ) : (
        <>
          {cmp.warning && <p className="rounded-xl px-3 py-2 text-[12px]" style={{ background: 'var(--yellow-bg)', color: 'var(--yellow-deep)' }}>{cmp.warning}</p>}
          <div className="overflow-x-auto rounded-[20px] bg-[var(--bg-card)] shadow-[var(--shadow-card)]">
            <table className="w-full min-w-[640px] text-[13px]">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-soft)' }}>
                  <th className="px-4 py-3 text-left text-[11px] uppercase tracking-[0.06em] text-[var(--text-tertiary)]">Métrique</th>
                  {items.map(it => (
                    <th key={it.id} className="px-4 py-3 text-right align-bottom">
                      {mode === 'listings' && it.imageUrl && <img src={it.imageUrl} alt="" className="mb-1.5 ml-auto h-12 w-12 rounded-xl object-cover" />}
                      <span className="line-clamp-2 block max-w-[180px] text-right font-semibold text-[var(--text-primary)]">{mode === 'shops' ? it.name : it.title}</span>
                      <span className="text-[11px] font-normal text-[var(--text-tertiary)]">{mode === 'shops' ? it.currency || 'devise ?' : `${shopsById[it.shopId]?.name || ''} · ${it.currency || 'devise ?'}`}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cmp.rows.map(row => (
                  <tr key={row.label} style={{ borderBottom: '1px solid var(--border-soft)' }}>
                    <td className="px-4 py-2.5 text-[12px] text-[var(--text-secondary)]">
                      {row.label}
                      {row.monetary && !row.comparable && <span className="block text-[10.5px] text-[var(--yellow-deep)]">non comparable (devises)</span>}
                    </td>
                    {row.cells.map((m, i) => {
                      const isBest = row.best !== null && m?.status !== 'unavailable' && m?.value === row.best
                      return (
                        <td key={i} className="px-4 py-2.5 text-right" style={isBest ? { background: 'var(--green-bg)' } : undefined}>
                          <MetricCell m={m} />
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-[var(--text-tertiary)]">Surligné : meilleure valeur parmi les valeurs disponibles et comparables. Une valeur indisponible n’est jamais comptée comme 0.</p>
        </>
      )}
    </div>
  )
}
