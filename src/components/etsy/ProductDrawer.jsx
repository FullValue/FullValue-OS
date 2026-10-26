// Fiche produit détaillée : métriques avec leur contexte, tags, caractéristiques, lien Etsy,
// favori interne, collections, note personnelle et état du moteur d'estimation.
import { ExternalLink, Star } from 'lucide-react'
import { SidePanel, Pill } from '@/components/studio/StudioUI'
import { FIELD, LABEL } from '@/lib/studio'
import { SIGNALS, PREREQUISITES, signalAvailability } from '@/lib/etsy/estimation'
import { MetricBlock } from './Metric'

const TYPE_LABEL = { physical: 'Produit physique', download: 'Produit numérique', both: 'Physique et numérique' }
const WHO = { i_did: 'Fait par la boutique', someone_else: 'Fait par un tiers', collective: 'Collectif' }

export default function ProductDrawer({ listing: l, shop, workspace, ctx, onClose, onUpdate }) {
  const fav = workspace.favorites.includes(l.id)
  const note = workspace.notes[l.id] || ''
  const signals = signalAvailability(l, ctx)
  const inCollections = workspace.collections.filter(c => c.listingIds.includes(l.id))

  function toggleCollection(id) {
    onUpdate({ collections: workspace.collections.map(c => c.id !== id ? c : { ...c, listingIds: c.listingIds.includes(l.id) ? c.listingIds.filter(x => x !== l.id) : [...c.listingIds, l.id] }) })
  }

  return (
    <SidePanel onClose={onClose}>
      <div className="flex items-start gap-4">
        {l.imageUrl ? <img src={l.imageUrl} alt="" className="h-24 w-24 flex-shrink-0 rounded-2xl object-cover" /> : <div className="h-24 w-24 flex-shrink-0 rounded-2xl bg-[rgba(var(--ink),0.06)]" />}
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-tertiary)]">{shop?.name} · {l.category || 'Catégorie indisponible'}</p>
          <h2 className="text-[19px] font-semibold leading-snug text-[var(--text-primary)]">{l.title}</h2>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {l.source === 'demo' && <Pill bg="#FFF3D1" color="#9A6B00">Données de démonstration</Pill>}
            {l.type && <Pill bg="rgba(var(--ink),0.06)" color="var(--text-secondary)">{TYPE_LABEL[l.type]}</Pill>}
            {l.url && (
              <a href={l.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[12px] font-semibold text-[var(--accent)]">
                <ExternalLink size={12} /> {l.source === 'demo' ? 'Lien Etsy (fictif)' : 'Voir sur Etsy'}
              </a>
            )}
          </div>
        </div>
        <button type="button" onClick={onClose} className="rounded-full px-3 py-1.5 text-[13px] text-[var(--text-secondary)] hover:bg-[rgba(var(--ink),0.05)]">Fermer</button>
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        <MetricBlock label="Prix" m={l.metrics.price} />
        <MetricBlock label="Favoris" m={l.metrics.favorites} />
        <MetricBlock label="Avis" m={l.metrics.reviews} />
        <MetricBlock label="Dernier avis" m={l.metrics.lastReviewAt?.status === 'unavailable' ? l.metrics.lastReviewAt : { ...l.metrics.lastReviewAt, value: new Date(l.metrics.lastReviewAt.value).toLocaleDateString('fr-FR') }} />
        <MetricBlock label="Ancienneté" m={l.metrics.ageDays} suffix=" jours" />
        <MetricBlock label="Stock affiché" m={l.metrics.quantity} />
      </div>

      <section className="space-y-2.5 rounded-2xl p-4" style={{ background: 'rgba(var(--ink),0.03)', border: '1px solid var(--border-soft)' }}>
        <div className="grid grid-cols-2 gap-2.5">
          <MetricBlock label="Ventes estimées" m={l.metrics.estSales} />
          <MetricBlock label="CA estimé (scénario brut)" m={l.metrics.estRevenue} />
        </div>
        <p className="text-[12px] text-[var(--text-secondary)]">Aucun modèle d’estimation n’est calibré ni validé : rien n’est affiché plutôt qu’un chiffre inventé. Prérequis :</p>
        <ul className="list-disc space-y-0.5 pl-5 text-[12px] text-[var(--text-tertiary)]">{PREREQUISITES.map(p => <li key={p}>{p}</li>)}</ul>
        <div className="flex flex-wrap gap-1.5 pt-1">
          {SIGNALS.map(s => (
            <span key={s.id} title={s.needs} className="rounded-full px-2 py-0.5 text-[11px]" style={signals[s.id] ? { background: 'var(--green-bg)', color: 'var(--green-deep)' } : { background: 'rgba(var(--ink),0.06)', color: 'var(--text-tertiary)' }}>
              {signals[s.id] ? '✓' : '—'} {s.label}
            </span>
          ))}
        </div>
        <p className="text-[11px] italic text-[var(--text-tertiary)]">Signaux candidats = hypothèses à tester, pas des preuves de ventes. Les favoris, avis et variations de stock ne sont pas des ventes.</p>
      </section>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <span className={LABEL}>Tags ({l.tags.length})</span>
          <div className="flex flex-wrap gap-1.5">{l.tags.length ? l.tags.map(t => <Pill key={t} bg="var(--violet-bg)" color="var(--violet-deep)">{t}</Pill>) : <i className="text-[12px] text-[var(--text-tertiary)]">Indisponible</i>}</div>
        </div>
        <div>
          <span className={LABEL}>Caractéristiques</span>
          <ul className="space-y-0.5 text-[12px] text-[var(--text-secondary)]">
            <li>Matériaux : {l.materials.length ? l.materials.join(', ') : <i className="text-[var(--text-tertiary)]">non renseignés</i>}</li>
            {l.styles.length > 0 && <li>Styles : {l.styles.join(', ')}</li>}
            <li>Fabrication : {WHO[l.whoMade] || <i className="text-[var(--text-tertiary)]">non renseignée</i>}{l.whenMade ? ` · ${l.whenMade.replace('_', '–')}` : ''}</li>
            <li>Variantes : {l.hasVariations ? 'oui (le prix affiché est un minimum)' : 'non'}</li>
            <li>Créée le : {l.createdAt ? new Date(l.createdAt).toLocaleDateString('fr-FR') : <i className="text-[var(--text-tertiary)]">indisponible</i>}</li>
          </ul>
        </div>
      </div>

      <div className="space-y-3 pt-1" style={{ borderTop: '1px solid var(--border-soft)' }}>
        <div className="flex flex-wrap items-center gap-2 pt-3">
          <button type="button" onClick={() => onUpdate({ favorites: fav ? workspace.favorites.filter(x => x !== l.id) : [...workspace.favorites, l.id] })}
            className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold" style={fav ? { background: '#FFF3D1', color: '#9A6B00' } : { border: '1px solid var(--border-soft)', color: 'var(--text-secondary)' }}>
            <Star size={13} className={fav ? 'fill-[#F5B301] text-[#F5B301]' : ''} /> {fav ? 'Dans mes favoris' : 'Ajouter aux favoris'}
          </button>
          {workspace.collections.map(c => (
            <button key={c.id} type="button" onClick={() => toggleCollection(c.id)} className="rounded-full px-3 py-1.5 text-[12px] font-medium"
              style={c.listingIds.includes(l.id) ? { background: 'var(--accent)', color: '#fff' } : { border: '1px solid var(--border-soft)', color: 'var(--text-secondary)' }}>
              {c.listingIds.includes(l.id) ? '✓ ' : '+ '}{c.name}
            </button>
          ))}
          {!workspace.collections.length && <span className="text-[12px] text-[var(--text-tertiary)]">Crée une collection dans l’onglet Collections pour y ranger cette fiche.</span>}
        </div>
        {inCollections.length > 0 && <p className="text-[11px] text-[var(--text-tertiary)]">Dans : {inCollections.map(c => c.name).join(', ')}</p>}
        <div>
          <span className={LABEL}>Note personnelle</span>
          <textarea className={`${FIELD} min-h-[80px]`} value={note} placeholder="Idée de sourcing, fournisseur, prix cible…"
            onChange={e => onUpdate({ notes: { ...workspace.notes, [l.id]: e.target.value } })} />
        </div>
      </div>
    </SidePanel>
  )
}
