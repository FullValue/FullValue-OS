// Étude de faisabilité et état du connecteur : ce qui est possible, sous quelles conditions.
import { FEASIBILITY } from '@/lib/etsy/feasibility'
import { SIGNALS, PREREQUISITES } from '@/lib/etsy/estimation'

const TONE = {
  ok: { bg: 'var(--green-bg)', color: 'var(--green-deep)' },
  warn: { bg: '#FFF3D1', color: '#9A6B00' },
  info: { bg: '#E5F1FB', color: '#2470B0' },
  off: { bg: 'rgba(var(--ink),0.06)', color: 'var(--text-tertiary)' },
}

function Row({ ok, label, detail }) {
  return (
    <li className="flex items-start gap-2 text-[13px]">
      <span className="mt-0.5 w-4 flex-shrink-0 text-center">{ok ? '✅' : '⛔'}</span>
      <span className="text-[var(--text-secondary)]"><b className="text-[var(--text-primary)]">{label}</b>{detail ? ` — ${detail}` : ''}</span>
    </li>
  )
}

export default function FeasibilityPanel({ status }) {
  return (
    <div className="space-y-4">
      <section className="space-y-2 rounded-[22px] bg-[var(--bg-card)] p-5 shadow-[var(--shadow-card)]">
        <p className="text-[15px] font-semibold text-[var(--text-primary)]">État du connecteur Etsy</p>
        <ul className="space-y-1.5">
          <Row ok={false} label="Application Etsy approuvée" detail="à demander sur etsy.com/developers (Personal App, revue manuelle)" />
          <Row ok={!!status?.configured} label="Clé configurée côté serveur" detail="ETSY_API_KEY + ETSY_SHARED_SECRET (variables Vercel, jamais dans le navigateur)" />
          <Row ok={false} label="Autorisation écrite d’Etsy pour l’usage analytics" detail="exigée par les conditions de l’API" />
          <Row ok={!!status?.live} label="Collecte réelle activée" detail="ETSY_LIVE_ENABLED — désactivée tant que les points ci-dessus ne sont pas réglés" />
          <Row ok={!!status?.trackingAllowed} label="Conservation / suivi des compteurs autorisés" detail="ETSY_TRACKING_ALLOWED — purge automatique (90 jours, 200 observations par boutique)" />
          <Row ok={false} label="Modèle d’estimation calibré et validé" detail="aucun : ventes et CA estimés restent « non disponibles »" />
        </ul>
        {status?.unreachable && <p className="text-[12px] text-[var(--text-tertiary)]">Statut serveur non joignable (normal en local : les fonctions /api ne tournent que sur Vercel).</p>}
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {FEASIBILITY.map(block => (
          <section key={block.id} className="space-y-2 rounded-[22px] bg-[var(--bg-card)] p-5 shadow-[var(--shadow-card)]">
            <span className="inline-block rounded-full px-2.5 py-1 text-[12px] font-semibold" style={TONE[block.tone]}>{block.title}</span>
            {block.note && <p className="text-[12px] text-[var(--text-tertiary)]">{block.note}</p>}
            <ul className="space-y-2">
              {block.items.map(it => (
                <li key={it.label} className="text-[13px]">
                  <p className="font-medium text-[var(--text-primary)]">{it.label}</p>
                  <p className="font-mono text-[11px] text-[var(--text-tertiary)]">{it.how}</p>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <section className="space-y-2 rounded-[22px] bg-[var(--bg-card)] p-5 shadow-[var(--shadow-card)]">
        <p className="text-[15px] font-semibold text-[var(--text-primary)]">Moteur d’estimation — prérequis</p>
        <ul className="list-disc space-y-1 pl-5 text-[13px] text-[var(--text-secondary)]">{PREREQUISITES.map(p => <li key={p}>{p}</li>)}</ul>
        <p className="pt-1 text-[12px] font-semibold text-[var(--text-secondary)]">Signaux candidats (hypothèses à tester) :</p>
        <ul className="grid grid-cols-1 gap-1 text-[12px] text-[var(--text-tertiary)] sm:grid-cols-2">{SIGNALS.map(s => <li key={s.id}>• {s.label} <span className="font-mono">({s.needs})</span></li>)}</ul>
        <p className="text-[12px] italic text-[var(--text-tertiary)]">Pas de formule universelle (« 1 avis = N ventes »), pas de répartition des ventes boutique entre les fiches. Validation sur boutiques et périodes exclues, comparaison à une baseline, erreurs par catégorie documentées (voir docs/ETSY_SOURCING.md).</p>
      </section>
    </div>
  )
}
