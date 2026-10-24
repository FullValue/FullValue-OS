import { useMemo, useState } from 'react'
import { Check, LogOut, Play, Crosshair, Mountain as MountainIcon } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { useGame } from '@/hooks/useGame'
import { localDateStr } from '@/lib/backup'
import { dueToday, doneOn } from '@/lib/habits'
import { arcDaysDetail, arcDaysSummary } from '@/lib/game'
import { ARC_SUMMIT_M, arcInfo, quoteOfDay } from '@/lib/winterArc'
import MountainScene from '@/components/ascension/MountainScene'
import WinterArcCard from '@/components/widgets/WinterArcCard'
import { TimerChip } from '@/components/layout/TopBar'

const GLASS = 'bg-[var(--bg-material)] backdrop-blur-xl shadow-[var(--shadow-float)]'
const fmtDate = d => new Date(d + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })

function Stat({ label, value }) {
  return (
    <div className="rounded-2xl bg-[var(--bg-card)] px-3 py-2 shadow-[var(--shadow-card)]">
      <p className="text-[10px] uppercase tracking-[0.08em] text-[var(--text-tertiary)]">{label}</p>
      <p className="text-sm font-semibold tabular-nums text-[var(--text-primary)]">{value}</p>
    </div>
  )
}

// Étape du jour : ce qu'il reste à faire pour planter le drapeau d'aujourd'hui.
function TodayStep({ arc, summary, timer }) {
  const { state, dispatch } = useStore()
  const today = localDateStr()
  const habits = dueToday(state.habits || [])
  const focusPct = Math.min(100, Math.round((summary.focusTodayMin / arc.focusGoalMin) * 100))
  const focusLeft = Math.max(0, arc.focusGoalMin - summary.focusTodayMin)
  const habitsLeft = habits.filter(h => !doneOn(state.habitLogs, h.id, today)).length
  const timerActive = timer?.running || timer?.paused

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-tertiary)]">Étape du jour · {arc.dayIndex} / {arc.totalDays}</p>
        <p className="mt-1 text-sm font-medium text-[var(--text-primary)]">
          {summary.todayValidated ? '🚩 Drapeau planté : tu montes d’une étape.' : `Il manque ${[focusLeft ? `${focusLeft} min de focus` : null, habitsLeft ? `${habitsLeft} routine${habitsLeft > 1 ? 's' : ''}` : null].filter(Boolean).join(' et ')}.`}
        </p>
      </div>
      <div>
        <div className="mb-1.5 flex justify-between text-xs text-[var(--text-secondary)]">
          <span>Focus</span>
          <span className="tabular-nums">{Math.floor(summary.focusTodayMin / 60)} h {String(summary.focusTodayMin % 60).padStart(2, '0')} / {arc.focusGoalMin / 60} h</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-[var(--bg-card-soft)]">
          <div className="h-full rounded-full transition-all" style={{ width: `${focusPct}%`, background: 'linear-gradient(90deg, #38bdf8, #7dd3fc)' }} />
        </div>
        {!timerActive && timer && focusLeft > 0 && (
          <button type="button" onClick={timer.toggle} className="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-[var(--accent)] py-2.5 text-sm font-semibold text-white">
            <Play size={14} fill="currentColor" /> Lancer un focus
          </button>
        )}
      </div>
      {habits.length > 0 && (
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-tertiary)]">Routines</p>
          <div className="flex flex-wrap gap-1.5">
            {habits.map(h => {
              const done = doneOn(state.habitLogs, h.id, today)
              return (
                <button key={h.id} type="button" onClick={() => dispatch({ type: 'TOGGLE_HABIT', payload: { habitId: h.id, date: today } })}
                  className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium"
                  style={done ? { background: 'var(--accent)', color: '#fff' } : { background: 'var(--bg-card-soft)', color: 'var(--text-secondary)' }}>
                  {done ? <Check size={12} /> : <span>{h.emoji}</span>} {h.name}
                </button>
              )
            })}
          </div>
        </div>
      )}
      <p className="text-xs italic text-[var(--text-tertiary)]">« {quoteOfDay()} »</p>
    </div>
  )
}

// Vue alternative à l'open space : l'Arc vu comme une ascension. Chargée en lazy (three.js).
export default function Ascension({ onNavigate, timer }) {
  const { state } = useStore()
  const game = useGame()
  const arc = arcInfo(state)
  const days = useMemo(() => arcDaysDetail(state), [state])
  const summary = arcDaysSummary(state)
  const [focus, setFocus] = useState(0)
  const n = days.length
  const validated = days.filter(d => d.validated).length
  const altitude = n ? Math.round((validated / n) * ARC_SUMMIT_M) : 0

  const subtitle = arc.active
    ? `Winter Arc · jour ${arc.dayIndex} / ${arc.totalDays} · sommet le ${fmtDate(arc.endDate)}`
    : arc.startDate
      ? `Dernier Arc ${arc.completed ? 'terminé' : 'interrompu'} · ${validated} / ${n} jours validés`
      : 'Chaque jour validé du Winter Arc te fait monter d’une étape.'

  return (
    <div className="relative h-full w-full overflow-hidden rounded-[26px] sm:rounded-none" style={{ minHeight: 'calc(100dvh - 120px)' }}>
      <MountainScene days={days} avatarColor={state.settings?.avatar?.color} focusAvatar={focus} />

      {/* En-tête */}
      <div className={`absolute left-4 right-4 top-4 z-20 rounded-[22px] px-5 py-3 sm:right-auto sm:max-w-[min(560px,calc(100%-24rem))] ${GLASS}`}>
        <div className="flex items-center gap-2">
          <MountainIcon size={20} className="text-[var(--accent)]" />
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">Ascension</h1>
        </div>
        <p className="mt-0.5 text-xs text-[var(--text-tertiary)]">{subtitle}</p>
        {n > 0 && (
          <p className="mt-1.5 text-xs font-medium text-[var(--text-secondary)] sm:hidden">⛰ {altitude.toLocaleString('fr-FR')} m · 🚩 {validated} / {summary.elapsed || n} · 🔥 {game.streak.current} j</p>
        )}
        {n > 0 && (
          <div className="mt-3 hidden gap-2 sm:grid sm:grid-cols-4">
            <Stat label="Altitude" value={`${altitude.toLocaleString('fr-FR')} m`} />
            <Stat label="Validés" value={`${validated} / ${summary.elapsed || n}`} />
            <Stat label="Série" value={`🔥 ${game.streak.current} j`} />
            <Stat label="Restants" value={arc.active ? `${arc.daysLeft} j` : '—'} />
          </div>
        )}
      </div>

      {/* Chrono, recentrage et sortie */}
      <div className="absolute right-4 top-4 z-20 hidden items-center gap-2 sm:flex">
        {timer && <TimerChip timer={timer} />}
        <button type="button" onClick={() => setFocus(f => (f ? 0 : 1))} aria-pressed={!!focus} title={focus ? 'Vue d’ensemble' : 'Me retrouver sur le sentier'}
          className={`flex h-11 w-11 items-center justify-center rounded-full ${focus ? 'text-[var(--accent)]' : 'text-[var(--text-secondary)]'} ${GLASS}`}>
          <Crosshair size={17} />
        </button>
        <button type="button" onClick={() => onNavigate('journee')} className={`flex h-11 items-center gap-2 rounded-full px-4 text-sm font-medium text-[var(--text-secondary)] ${GLASS}`}>
          <LogOut size={15} /> Quitter
        </button>
      </div>

      {/* Panneau : étape du jour, ou lancement d'un Arc */}
      <aside className={`absolute bottom-4 left-4 right-4 z-30 max-h-[40%] overflow-y-auto rounded-[26px] p-4 sm:bottom-4 sm:left-auto sm:top-20 sm:max-h-none sm:w-[360px] ${GLASS}`}>
        {arc.active ? <TodayStep arc={arc} summary={summary} timer={timer} /> : <WinterArcCard />}
      </aside>

      {/* Légende */}
      <div className={`absolute bottom-4 left-4 z-20 hidden gap-3 rounded-full px-4 py-2 text-[11px] text-[var(--text-secondary)] lg:flex ${GLASS}`}>
        <span>🚩 Jour validé</span>
        <span>🪨 Jour manqué</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#fbbf24]" /> Aujourd’hui</span>
        <span>Glisser pour tourner, molette pour zoomer</span>
      </div>
    </div>
  )
}
