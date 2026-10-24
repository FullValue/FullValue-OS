import { Flame, Sparkles } from 'lucide-react'
import { useGame } from '@/hooks/useGame'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import QuestItem from '@/components/widgets/QuestItem'

const LABEL = 'text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-tertiary)]'

export default function GameCard() {
  const game = useGame()
  const { streak } = game
  return (
    <Card className="p-5">
      <div className="grid grid-cols-1 gap-5 md:grid-cols-[1fr_1.3fr]">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div
              className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-2xl"
              style={{ background: 'var(--violet-bg)', color: 'var(--violet-deep)' }}
            >
              <span className="text-[9px] font-semibold uppercase leading-none">Niv.</span>
              <span className="text-lg font-bold leading-tight">{game.level}</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-[var(--text-primary)]">{game.title}</p>
              <Progress value={Math.round(game.progress * 100)} className="mt-1.5 h-1.5" />
              <p className="mt-1 text-[11px] text-[var(--text-tertiary)]">
                {game.current} / {game.need} XP vers le niveau {game.level + 1}
                {game.todayXp > 0 && <span className="text-[var(--green-deep)]"> · +{game.todayXp} aujourd'hui</span>}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-xl px-3 py-2.5" style={{ background: 'var(--bg-page)' }}>
            <Flame size={22} style={{ color: streak.current ? '#FF7A45' : 'var(--text-tertiary)' }} fill={streak.current ? '#FFB088' : 'none'} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                {streak.current ? `${streak.current} jour${streak.current > 1 ? 's' : ''} d'affilée` : 'Aucune série en cours'}
                {streak.best > streak.current && <span className="ml-1.5 text-[11px] font-normal text-[var(--text-tertiary)]">record {streak.best}</span>}
              </p>
              <p className="text-[11px] text-[var(--text-tertiary)]">
                {streak.todayValidated
                  ? 'Journée validée ✓'
                  : '1 tâche à fort impact, 60 min de focus ou 3 tâches pour valider la journée'}
              </p>
            </div>
          </div>
        </div>

        <div>
          <p className={`${LABEL} mb-3 flex items-center gap-1.5`}><Sparkles size={12} /> Quêtes du jour</p>
          <ul className="space-y-3">
            {game.quests.map(q => <QuestItem key={q.id} quest={q} />)}
          </ul>
        </div>
      </div>
    </Card>
  )
}
