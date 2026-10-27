// Tableau des fiches : filtres numériques et texte, catégories, type, tri, colonnes personnalisables,
// sélection pour comparaison (2 à 5). Les valeurs indisponibles sont affichées comme telles.
import { useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, Columns3, SlidersHorizontal, Star, X } from 'lucide-react'
import { applyFilters, sortListings, mixedCurrencies, DEFAULT_FILTERS } from '@/lib/etsy/filters'
import { FIELD, FIELD_BASE, LABEL } from '@/lib/studio'
import { MetricCell } from './Metric'

const COLUMNS = [
  { id: 'image', label: 'Image', fixed: true },
  { id: 'title', label: 'Titre', sort: 'title', fixed: true },
  { id: 'shop', label: 'Boutique', sort: 'shop' },
  { id: 'price', label: 'Prix', sort: 'price', metric: 'price' },
  { id: 'currency', label: 'Devise' },
  { id: 'category', label: 'Catégorie', sort: 'category' },
  { id: 'favorites', label: 'Favoris', sort: 'favorites', metric: 'favorites' },
  { id: 'views', label: 'Vues', sort: 'views', metric: 'views' },
  { id: 'viewsTrend', label: 'Vues 7 j', sort: 'viewsTrend', metric: 'viewsTrend' },
  { id: 'favoritesTrend', label: 'Favoris 7 j', sort: 'favoritesTrend', metric: 'favoritesTrend' },
  { id: 'viewsPerDay', label: 'Vues / jour', sort: 'viewsPerDay', metric: 'viewsPerDay' },
  { id: 'favoritesPerDay', label: 'Favoris / jour', sort: 'favoritesPerDay', metric: 'favoritesPerDay' },
  { id: 'favRate', label: 'Favoris / vues', sort: 'favRate', metric: 'favRate', suffix: ' %' },
  { id: 'shopSold', label: 'Ventes boutique', sort: 'shopSold', metric: 'shopSold' },
  { id: 'reviews', label: 'Avis (12 mois)', sort: 'reviews', metric: 'reviews' },
  { id: 'ageDays', label: 'Ancienneté', sort: 'ageDays', metric: 'ageDays', suffix: ' j' },
  { id: 'type', label: 'Type' },
  { id: 'estSales', label: 'Ventes est.', sort: 'estSales', metric: 'estSales' },
  { id: 'estRevenue', label: 'CA est.', sort: 'estRevenue', metric: 'estRevenue' },
]
const DEFAULT_COLUMNS = ['image', 'title', 'shop', 'price', 'currency', 'favorites', 'views', 'viewsTrend', 'favoritesTrend', 'viewsPerDay', 'favoritesPerDay', 'favRate', 'shopSold', 'reviews', 'ageDays']
const TYPE_LABEL = { physical: 'Physique', download: 'Numérique', both: 'Les deux' }

function NumRange({ label, min, max, onMin, onMax, unit }) {
  return (
    <div>
      <span className={LABEL}>{label}</span>
      <div className="flex items-center gap-1.5">
        <input className={`${FIELD} py-1.5`} inputMode="decimal" placeholder="min" value={min} onChange={e => onMin(e.target.value.replace(',', '.'))} />
        <span className="text-[var(--text-tertiary)]">–</span>
        <input className={`${FIELD} py-1.5`} inputMode="decimal" placeholder="max" value={max} onChange={e => onMax(e.target.value.replace(',', '.'))} />
        {unit && <span className="text-[11px] text-[var(--text-tertiary)]">{unit}</span>}
      </div>
    </div>
  )
}

export default function ProductsTable({ listings, shopsById, taxonomy, favorites, onOpen, selected, onToggleSelect, columns, onColumnsChange, onToggleFavorite }) {
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [showFilters, setShowFilters] = useState(false)
  const [showCols, setShowCols] = useState(false)
  const [sort, setSort] = useState({ key: 'favorites', dir: 'desc' })
  const visibleCols = COLUMNS.filter(c => (columns || DEFAULT_COLUMNS).includes(c.id) || c.fixed)
  const set = patch => setFilters(f => ({ ...f, ...patch }))
  const categories = useMemo(() => [...new Set(listings.map(l => l.taxonomyId).filter(v => v != null))].map(id => ({ id, label: taxonomy[id] || `Catégorie ${id}` })), [listings, taxonomy])
  const currencies = mixedCurrencies(listings)
  const ctx = { shopName: id => shopsById[id]?.name }
  const rows = useMemo(() => sortListings(applyFilters(listings, filters), sort.key, sort.dir, ctx), [listings, filters, sort]) // eslint-disable-line react-hooks/exhaustive-deps
  const activeFilters = Object.entries(filters).filter(([k, v]) => k !== 'keepUnavailable' && (Array.isArray(v) ? v.length : v !== '' && v !== 'all')).length
  const priceSortMixed = sort.key === 'price' && mixedCurrencies(rows).length > 1

  function toggleSort(key) {
    setSort(s => (s.key === key ? { key, dir: s.dir === 'desc' ? 'asc' : 'desc' } : { key, dir: key === 'title' || key === 'shop' || key === 'category' ? 'asc' : 'desc' }))
  }
  function toggleColumn(id) {
    const cur = columns || DEFAULT_COLUMNS
    onColumnsChange(cur.includes(id) ? cur.filter(c => c !== id) : [...cur, id])
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <input className={`${FIELD_BASE} min-w-[200px] flex-1 rounded-full`} placeholder="Mots inclus (séparés par des virgules)" value={filters.include} onChange={e => set({ include: e.target.value })} />
        <input className={`${FIELD_BASE} min-w-[160px] flex-1 rounded-full`} placeholder="Mots exclus" value={filters.exclude} onChange={e => set({ exclude: e.target.value })} />
        {[['all', 'Tous'], ['physical', 'Physiques'], ['digital', 'Numériques']].map(([v, l]) => (
          <button key={v} type="button" onClick={() => set({ type: v })} className="rounded-full px-3 py-1.5 text-[12px] font-semibold"
            style={filters.type === v ? { background: 'var(--text-primary)', color: 'var(--bg-surface)' } : { color: 'var(--text-tertiary)', border: '1px solid var(--border-soft)' }}>{l}</button>
        ))}
        <button type="button" onClick={() => setShowFilters(v => !v)} className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold text-[var(--text-secondary)]" style={{ border: '1px solid var(--border-soft)' }}>
          <SlidersHorizontal size={13} /> Filtres{activeFilters ? ` · ${activeFilters}` : ''}
        </button>
        <div className="relative">
          <button type="button" onClick={() => setShowCols(v => !v)} className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold text-[var(--text-secondary)]" style={{ border: '1px solid var(--border-soft)' }}>
            <Columns3 size={13} /> Colonnes
          </button>
          {showCols && (
            <div className="absolute right-0 z-30 mt-2 w-52 space-y-1 rounded-2xl bg-[var(--bg-surface)] p-2 shadow-[var(--shadow-float)]" style={{ border: '1px solid var(--border-soft)' }}>
              {COLUMNS.filter(c => !c.fixed).map(c => (
                <label key={c.id} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1 text-[12px] text-[var(--text-secondary)] hover:bg-[rgba(var(--ink),0.04)]">
                  <input type="checkbox" checked={(columns || DEFAULT_COLUMNS).includes(c.id)} onChange={() => toggleColumn(c.id)} /> {c.label}
                </label>
              ))}
              <button type="button" onClick={() => onColumnsChange(null)} className="w-full rounded-lg px-2 py-1 text-left text-[11px] text-[var(--accent)]">Colonnes par défaut</button>
            </div>
          )}
        </div>
      </div>

      {showFilters && (
        <div className="grid grid-cols-1 gap-3 rounded-[20px] bg-[var(--bg-card)] p-4 shadow-[var(--shadow-card)] sm:grid-cols-2 lg:grid-cols-4">
          <NumRange label="Prix" min={filters.priceMin} max={filters.priceMax} onMin={v => set({ priceMin: v })} onMax={v => set({ priceMax: v })} />
          <NumRange label="Favoris" min={filters.favMin} max={filters.favMax} onMin={v => set({ favMin: v })} onMax={v => set({ favMax: v })} />
          <NumRange label="Vues (min)" min={filters.viewsMin} max="" onMin={v => set({ viewsMin: v })} onMax={() => {}} />
          <NumRange label="Ancienneté" min={filters.ageMinDays} max={filters.ageMaxDays} onMin={v => set({ ageMinDays: v })} onMax={v => set({ ageMaxDays: v })} unit="jours" />
          <div>
            <span className={LABEL}>Avis minimum</span>
            <input className={`${FIELD} py-1.5`} inputMode="numeric" value={filters.reviewsMin} onChange={e => set({ reviewsMin: e.target.value })} />
          </div>
          <div>
            <span className={LABEL}>Devise</span>
            <select className={`${FIELD} py-1.5`} value={filters.currency} onChange={e => set({ currency: e.target.value })}>
              <option value="">Toutes</option>
              {currencies.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <span className={LABEL}>Catégories</span>
            <div className="flex flex-wrap gap-1.5">
              {categories.map(c => {
                const on = filters.categories.includes(c.id)
                return <button key={c.id} type="button" onClick={() => set({ categories: on ? filters.categories.filter(x => x !== c.id) : [...filters.categories, c.id] })}
                  className="rounded-full px-2.5 py-1 text-[11px] font-medium" style={on ? { background: 'var(--accent)', color: '#fff' } : { background: 'rgba(var(--ink),0.05)', color: 'var(--text-secondary)' }}>{c.label}</button>
              })}
            </div>
          </div>
          <label className="flex items-center gap-2 text-[12px] text-[var(--text-secondary)] sm:col-span-2">
            <input type="checkbox" checked={filters.keepUnavailable} onChange={e => set({ keepUnavailable: e.target.checked })} />
            Garder les fiches dont la valeur filtrée est indisponible
          </label>
          <button type="button" onClick={() => setFilters(DEFAULT_FILTERS)} className="flex items-center gap-1 justify-self-start text-[12px] text-[var(--accent)] lg:col-start-4 lg:justify-self-end"><X size={12} /> Réinitialiser</button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 text-[11px] text-[var(--text-tertiary)]">
        <span>{rows.length} / {listings.length} fiches</span>
        <span>{selected.size ? `${selected.size} sélectionnée${selected.size > 1 ? 's' : ''} pour comparaison` : 'Coche 2 à 5 fiches pour les comparer'}</span>
        {priceSortMixed && <span style={{ color: 'var(--yellow-deep)' }}>Tri par prix sur plusieurs devises : filtre une devise pour un classement cohérent.</span>}
        <span className="ml-auto flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-[#22a06b]" /> Observée <span className="h-1.5 w-1.5 rounded-full bg-[#2470B0]" /> Calculée <span className="h-1.5 w-1.5 rounded-full bg-[#C8930F]" /> Estimée <span className="h-1.5 w-1.5 rounded-full bg-[#9CA3AF]" /> Indisponible</span>
      </div>

      <div className="overflow-x-auto rounded-[20px] bg-[var(--bg-card)] shadow-[var(--shadow-card)]">
        <table className="w-full min-w-[860px] text-left">
          <thead>
            <tr className="text-[11px] uppercase tracking-[0.06em] text-[var(--text-tertiary)]" style={{ borderBottom: '1px solid var(--border-soft)' }}>
              <th className="w-8 px-3 py-2.5" />
              {visibleCols.map(c => (
                <th key={c.id} className={`px-3 py-2.5 font-semibold ${c.metric ? 'text-right' : ''}`}>
                  {c.sort ? (
                    <button type="button" onClick={() => toggleSort(c.sort)} className={`inline-flex items-center gap-1 ${sort.key === c.sort ? 'text-[var(--text-primary)]' : ''}`}>
                      {c.label}{sort.key === c.sort && (sort.dir === 'desc' ? <ArrowDown size={11} /> : <ArrowUp size={11} />)}
                    </button>
                  ) : c.label}
                </th>
              ))}
              <th className="w-8 px-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map(l => {
              const shop = shopsById[l.shopId]
              const fav = favorites.includes(l.id)
              return (
                <tr key={l.id} className="cursor-pointer text-[13px] transition-colors hover:bg-[rgba(var(--ink),0.03)]" style={{ borderBottom: '1px solid var(--border-soft)' }} onClick={() => onOpen(l)}>
                  <td className="px-3 py-2" onClick={e => e.stopPropagation()}>
                    <input type="checkbox" checked={selected.has(l.id)} disabled={!selected.has(l.id) && selected.size >= 5} onChange={() => onToggleSelect(l.id)} aria-label="Sélectionner pour comparaison" />
                  </td>
                  {visibleCols.map(c => (
                    <td key={c.id} className={`px-3 py-2 ${c.metric ? 'text-right' : ''}`}>
                      {c.id === 'image' && (l.imageUrl ? <img src={l.imageUrl} alt="" className="h-11 w-11 rounded-xl object-cover" loading="lazy" /> : <div className="h-11 w-11 rounded-xl bg-[rgba(var(--ink),0.06)]" />)}
                      {c.id === 'title' && <span className="line-clamp-2 max-w-[280px] font-medium text-[var(--text-primary)]">{l.title}</span>}
                      {c.id === 'shop' && <span className="text-[var(--text-secondary)]">{shop?.name || '—'}</span>}
                      {c.id === 'currency' && <span className="text-[12px] text-[var(--text-secondary)]">{l.currency || <i className="text-[var(--text-tertiary)]">Indisponible</i>}</span>}
                      {c.id === 'category' && <span className="text-[12px] text-[var(--text-secondary)]">{l.category || <i className="text-[var(--text-tertiary)]">Indisponible</i>}</span>}
                      {c.id === 'type' && <span className="text-[12px] text-[var(--text-secondary)]">{TYPE_LABEL[l.type] || <i className="text-[var(--text-tertiary)]">Indisponible</i>}</span>}
                      {c.metric && <MetricCell m={l.metrics[c.metric]} suffix={c.suffix} />}
                    </td>
                  ))}
                  <td className="px-2" onClick={e => e.stopPropagation()}>
                    <button type="button" onClick={() => onToggleFavorite(l.id)} aria-label={fav ? 'Retirer des favoris' : 'Ajouter aux favoris'} className="p-1">
                      <Star size={15} className={fav ? 'fill-[#F5B301] text-[#F5B301]' : 'text-[var(--text-tertiary)]'} />
                    </button>
                  </td>
                </tr>
              )
            })}
            {rows.length === 0 && (
              <tr><td colSpan={visibleCols.length + 2} className="px-3 py-10 text-center text-[13px] text-[var(--text-tertiary)]">Aucune fiche ne correspond à ces filtres.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
