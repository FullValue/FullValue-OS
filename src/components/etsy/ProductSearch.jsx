// Recherche produit : fiches actives de tout Etsy par mots-clés (données réelles) ou dans les boutiques
// fictives (démonstration). Les résultats restent en mémoire (pas de stockage de données Etsy).
import { useState } from 'react'
import { Loader2, Search } from 'lucide-react'
import { searchLiveProducts } from '@/lib/etsy/api'
import { FIELD_BASE } from '@/lib/studio'
import ProductsTable from './ProductsTable'
import ProductDrawer from './ProductDrawer'
import { attachTrends } from '@/lib/etsy/normalize'

const SORTS = [['score', 'Pertinence Etsy'], ['created', 'Plus récentes'], ['price', 'Prix']]

export default function ProductSearch({ mode, demo, workspace, onUpdate, ctx, trends, alloc, onQuota }) {
  const [form, setForm] = useState({ q: '', minPrice: '', maxPrice: '', sortOn: 'score', max: '200' })
  const [result, setResult] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [openId, setOpenId] = useState(null)
  const [selected, setSelected] = useState(() => new Set())
  const set = patch => setForm(f => ({ ...f, ...patch }))

  async function run(e) {
    e.preventDefault()
    if (!form.q.trim()) return
    setError(null)
    if (mode === 'demo') {
      const words = form.q.toLowerCase().split(/\s+/).filter(Boolean)
      const listings = demo.listings.filter(l => words.every(w => `${l.title} ${l.tags.join(' ')}`.toLowerCase().includes(w)))
      return setResult({ listings, shops: demo.shops, total: listings.length, fetched: listings.length, demo: true })
    }
    setBusy(true)
    try {
      const r = await searchLiveProducts({ q: form.q, sort_on: form.sortOn, max: form.max, ...(form.minPrice ? { min_price: form.minPrice } : {}), ...(form.maxPrice ? { max_price: form.maxPrice } : {}) })
      setResult(r)
      if (r.quota) onQuota?.(r.quota)
    } catch (err) {
      if (err.quota) onQuota?.(err.quota)
      setError(err.retryAfter ? `${err.message} Réessaie dans ${Math.ceil(err.retryAfter)} s.` : err.message)
    } finally {
      setBusy(false)
    }
  }

  const shopsById = Object.fromEntries((result?.shops || []).map(s => [s.id, s]))
  const shown = result ? attachTrends(result.listings, trends, alloc) : []
  const opened = shown.find(l => l.id === openId)
  const toggle = id => setSelected(prev => {
    const n = new Set(prev)
    if (n.has(id)) n.delete(id)
    else if (n.size < 5) n.add(id)
    return n
  })

  return (
    <div className="space-y-4">
      <form onSubmit={run} className="flex flex-wrap items-center gap-2 rounded-[20px] bg-[var(--bg-sidebar)] p-3">
        <label className="flex min-w-[240px] flex-1 items-center gap-2 rounded-full bg-[var(--bg-card)] px-3 py-2 shadow-[var(--shadow-card)]">
          <Search size={15} className="text-[var(--text-tertiary)]" />
          <input className="flex-1 bg-transparent text-[13px] text-[var(--text-primary)] outline-none" value={form.q} onChange={e => set({ q: e.target.value })}
            placeholder={mode === 'demo' ? 'Mots-clés (démo : collier, planner, affiche…)' : 'Mots-clés produit, ex. « personalized necklace », « wall art boho »'} />
        </label>
        {mode !== 'demo' && (
          <>
            <input className={`${FIELD_BASE} w-24 rounded-full py-1.5`} inputMode="decimal" placeholder="Prix min" value={form.minPrice} onChange={e => set({ minPrice: e.target.value.replace(',', '.') })} />
            <input className={`${FIELD_BASE} w-24 rounded-full py-1.5`} inputMode="decimal" placeholder="Prix max" value={form.maxPrice} onChange={e => set({ maxPrice: e.target.value.replace(',', '.') })} />
            <select className={`${FIELD_BASE} rounded-full py-1.5`} value={form.sortOn} onChange={e => set({ sortOn: e.target.value })}>
              {SORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <select className={`${FIELD_BASE} rounded-full py-1.5`} value={form.max} onChange={e => set({ max: e.target.value })} title="Nombre de fiches (2 appels API par tranche de 100)">
              {['100', '200', '300'].map(v => <option key={v} value={v}>{v} fiches</option>)}
            </select>
          </>
        )}
        <button disabled={busy} className="flex items-center gap-1.5 rounded-full bg-[var(--accent)] px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-60">
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />} Rechercher
        </button>
        {error && <p className="w-full px-2 text-[12px] text-[var(--red-deep)]">{error}</p>}
        {result && !error && (
          <p className="w-full px-2 text-[12px] text-[var(--text-tertiary)]">
            {result.fetched} fiche(s) analysée(s){result.total != null ? ` sur ${result.total.toLocaleString('fr-FR')} résultats Etsy` : ''}
            {result.demo ? ' · données synthétiques' : ` · ${result.shops.length} boutiques · quota restant aujourd’hui : ${result.quota?.remainingToday ?? '?'}`}
          </p>
        )}
      </form>

      {result && (result.listings.length
        ? <ProductsTable listings={shown} shopsById={shopsById} taxonomy={{}} favorites={workspace.favorites} onOpen={l => setOpenId(l.id)}
            selected={selected} onToggleSelect={toggle} columns={workspace.columns} onColumnsChange={columns => onUpdate({ columns })}
            onToggleFavorite={id => onUpdate({ favorites: workspace.favorites.includes(id) ? workspace.favorites.filter(x => x !== id) : [...workspace.favorites, id] })} />
        : <p className="rounded-[22px] bg-[var(--bg-card)] py-12 text-center text-[14px] text-[var(--text-tertiary)] shadow-[var(--shadow-card)]">Aucune fiche pour ces mots-clés.</p>)}
      {!result && (
        <p className="rounded-[22px] bg-[var(--bg-card)] py-12 text-center text-[14px] text-[var(--text-tertiary)] shadow-[var(--shadow-card)]">
          Cherche une niche : chaque fiche arrive avec ses vues, favoris, vues / jour, ratio favoris / vues et les ventes totales de sa boutique.
        </p>
      )}
      {opened && <ProductDrawer listing={opened} shop={shopsById[opened.shopId]} workspace={workspace} ctx={ctx} onClose={() => setOpenId(null)} onUpdate={onUpdate} />}
    </div>
  )
}
