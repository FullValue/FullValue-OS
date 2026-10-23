import { Check } from 'lucide-react'
import { Progress } from '@/components/ui/progress'

// Une quête du jour : pastille, intitulé, avancement et récompense.
export default function QuestItem({ quest }) {
  const pct = Math.min(100, Math.round((quest.value / quest.goal) * 100))
  return (
    <li className="space-y-1">
      <div className="flex items-center gap-2 text-sm">
        <span
          className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full"
          style={{ background: quest.done ? 'var(--green-deep)' : 'var(--bg-page)', border: quest.done ? 'none' : '1px solid var(--border-medium)' }}
        >
          {quest.done && <Check size={10} color="#fff" strokeWidth={3} />}
        </span>
        <span className={`flex-1 ${quest.done ? 'text-[var(--text-tertiary)] line-through' : 'text-[var(--text-primary)]'}`}>{quest.title}</span>
        <span className="text-[11px] text-[var(--text-tertiary)]">
          {Math.min(quest.value, quest.goal)}/{quest.goal}{quest.unit ? ` ${quest.unit}` : ''}
        </span>
        <span className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold" style={{ background: 'var(--violet-bg)', color: 'var(--violet-deep)' }}>+{quest.reward}</span>
      </div>
      {!quest.done && <Progress value={pct} className="h-1" />}
    </li>
  )
}
