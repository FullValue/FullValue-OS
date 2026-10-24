import { Flame, Check, Plus } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { localDateStr } from '@/lib/backup'
import { dueToday, doneOn, habitStreak } from '@/lib/habits'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

// Habitudes du jour, cochables en un clic depuis le tableau de bord.
export default function HabitsCard({ onNavigate }) {
  const { state, dispatch } = useStore()
  const today = localDateStr()
  const habits = dueToday(state.habits || [])
  const done = habits.filter(h => doneOn(state.habitLogs, h.id, today)).length

  return (
    <Card className="flex h-full flex-col border-0 p-5">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[17px] font-semibold tracking-tight text-[var(--text-primary)]">Routines du jour</p>
        <span className="text-xs text-[var(--text-tertiary)]">{done}/{habits.length}</span>
      </div>
      {habits.length ? (
        <ul className="space-y-1.5">
          {habits.map(h => {
            const isDone = doneOn(state.habitLogs, h.id, today)
            const streak = habitStreak(h, state.habitLogs)
            return (
              <li key={h.id}>
                <button
                  type="button"
                  onClick={() => dispatch({ type: 'TOGGLE_HABIT', payload: { habitId: h.id, date: today } })}
                  className="flex w-full items-center gap-3 rounded-2xl px-2 py-2 text-left transition-colors hover:bg-[rgba(var(--ink),0.04)]"
                >
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-base transition-all"
                    style={isDone ? { background: 'var(--accent)', color: '#fff' } : { background: 'var(--bg-card-soft)' }}
                  >
                    {isDone ? <Check size={15} strokeWidth={3} /> : h.emoji}
                  </span>
                  <span className={`flex-1 text-sm ${isDone ? 'text-[var(--text-tertiary)] line-through' : 'text-[var(--text-primary)]'}`}>{h.name}</span>
                  {streak > 0 && <span className="flex items-center gap-0.5 text-xs font-semibold text-[#FF7A45]"><Flame size={12} /> {streak}</span>}
                </button>
              </li>
            )
          })}
        </ul>
      ) : (
        <div className="flex flex-1 flex-col items-start justify-center gap-3">
          <p className="text-sm text-[var(--text-tertiary)]">Aucune routine prévue aujourd'hui. Prières, sport, lecture… chaque case cochée rapporte de l'XP.</p>
          <Button size="sm" onClick={() => onNavigate('habitudes')}><Plus size={13} /> Créer mes routines</Button>
        </div>
      )}
    </Card>
  )
}
