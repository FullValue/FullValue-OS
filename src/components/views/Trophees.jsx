import { Flame, Lock, Volume2, VolumeX } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { useGame } from '@/hooks/useGame'
import { ACHIEVEMENTS, ACHIEVEMENT_XP } from '@/lib/achievements'
import { LEVEL_TITLES } from '@/lib/game'
import { playSound } from '@/lib/sound'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const TITLE = 'text-[34px] font-semibold leading-tight tracking-tight text-[var(--text-primary)]'

export default function Trophees() {
  const { state, dispatch } = useStore()
  const game = useGame()
  const unlocked = state.game?.achievements || {}
  const count = Object.keys(unlocked).length
  const sounds = state.settings?.sounds !== false
  const pomo = { work: 25, short: 5, long: 15, every: 4, ...(state.settings?.pomodoro || {}) }
  const setPomo = patch => dispatch({ type: 'UPDATE_SETTINGS', payload: { pomodoro: { ...pomo, ...patch } } })
  const nextTitle = LEVEL_TITLES[Math.min(LEVEL_TITLES.length - 1, Math.floor(game.level / 3))]

  return (
    <div className="space-y-6">
      <div>
        <h1 className={TITLE}>Trophées</h1>
        <p className="text-sm text-[var(--text-tertiary)]">Ta progression, tes succès et les réglages du jeu.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <Card className="relative overflow-hidden border-0 p-6 text-white" style={{ background: 'var(--hero-gradient)' }}>
          <span className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full border-[22px] border-white/10" />
          <p className="text-sm text-white/70">Niveau</p>
          <p className="text-6xl font-semibold leading-none tracking-tight">{game.level}</p>
          <p className="mt-1 text-lg font-medium">{game.title}</p>
          <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/20"><div className="h-full rounded-full bg-white" style={{ width: `${Math.round(game.progress * 100)}%` }} /></div>
          <p className="mt-2 text-xs text-white/70">{game.current} / {game.need} XP vers le niveau {game.level + 1}{nextTitle !== game.title ? ` · prochain titre : ${nextTitle}` : ''} · {game.xp} XP au total</p>
        </Card>
        <div className="grid grid-cols-2 gap-3">
          <Card className="p-4"><p className="text-xs text-[var(--text-tertiary)]">Série en cours</p><p className="flex items-center gap-1 text-3xl font-semibold text-[#FF7A45]"><Flame size={24} /> {game.streak.current}</p><p className="text-[11px] text-[var(--text-tertiary)]">record {game.streak.best} j</p></Card>
          <Card className="p-4"><p className="text-xs text-[var(--text-tertiary)]">Succès</p><p className="text-3xl font-semibold text-[var(--text-primary)]">{count}<span className="text-base text-[var(--text-tertiary)]">/{ACHIEVEMENTS.length}</span></p><p className="text-[11px] text-[var(--text-tertiary)]">+{ACHIEVEMENT_XP} XP chacun</p></Card>
          <Card className="col-span-2 p-4"><p className="text-xs text-[var(--text-tertiary)]">Aujourd'hui</p><p className="text-3xl font-semibold text-[var(--accent)]">+{game.todayXp} XP</p></Card>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
        {ACHIEVEMENTS.map(a => {
          const date = unlocked[a.id]
          return (
            <Card key={a.id} className="flex items-start gap-3 p-4" style={date ? undefined : { opacity: 0.55 }}>
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-2xl" style={{ background: date ? 'var(--brand-100)' : 'var(--bg-card-soft)', filter: date ? 'none' : 'grayscale(1)' }}>
                {date ? a.emoji : <Lock size={16} className="text-[var(--text-tertiary)]" />}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[var(--text-primary)]">{a.title}</p>
                <p className="text-[11px] text-[var(--text-tertiary)]">{a.desc}</p>
                {date && <p className="mt-0.5 text-[10px] text-[var(--accent)]">Débloqué le {new Date(date + 'T12:00:00').toLocaleDateString('fr-FR')}</p>}
              </div>
            </Card>
          )
        })}
      </div>

      <Card className="space-y-4 p-5">
        <p className="font-semibold text-[var(--text-primary)]">Réglages</p>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => { dispatch({ type: 'UPDATE_SETTINGS', payload: { sounds: !sounds } }); if (!sounds) playSound('success') }}>
            {sounds ? <Volume2 size={14} /> : <VolumeX size={14} />} Sons {sounds ? 'activés' : 'coupés'}
          </Button>
        </div>
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-tertiary)]">Pomodoro 🍅 (activable depuis le chrono en haut à droite)</p>
          <div className="flex flex-wrap gap-3 text-xs text-[var(--text-tertiary)]">
            {[['work', 'Séance (min)'], ['short', 'Pause courte'], ['long', 'Pause longue'], ['every', 'Pause longue toutes les']].map(([k, label]) => (
              <label key={k} className="w-36">{label}<Input type="number" min="1" value={pomo[k]} onChange={e => setPomo({ [k]: Math.max(1, Number(e.target.value) || 1) })} /></label>
            ))}
          </div>
        </div>
      </Card>
    </div>
  )
}
