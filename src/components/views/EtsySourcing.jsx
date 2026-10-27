// Sourcing & comparatif Etsy : analyse de boutiques et de fiches, inspirée fonctionnellement
// d'outils comme EverBee (aucun code, marque ni donnée repris). Budget API 0 €.
// Mode démonstration (données synthétiques) tant que le connecteur réel n'est pas autorisé.
import { useEffect, useMemo, useState } from 'react'
import { Loader2, Plus, Search, ShoppingBag } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { Pill } from '@/components/studio/StudioUI'
import { parseShopQuery } from '@/lib/etsy/normalize'
import { demoDataset, demoObservations, DEMO_TAXONOMY } from '@/lib/etsy/demo'
import { recordObservation } from '@/lib/etsy/observations'
import { estimateListingSales, revenueScenario } from '@/lib/etsy/estimation'
import { connectorStatus, loadLiveShop } from '@/lib/etsy/api'
import ProductsTable from '@/components/etsy/ProductsTable'
import ProductDrawer from '@/components/etsy/ProductDrawer'
import ShopsPanel from '@/components/etsy/ShopsPanel'
import ComparePanel from '@/components/etsy/ComparePanel'
import CollectionsPanel from '@/components/etsy/CollectionsPanel'
import FeasibilityPanel from '@/components/etsy/FeasibilityPanel'
import ProductSearch from '@/components/etsy/ProductSearch'

const TABS = [['search', 'Recherche produit'], ['products', 'Produits des boutiques'], ['shops', 'Boutiques'], ['compare', 'Comparer'], ['collections', 'Collections'], ['feasibility', 'Faisabilité']]
const DEFAULT_WS = { mode: 'demo', shops: [], collections: [], favorites: [], notes: {}, columns: null, observations: [] }

export default function EtsySourcing() {
  const { state, dispatch } = useStore()
  const ws = { ...DEFAULT_WS, ...(state.etsy || {}) }
  const update = patch => dispatch({ type: 'ETSY_UPDATE', payload: patch })
  const [status, setStatus] = useState(null)
  const [tab, setTab] = useState('search')
  const [query, setQuery] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState(null)
  const [openId, setOpenId] = useState(null)
  const [selListings, setSelListings] = useState(() => new Set())
  const [selShops, setSelShops] = useState(() => new Set())
  const [compareMode, setCompareMode] = useState('listings')
  const [live, setLive] = useState({ shops: [], listings: [], taxonomy: {} })

  useEffect(() => { connectorStatus().then(setStatus) }, [])
  const liveAvailable = !!status?.live && !!status?.configured
  // Données réelles par défaut dès que le connecteur est actif, sauf si la démonstration a été choisie.
  const mode = liveAvailable && !(ws.mode === 'demo' && ws.modeChosen) ? 'live' : 'demo'

  const demo = useMemo(() => demoDataset(), [])
  const tracked = ws.shops.filter(s => s.source === (mode === 'live' ? 'etsy' : 'demo'))
  const pool = mode === 'live' ? live : { shops: demo.shops, listings: demo.listings, taxonomy: DEMO_TAXONOMY }
  const shops = tracked.map(t => pool.shops.find(s => s.id === t.id)).filter(Boolean)
  const shopsById = Object.fromEntries(shops.map(s => [s.id, s]))
  const observations = mode === 'live' ? (status?.trackingAllowed ? ws.observations : []) : demoObservations(demo.shops)
  const ctx = { trackingAllowed: mode === 'live' ? !!status?.trackingAllowed : false, observationCount: 0 }

  // Le moteur d'estimation est branché : sans modèle validé, il renvoie « non disponible ».
  const listings = pool.listings.filter(l => shopsById[l.shopId]).map(l => {
    const estSales = estimateListingSales(l, ctx)
    return { ...l, metrics: { ...l.metrics, estSales, estRevenue: revenueScenario(estSales, l.metrics.price) } }
  })

  const opened = listings.find(l => l.id === openId)

  async function addShop(e) {
    e?.preventDefault()
    setMessage(null)
    const parsed = parseShopQuery(query)
    if (!parsed) return
    if (mode === 'demo') {
      const q = String(parsed.value).toLowerCase()
      const found = demo.shops.find(s => s.id === parsed.value || s.name.toLowerCase() === q)
        || demo.shops.find(s => s.name.toLowerCase().includes(q))
        || (parsed.kind === 'listingId' && demo.shops.find(s => demo.listings.some(l => l.id === parsed.value && l.shopId === s.id)))
      if (!found) return setMessage({ error: true, text: `En démonstration, seules les boutiques fictives sont disponibles : ${demo.shops.map(s => s.name).join(', ')}.` })
      if (!ws.shops.some(s => s.id === found.id && s.source === 'demo')) update({ shops: [...ws.shops, { id: found.id, name: found.name, source: 'demo', addedAt: new Date().toISOString() }] })
      setQuery('')
      return setMessage({ text: `${found.name} ajoutée (données synthétiques).` })
    }
    setBusy(true)
    try {
      const data = await loadLiveShop(query)
      setLive(prev => ({ ...prev, shops: [...prev.shops.filter(s => s.id !== data.shop.id), data.shop], listings: [...prev.listings.filter(l => l.shopId !== data.shop.id), ...data.listings] }))
      const patch = {}
      if (!ws.shops.some(s => s.id === data.shop.id && s.source === 'etsy')) patch.shops = [...ws.shops, { id: data.shop.id, name: data.shop.name, source: 'etsy', addedAt: new Date().toISOString() }]
      if (data.trackingAllowed) patch.observations = recordObservation(ws.observations, data.shop)
      update(patch)
      setQuery('')
      setMessage({ text: `${data.shop.name} chargée : ${data.catalog.fetched} fiche(s)${data.catalog.complete ? '' : ' (catalogue partiel)'}.${data.quota?.remainingToday != null ? ` Quota restant aujourd’hui : ${data.quota.remainingToday}.` : ''}` })
    } catch (err) {
      setMessage({ error: true, text: err.retryAfter ? `${err.message} Réessaie dans ${Math.ceil(err.retryAfter / 60)} min.` : err.message })
    } finally {
      setBusy(false)
    }
  }

  function removeShop(id) {
    update({ shops: ws.shops.filter(s => !(s.id === id && s.source === (mode === 'live' ? 'etsy' : 'demo'))), observations: ws.observations.filter(o => o.shopId !== id) })
    setSelShops(prev => { const n = new Set(prev); n.delete(id); return n })
  }
  const toggle = setter => id => setter(prev => {
    const n = new Set(prev)
    if (n.has(id)) n.delete(id)
    else if (n.size < 5) n.add(id)
    return n
  })

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <header className="flex flex-wrap items-start gap-4">
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl text-white" style={{ background: 'var(--hero-gradient)' }}><ShoppingBag size={22} /></div>
        <div className="min-w-[240px] flex-1">
          <h1 className="text-[34px] font-semibold leading-tight tracking-tight text-[var(--text-primary)]">Sourcing & comparatif Etsy</h1>
          <p className="mt-1 max-w-3xl text-sm text-[var(--text-tertiary)]">Analyse des boutiques et des fiches, avec la source, la date et le statut de chaque chiffre. Les ventes et le CA ne sont estimés que lorsque la méthode est validée.</p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          {mode === 'demo'
            ? <Pill bg="#FFF3D1" color="#9A6B00">Mode démonstration · données synthétiques</Pill>
            : <Pill bg="var(--green-bg)" color="var(--green-deep)">Données Etsy réelles</Pill>}
          <span className="text-[11px] text-[var(--text-tertiary)]">Connecteur Etsy : {status === null ? 'vérification…' : liveAvailable ? 'actif' : 'désactivé (autorisations en attente)'}</span>
          {liveAvailable && (
            <button type="button" onClick={() => update({ mode: mode === 'live' ? 'demo' : 'live', modeChosen: true })} className="text-[11px] font-semibold text-[var(--accent)]">
              Passer en {mode === 'live' ? 'démonstration' : 'données réelles'}
            </button>
          )}
        </div>
      </header>

      <form onSubmit={addShop} className="flex flex-wrap items-center gap-2 rounded-[20px] bg-[var(--bg-sidebar)] p-3">
        <label className="flex min-w-[240px] flex-1 items-center gap-2 rounded-full bg-[var(--bg-card)] px-3 py-2 shadow-[var(--shadow-card)]">
          <Search size={15} className="text-[var(--text-tertiary)]" />
          <input className="flex-1 bg-transparent text-[13px] text-[var(--text-primary)] outline-none" value={query} onChange={e => setQuery(e.target.value)}
            placeholder={mode === 'demo' ? 'Nom, identifiant ou URL de boutique (démo : DemoAtelierLune, DemoPrintNest…)' : 'Nom, identifiant ou URL de boutique Etsy'} />
        </label>
        <button disabled={busy} className="flex items-center gap-1.5 rounded-full bg-[var(--accent)] px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-60">
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Ajouter la boutique
        </button>
        {mode === 'demo' && tracked.length < demo.shops.length && (
          <button type="button" onClick={() => update({ shops: [...ws.shops.filter(s => s.source !== 'demo'), ...demo.shops.map(s => ({ id: s.id, name: s.name, source: 'demo', addedAt: new Date().toISOString() }))] })}
            className="rounded-full px-3 py-2 text-[12px] font-semibold text-[var(--accent)] hover:bg-[var(--brand-100)]">Charger les 5 boutiques de démo</button>
        )}
        {message && <p className="w-full px-2 text-[12px]" style={{ color: message.error ? 'var(--red-deep)' : 'var(--green-deep)' }}>{message.text}</p>}
        {shops.length > 0 && (
          <div className="flex w-full flex-wrap gap-1.5 px-1">
            {shops.map(s => <span key={s.id} className="rounded-full bg-[var(--bg-card)] px-2.5 py-1 text-[11px] font-medium text-[var(--text-secondary)] shadow-[var(--shadow-card)]">{s.name} · {s.currency || '?'}</span>)}
          </div>
        )}
      </form>

      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex flex-wrap gap-1 rounded-full bg-[var(--bg-sidebar)] p-1">
          {TABS.map(([id, label]) => (
            <button key={id} type="button" onClick={() => setTab(id)} className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${tab === id ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-[var(--shadow-card)]' : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'}`}>
              {label}{id === 'compare' && (selListings.size || selShops.size) ? ` · ${compareMode === 'shops' ? selShops.size : selListings.size}` : ''}
            </button>
          ))}
        </div>
      </div>

      {tab === 'search' && <ProductSearch mode={mode} demo={demo} workspace={ws} onUpdate={update} ctx={ctx} />}
      {tab === 'products' && (shops.length === 0
        ? <p className="rounded-[22px] bg-[var(--bg-card)] py-12 text-center text-[14px] text-[var(--text-tertiary)] shadow-[var(--shadow-card)]">Ajoute une boutique (ou charge les boutiques de démonstration) pour voir ses fiches.</p>
        : <ProductsTable listings={listings} shopsById={shopsById} taxonomy={pool.taxonomy} favorites={ws.favorites} onOpen={l => setOpenId(l.id)}
            selected={selListings} onToggleSelect={toggle(setSelListings)} columns={ws.columns} onColumnsChange={columns => update({ columns })}
            onToggleFavorite={id => update({ favorites: ws.favorites.includes(id) ? ws.favorites.filter(x => x !== id) : [...ws.favorites, id] })} />)}
      {tab === 'shops' && <ShopsPanel shops={shops} listings={listings} observations={observations} onRemove={removeShop} selected={selShops} onToggleSelect={toggle(setSelShops)}
        trackingNote={mode === 'demo' ? 'Observations synthétiques' : status?.trackingAllowed ? null : 'Suivi non autorisé : aucune observation conservée'} />}
      {tab === 'compare' && <ComparePanel mode={compareMode} setMode={setCompareMode} shopsById={shopsById}
        shops={shops.filter(s => selShops.has(s.id))} listings={listings.filter(l => selListings.has(l.id))} />}
      {tab === 'collections' && <CollectionsPanel workspace={ws} listings={listings} shopsById={shopsById} onUpdate={update} onOpen={l => setOpenId(l.id)} />}
      {tab === 'feasibility' && <FeasibilityPanel status={status} />}

      {opened && <ProductDrawer listing={opened} shop={shopsById[opened.shopId]} workspace={ws} ctx={ctx} onClose={() => setOpenId(null)} onUpdate={update} />}
    </div>
  )
}
