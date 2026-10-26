// Collections, favoris internes et notes : sélections propres à l'utilisateur.
import { useState } from 'react'
import { Plus, Star, Trash2 } from 'lucide-react'
import { FIELD_BASE } from '@/lib/studio'
import { MetricCell } from './Metric'

function ListingRow({ id, byId, shopsById, note, onOpen, onRemove }) {
  const l = byId.get(id)
  if (!l) {
    return (
      <li className="flex items-center gap-3 px-3 py-2 text-[12px] text-[var(--text-tertiary)]">
        <span className="flex-1 italic">Fiche {id} non chargée (boutique retirée ou données expirées)</span>
        {onRemove && <button type="button" onClick={onRemove} className="p-1 hover:text-[var(--red-deep)]" aria-label="Retirer"><Trash2 size={13} /></button>}
      </li>
    )
  }
  return (
    <li className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-[rgba(var(--ink),0.03)]" onClick={() => onOpen(l)}>
      {l.imageUrl ? <img src={l.imageUrl} alt="" className="h-9 w-9 rounded-lg object-cover" /> : <div className="h-9 w-9 rounded-lg bg-[rgba(var(--ink),0.06)]" />}
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium text-[var(--text-primary)]">{l.title}</p>
        <p className="truncate text-[11px] text-[var(--text-tertiary)]">{shopsById[l.shopId]?.name}{note ? ` · 📝 ${note}` : ''}</p>
      </div>
      <MetricCell m={l.metrics.price} />
      {onRemove && <button type="button" onClick={e => { e.stopPropagation(); onRemove() }} className="p-1 text-[var(--text-tertiary)] hover:text-[var(--red-deep)]" aria-label="Retirer"><Trash2 size={13} /></button>}
    </li>
  )
}

export default function CollectionsPanel({ workspace, listings, shopsById, onUpdate, onOpen }) {
  const [name, setName] = useState('')
  const byId = new Map(listings.map(l => [l.id, l]))
  const noted = Object.entries(workspace.notes).filter(([, v]) => v?.trim())

  function create(e) {
    e.preventDefault()
    if (!name.trim()) return
    onUpdate({ collections: [...workspace.collections, { id: crypto.randomUUID(), name: name.trim(), listingIds: [], createdAt: new Date().toISOString() }] })
    setName('')
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <section className="space-y-3">
        <form onSubmit={create} className="flex gap-2">
          <input className={`${FIELD_BASE} flex-1 rounded-full`} value={name} onChange={e => setName(e.target.value)} placeholder="Nouvelle collection (ex. Idées colliers Noël)" />
          <button className="flex items-center gap-1 rounded-full bg-[var(--accent)] px-4 text-[13px] font-semibold text-white"><Plus size={14} /> Créer</button>
        </form>
        {workspace.collections.length === 0 && <p className="text-[13px] text-[var(--text-tertiary)]">Aucune collection. Crée-en une, puis ajoute des fiches depuis leur fiche détaillée.</p>}
        {workspace.collections.map(c => (
          <div key={c.id} className="overflow-hidden rounded-[20px] bg-[var(--bg-card)] shadow-[var(--shadow-card)]">
            <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: '1px solid var(--border-soft)' }}>
              <input className="flex-1 bg-transparent text-[14px] font-semibold text-[var(--text-primary)] outline-none" value={c.name}
                onChange={e => onUpdate({ collections: workspace.collections.map(x => x.id === c.id ? { ...x, name: e.target.value } : x) })} />
              <span className="text-[11px] text-[var(--text-tertiary)]">{c.listingIds.length} fiche{c.listingIds.length > 1 ? 's' : ''}</span>
              <button type="button" onClick={() => { if (window.confirm(`Supprimer la collection « ${c.name} » ?`)) onUpdate({ collections: workspace.collections.filter(x => x.id !== c.id) }) }} className="p-1 text-[var(--text-tertiary)] hover:text-[var(--red-deep)]" aria-label="Supprimer la collection"><Trash2 size={14} /></button>
            </div>
            <ul>
              {c.listingIds.map(id => (
                <ListingRow key={id} id={id} byId={byId} shopsById={shopsById} note={workspace.notes[id]} onOpen={onOpen}
                  onRemove={() => onUpdate({ collections: workspace.collections.map(x => x.id === c.id ? { ...x, listingIds: x.listingIds.filter(y => y !== id) } : x) })} />
              ))}
              {c.listingIds.length === 0 && <li className="px-4 py-3 text-[12px] text-[var(--text-tertiary)]">Vide.</li>}
            </ul>
          </div>
        ))}
      </section>
      <section className="space-y-4">
        <div className="overflow-hidden rounded-[20px] bg-[var(--bg-card)] shadow-[var(--shadow-card)]">
          <p className="flex items-center gap-1.5 px-4 py-3 text-[14px] font-semibold text-[var(--text-primary)]" style={{ borderBottom: '1px solid var(--border-soft)' }}>
            <Star size={14} className="fill-[#F5B301] text-[#F5B301]" /> Favoris internes ({workspace.favorites.length})
          </p>
          <ul>
            {workspace.favorites.map(id => <ListingRow key={id} id={id} byId={byId} shopsById={shopsById} note={workspace.notes[id]} onOpen={onOpen} onRemove={() => onUpdate({ favorites: workspace.favorites.filter(x => x !== id) })} />)}
            {!workspace.favorites.length && <li className="px-4 py-3 text-[12px] text-[var(--text-tertiary)]">Clique sur l’étoile d’une fiche pour l’ajouter.</li>}
          </ul>
        </div>
        <div className="overflow-hidden rounded-[20px] bg-[var(--bg-card)] shadow-[var(--shadow-card)]">
          <p className="px-4 py-3 text-[14px] font-semibold text-[var(--text-primary)]" style={{ borderBottom: '1px solid var(--border-soft)' }}>📝 Fiches annotées ({noted.length})</p>
          <ul>
            {noted.map(([id, note]) => <ListingRow key={id} id={Number(id)} byId={byId} shopsById={shopsById} note={note} onOpen={onOpen} />)}
            {!noted.length && <li className="px-4 py-3 text-[12px] text-[var(--text-tertiary)]">Tes notes personnelles apparaîtront ici.</li>}
          </ul>
        </div>
      </section>
    </div>
  )
}
