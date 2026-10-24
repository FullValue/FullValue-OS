import { Snowflake } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { arcDaysSummary } from '@/lib/game'
import { arcInfo, quoteOfDay } from '@/lib/winterArc'

// Bandeau du tableau de bord pendant l'Arc : jour, citation, focus du jour.
export default function WinterArcBanner() {
  const { state } = useStore()
  const arc = arcInfo(state)
  if (!arc.active) return null
  const s = arcDaysSummary(state)
  const pct = Math.min(100, Math.round((s.focusTodayMin / arc.focusGoalMin) * 100))
  return (
    <div className="relative overflow-hidden rounded-[22px] px-6 py-5 text-white" style={{ background: 'var(--hero-dark)' }}>
      <Snowflake className="pointer-events-none absolute -right-4 -top-4 h-32 w-32 opacity-10" />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-white/60">❄️ Winter Arc · Jour {arc.dayIndex} / {arc.totalDays} · {arc.daysLeft} j restants · XP ×2</p>
          <p className="mt-1 max-w-2xl text-lg font-medium leading-snug">« {quoteOfDay()} »</p>
        </div>
        <div className="w-56">
          <div className="mb-1 flex justify-between text-xs text-white/70">
            <span>Focus du jour</span>
            <span>{Math.floor(s.focusTodayMin / 60)} h {String(s.focusTodayMin % 60).padStart(2, '0')} / {arc.focusGoalMin / 60} h</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-white" style={{ width: `${pct}%` }} /></div>
          <p className="mt-1 text-[11px] text-white/60">{s.todayValidated ? 'Journée validée ✓' : 'Focus + toutes les routines pour valider la journée'}</p>
        </div>
      </div>
    </div>
  )
}
