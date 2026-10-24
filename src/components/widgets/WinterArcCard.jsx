import { useState } from 'react'
import { Snowflake } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { localDateStr } from '@/lib/backup'
import { arcDaysSummary } from '@/lib/game'
import { ARC_DURATIONS, ARC_DEFAULT_FOCUS_MIN, arcEndDate, arcInfo, quoteOfDay } from '@/lib/winterArc'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'

const FOCUS_GOALS = [120, 180, 240]
const RULES = ['XP doublée chaque jour de l’Arc', 'Une journée ne compte que si l’objectif de focus est atteint et toutes les routines faites', 'Boss de glace : objectif ×1,5, récompense ×2', 'À la fin : succès ❄️, bonnet exclusif pour ton avatar et bilan spécial']

// Lancement, suivi et arrêt du Winter Arc (page Trophées).
export default function WinterArcCard() {
  const { state, dispatch } = useStore()
  const arc = arcInfo(state)
  const [duration, setDuration] = useState('year-end')
  const [goal, setGoal] = useState(ARC_DEFAULT_FOCUS_MIN)
  const set = patch => dispatch({ type: 'UPDATE_SETTINGS', payload: { winterArc: { ...(state.settings?.winterArc || {}), ...patch } } })
  const summary = arcDaysSummary(state)

  if (arc.active) {
    return (
      <Card className="relative space-y-4 overflow-hidden border-0 p-6 text-white" style={{ background: 'var(--hero-dark)' }}>
        <Snowflake className="pointer-events-none absolute -right-6 -top-6 h-40 w-40 opacity-10" />
        <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-white/60">Winter Arc en cours</p>
        <p className="text-3xl font-semibold tracking-tight">Jour {arc.dayIndex} / {arc.totalDays}</p>
        <Progress value={Math.round((arc.dayIndex / arc.totalDays) * 100)} />
        <p className="text-sm text-white/75">{summary.validated} jour{summary.validated > 1 ? 's' : ''} validé{summary.validated > 1 ? 's' : ''} sur {summary.elapsed} · objectif {arc.focusGoalMin / 60} h de focus par jour · fin le {new Date(arc.endDate + 'T12:00:00').toLocaleDateString('fr-FR')}</p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" onClick={() => set({ snow: !arc.snow })}>{arc.snow ? 'Couper la neige' : 'Remettre la neige'}</Button>
          <Button size="sm" variant="ghost" className="text-white/70 hover:bg-white/10 hover:text-white" onClick={() => { if (window.confirm('Abandonner le Winter Arc ? Ta progression reste, mais le succès ne sera pas débloqué.')) set({ active: false }) }}>Abandonner</Button>
        </div>
      </Card>
    )
  }

  return (
    <Card className="space-y-4 p-6">
      <div className="flex items-center gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl text-2xl" style={{ background: 'var(--hero-dark)' }}>❄️</span>
        <div>
          <p className="text-lg font-semibold text-[var(--text-primary)]">Winter Arc</p>
          <p className="text-xs text-[var(--text-tertiary)]">{arc.completed ? 'Dernier Arc terminé ✓ · prêt pour le suivant ?' : 'Une période de discipline renforcée, ambiance hiver.'}</p>
        </div>
      </div>
      <ul className="space-y-1 text-sm text-[var(--text-secondary)]">{RULES.map(r => <li key={r}>❄️ {r}</li>)}</ul>
      <div>
        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-tertiary)]">Durée</p>
        <div className="flex flex-wrap gap-2">
          {ARC_DURATIONS.map(d => <button key={d.id} type="button" onClick={() => setDuration(d.id)} className="rounded-full px-3 py-1.5 text-xs font-medium" style={duration === d.id ? { background: 'var(--accent)', color: '#fff' } : { background: 'var(--bg-card-soft)', color: 'var(--text-secondary)' }}>{d.label}</button>)}
        </div>
      </div>
      <div>
        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-tertiary)]">Focus par jour</p>
        <div className="flex gap-2">
          {FOCUS_GOALS.map(g => <button key={g} type="button" onClick={() => setGoal(g)} className="rounded-full px-3 py-1.5 text-xs font-medium" style={goal === g ? { background: 'var(--accent)', color: '#fff' } : { background: 'var(--bg-card-soft)', color: 'var(--text-secondary)' }}>{g / 60} h</button>)}
        </div>
      </div>
      <p className="text-xs italic text-[var(--text-tertiary)]">« {quoteOfDay()} »</p>
      <Button size="lg" onClick={() => {
        const start = new Date()
        set({ active: true, completed: false, startDate: localDateStr(start), endDate: arcEndDate(duration, start), focusGoalMin: goal, snow: true })
      }}>❄️ Lancer le Winter Arc</Button>
    </Card>
  )
}
