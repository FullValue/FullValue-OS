// Jauge du quota de l'API Etsy (lu dans les en-têtes x-limit-* / x-remaining-* de la dernière réponse).
export default function QuotaGauge({ quota }) {
  const limit = quota?.limitPerDay
  const left = quota?.remainingToday
  if (limit == null || left == null) return null
  const used = Math.max(0, limit - left)
  const pct = Math.min(100, Math.round((used / limit) * 100))
  const color = left < 300 ? 'var(--red-deep)' : left < 1500 ? 'var(--yellow-deep)' : 'var(--green-deep)'
  return (
    <div className="w-56" title={`Quota Etsy : ${used} appels utilisés sur ${limit} aujourd’hui (${quota.limitPerSecond ?? '?'} par seconde max). Remise à zéro sur 24 h glissantes.`}>
      <div className="flex justify-between text-[11px] text-[var(--text-tertiary)]">
        <span>Quota API Etsy</span>
        <span className="font-semibold" style={{ color }}>{left.toLocaleString('fr-FR')} / {limit.toLocaleString('fr-FR')} restants</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[rgba(var(--ink),0.08)]">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  )
}
