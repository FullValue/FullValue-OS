import { useState } from 'react'
import { Flame, Check, Trash2, Plus } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { localDateStr } from '@/lib/backup'
import { HABIT_PRESETS, WEEKDAYS, doneOn, habitStreak, isDue, lastDays } from '@/lib/habits'
import { toastUndo } from '@/lib/toast'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const TITLE = 'text-[34px] font-semibold leading-tight tracking-tight text-[var(--text-primary)]'

function HabitRow({ habit }) {
  const { state, dispatch } = useStore()
  const today = localDateStr()
  const due = isDue(habit, new Date())
  const done = doneOn(state.habitLogs, habit.id, today)
  const streak = habitStreak(habit, state.habitLogs)
  const week = lastDays(habit, state.habitLogs, 14)
  const dueDays = week.filter(d => d.due)
  const rate = dueDays.length ? Math.round((dueDays.filter(d => d.done).length / dueDays.length) * 100) : 0

  function remove() {
    dispatch({ type: 'DELETE_ENTITY', payload: { collection: 'habits', id: habit.id } })
    toastUndo('Habitude supprimée', () => dispatch({ type: 'RESTORE_ITEMS', payload: { habits: [habit] } }))
  }

  return (
    <Card className="group flex flex-wrap items-center gap-4 p-4">
      <button
        type="button"
        disabled={!due}
        onClick={() => dispatch({ type: 'TOGGLE_HABIT', payload: { habitId: habit.id, date: today } })}
        aria-label={done ? 'Décocher' : 'Valider aujourd’hui'}
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-xl transition-all active:scale-95 disabled:opacity-40"
        style={done ? { background: 'var(--accent)', color: '#fff' } : { background: 'var(--bg-card-soft)' }}
      >
        {done ? <Check size={20} strokeWidth={3} /> : habit.emoji}
      </button>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-[var(--text-primary)]">{habit.name}</p>
        <p className="text-xs text-[var(--text-tertiary)]">
          {habit.days?.length ? habit.days.map(d => WEEKDAYS[d - 1]).join(' ') : 'Tous les jours'}
          {!due && ' · pas prévue aujourd’hui'} · {rate}% sur 14 jours
        </p>
      </div>
      <div className="flex gap-1" aria-label="14 derniers jours">
        {week.map(d => (
          <span
            key={d.date}
            title={d.date}
            className="h-6 w-2.5 rounded-full"
            style={{ background: !d.due ? 'transparent' : d.done ? 'var(--accent)' : 'rgba(var(--ink),0.1)', border: d.due ? 'none' : '1px dashed var(--border-medium)' }}
          />
        ))}
      </div>
      <span className="flex w-14 items-center justify-end gap-1 text-sm font-semibold" style={{ color: streak ? '#FF7A45' : 'var(--text-tertiary)' }}>
        <Flame size={15} /> {streak}
      </span>
      <Button variant="ghost" size="icon-sm" onClick={remove} aria-label="Supprimer" className="opacity-0 group-hover:opacity-100"><Trash2 size={13} /></Button>
    </Card>
  )
}

export default function Habitudes() {
  const { state, dispatch } = useStore()
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState('✨')
  const [days, setDays] = useState([])
  const habits = (state.habits || []).filter(h => !h.archived)
  const existing = new Set(habits.map(h => h.name))

  function add(h) {
    dispatch({ type: 'ADD_ENTITY', payload: { collection: 'habits', item: { name: h.name, emoji: h.emoji || '✨', days: h.days || [] } } })
  }

  function submit(e) {
    e.preventDefault()
    if (!name.trim()) return
    add({ name: name.trim(), emoji: emoji.trim() || '✨', days })
    setName('')
    setDays([])
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className={TITLE}>Habitudes</h1>
        <p className="text-sm text-[var(--text-tertiary)]">Tes routines du quotidien. Chaque case cochée rapporte 5 XP, et 10 de bonus si tu valides toutes celles du jour.</p>
      </div>

      <div className="space-y-3">
        {habits.map(h => <HabitRow key={h.id} habit={h} />)}
        {!habits.length && <p className="text-sm text-[var(--text-tertiary)]">Aucune habitude pour l'instant : choisis-en dans les modèles ou crée la tienne.</p>}
      </div>

      <Card className="space-y-4 p-5">
        <p className="text-sm font-semibold text-[var(--text-primary)]">Ajouter une habitude</p>
        <div className="flex flex-wrap gap-2">
          {HABIT_PRESETS.filter(p => !existing.has(p.name)).map(p => (
            <button key={p.name} type="button" onClick={() => add(p)} className="flex items-center gap-1.5 rounded-full bg-[var(--bg-card-soft)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
              <Plus size={11} /> {p.emoji} {p.name}
            </button>
          ))}
        </div>
        <form onSubmit={submit} className="flex flex-wrap items-center gap-2">
          <Input value={emoji} onChange={e => setEmoji(e.target.value)} className="w-14 text-center" maxLength={2} aria-label="Emoji" />
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex. Appeler un prospect" className="min-w-[200px] flex-1" />
          <div className="flex gap-1">
            {WEEKDAYS.map((d, i) => (
              <button
                key={i} type="button"
                onClick={() => setDays(ds => (ds.includes(i + 1) ? ds.filter(x => x !== i + 1) : [...ds, i + 1].sort()))}
                className="h-9 w-9 rounded-full text-xs font-semibold"
                style={days.includes(i + 1) ? { background: 'var(--accent)', color: '#fff' } : { background: 'var(--bg-card-soft)', color: 'var(--text-tertiary)' }}
                aria-label={`Jour ${i + 1}`}
              >{d}</button>
            ))}
          </div>
          <Button type="submit">Ajouter</Button>
        </form>
        <p className="text-[11px] text-[var(--text-tertiary)]">Aucun jour sélectionné = tous les jours.</p>
      </Card>
    </div>
  )
}
