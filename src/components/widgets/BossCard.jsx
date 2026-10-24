import { useState } from 'react'
import { useStore } from '@/store/useStore'
import { bossStatus, BOSS_REWARD } from '@/lib/boss'
import { Card } from '@/components/ui/card'

// Boss de la semaine : sa vie descend à mesure que tu avances sur le défi.
export default function BossCard() {
  const { state } = useStore()
  const boss = bossStatus(state)
  const [now] = useState(() => Date.now())
  const daysLeft = Math.max(0, Math.ceil((boss.week.end - now) / 86400000))
  const hpColor = boss.hpPct > 60 ? '#E5484D' : boss.hpPct > 30 ? '#FF8C42' : '#FFD66B'
  return (
    <Card className="relative h-full overflow-hidden border-0 p-5 text-white" style={{ background: 'var(--hero-dark)' }}>
      <span className="pointer-events-none absolute -bottom-6 -right-4 select-none text-[110px] leading-none opacity-20">{boss.emoji}</span>
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/60">Boss de la semaine · {daysLeft} j restant{daysLeft > 1 ? 's' : ''}</p>
      <p className="mt-1 flex items-center gap-2 text-xl font-semibold tracking-tight"><span className="text-3xl">{boss.emoji}</span>{boss.name}</p>
      <p className="mt-1 text-sm text-white/70">Défi : {boss.goal} {boss.unit}</p>
      {boss.defeated ? (
        <p className="mt-5 rounded-2xl bg-white/15 px-4 py-3 text-sm font-semibold">Vaincu ✓ · +{BOSS_REWARD.xp} XP et +{BOSS_REWARD.coins} pièces</p>
      ) : (
        <div className="mt-5">
          <div className="mb-1 flex justify-between text-xs text-white/70">
            <span>PV {boss.hp} / {boss.goal}</span>
            <span>{boss.value} {boss.unit}</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-white/15">
            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${boss.hpPct}%`, background: hpColor, boxShadow: `0 0 12px ${hpColor}` }} />
          </div>
          <p className="mt-2 text-[11px] text-white/60">Récompense : +{BOSS_REWARD.xp} XP · +{BOSS_REWARD.coins} 🪙</p>
        </div>
      )}
    </Card>
  )
}
