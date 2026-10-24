import { useState } from 'react'
import confetti from 'canvas-confetti'
import { Flame, Lock, Volume2, VolumeX, Trash2, Plus } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { useGame } from '@/hooks/useGame'
import { ACHIEVEMENTS, ACHIEVEMENT_XP } from '@/lib/achievements'
import { LEVEL_TITLES } from '@/lib/game'
import { playSound } from '@/lib/sound'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import BossCard from '@/components/widgets/BossCard'
import WinterArcCard from '@/components/widgets/WinterArcCard'
import { seasonsFrom, tierFor, SEASON_TIERS } from '@/lib/season'
import { quarterLabel, quarterOf, northStarOf } from '@/lib/goals'
import { toast, toastUndo } from '@/lib/toast'

const REWARD_PRESETS = [
  { emoji: '🍔', title: 'Resto', cost: 500 },
  { emoji: '🎬', title: 'Ciné', cost: 300 },
  { emoji: '🎮', title: 'Soirée jeux', cost: 250 },
  { emoji: '👟', title: 'Achat plaisir', cost: 1000 },
  { emoji: '🏖️', title: 'Journée off', cost: 1500 },
]

// Saison du trimestre : rang selon l'XP gagnée, objectifs du trimestre, saisons passées.
function SeasonCard({ game }) {
  const { state } = useStore()
  const quarter = quarterOf()
  const seasons = seasonsFrom(game.xpByDay)
  const current = seasons.find(s => s.quarter === quarter) || { quarter, xp: 0, tier: tierFor(0) }
  const t = current.tier
  const span = t.next ? t.next.min - t.min : 1
  const goalsAvg = state.projects.length ? Math.round(state.projects.reduce((s, p) => s + northStarOf(p, state).pct, 0) / state.projects.length) : 0
  return (
    <Card className="flex h-full flex-col p-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-tertiary)]">Saison · {quarterLabel(quarter)}</p>
      <div className="mt-2 flex items-center gap-3">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl text-3xl" style={{ background: t.color + '22' }}>{t.emoji}</span>
        <div>
          <p className="text-2xl font-semibold tracking-tight" style={{ color: t.color }}>{t.label}</p>
          <p className="text-xs text-[var(--text-tertiary)]">{current.xp} XP cette saison{t.next ? ` · ${t.toNext} XP avant ${t.next.label}` : ' · rang maximum'}</p>
        </div>
      </div>
      {t.next && <Progress value={Math.round(((current.xp - t.min) / span) * 100)} className="mt-3" />}
      <div className="mt-3 flex gap-1">
        {SEASON_TIERS.map(x => <span key={x.id} title={`${x.label} : ${x.min} XP`} className="flex-1 rounded-full py-0.5 text-center text-[11px]" style={{ background: current.xp >= x.min ? x.color + '33' : 'var(--bg-card-soft)', opacity: current.xp >= x.min ? 1 : 0.5 }}>{x.emoji}</span>)}
      </div>
      <p className="mt-3 text-xs text-[var(--text-secondary)]">Objectifs du trimestre : <b>{goalsAvg} %</b> en moyenne sur tes pôles.</p>
      {seasons.filter(s => s.quarter !== quarter).length > 0 && (
        <div className="mt-auto pt-3">
          <p className="mb-1 text-[11px] text-[var(--text-tertiary)]">Saisons passées</p>
          <div className="flex flex-wrap gap-1.5">
            {seasons.filter(s => s.quarter !== quarter).slice(0, 6).map(s => (
              <span key={s.quarter} className="rounded-full bg-[var(--bg-card-soft)] px-2.5 py-1 text-[11px] text-[var(--text-secondary)]">{s.tier.emoji} {s.quarter.replace('-', ' ')} · {s.xp} XP</span>
            ))}
          </div>
        </div>
      )}
    </Card>
  )
}

// Boutique : l'XP rapporte des pièces (1 pour 10 XP, + les boss), échangées contre de vraies récompenses.
function Shop({ game }) {
  const { state, dispatch } = useStore()
  const [title, setTitle] = useState('')
  const [emoji, setEmoji] = useState('🎁')
  const [cost, setCost] = useState('')
  const rewards = state.rewards || []
  const claims = [...(state.rewardClaims || [])].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
  const balance = game.coins.balance

  function add(r) {
    dispatch({ type: 'ADD_ENTITY', payload: { collection: 'rewards', item: { title: r.title, emoji: r.emoji || '🎁', cost: Number(r.cost) || 0 } } })
  }
  function buy(r) {
    if (balance < r.cost) { toast.error(`Encore ${r.cost - balance} pièces pour « ${r.title} »`); return }
    dispatch({ type: 'ADD_ENTITY', payload: { collection: 'rewardClaims', item: { rewardId: r.id, title: r.title, emoji: r.emoji, cost: r.cost } } })
    confetti({ particleCount: 90, spread: 70, origin: { y: 0.7 } })
    toast.success(`${r.emoji} ${r.title} : profite, tu l'as mérité !`, { description: `-${r.cost} pièces` })
  }

  return (
    <Card className="space-y-4 p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-semibold text-[var(--text-primary)]">Boutique de récompenses</p>
        <p className="text-sm text-[var(--text-secondary)]"><span className="text-2xl font-semibold text-[var(--text-primary)]">🪙 {balance}</span> pièces · 1 pièce pour 10 XP, +100 par boss vaincu</p>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
        {rewards.map(r => {
          const pct = Math.min(100, Math.round((balance / (r.cost || 1)) * 100))
          return (
            <div key={r.id} className="group relative rounded-2xl bg-[var(--bg-card-soft)] p-4">
              <button type="button" aria-label="Retirer" onClick={() => { dispatch({ type: 'DELETE_ENTITY', payload: { collection: 'rewards', id: r.id } }); toastUndo('Récompense retirée', () => dispatch({ type: 'RESTORE_ITEMS', payload: { rewards: [r] } })) }}
                className="absolute right-2 top-2 opacity-0 group-hover:opacity-100"><Trash2 size={12} className="text-[var(--text-tertiary)]" /></button>
              <p className="text-3xl">{r.emoji}</p>
              <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">{r.title}</p>
              <p className="text-xs text-[var(--text-tertiary)]">🪙 {r.cost}</p>
              <Progress value={pct} className="mt-2 h-1" />
              <Button size="sm" className="mt-3 w-full" disabled={balance < r.cost} onClick={() => buy(r)}>{balance < r.cost ? `Encore ${r.cost - balance}` : 'Échanger'}</Button>
            </div>
          )
        })}
      </div>
      <div className="flex flex-wrap gap-2">
        {REWARD_PRESETS.filter(p => !rewards.some(r => r.title === p.title)).map(p => (
          <button key={p.title} type="button" onClick={() => add(p)} className="flex items-center gap-1.5 rounded-full bg-[var(--bg-card-soft)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
            <Plus size={11} /> {p.emoji} {p.title} · {p.cost}
          </button>
        ))}
      </div>
      <form onSubmit={e => { e.preventDefault(); if (!title.trim() || !Number(cost)) return; add({ title: title.trim(), emoji, cost }); setTitle(''); setCost('') }} className="flex flex-wrap gap-2">
        <Input value={emoji} onChange={e => setEmoji(e.target.value)} className="w-14 text-center" maxLength={2} aria-label="Emoji" />
        <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ta récompense (ex. Massage)" className="min-w-[180px] flex-1" />
        <Input value={cost} onChange={e => setCost(e.target.value)} type="number" min="1" placeholder="Prix en pièces" className="w-36" />
        <Button type="submit">Ajouter</Button>
      </form>
      {claims.length > 0 && (
        <div>
          <p className="mb-1 text-[11px] text-[var(--text-tertiary)]">Déjà obtenues</p>
          <div className="flex flex-wrap gap-1.5">
            {claims.slice(0, 12).map(c => <span key={c.id} className="rounded-full bg-[var(--brand-100)] px-2.5 py-1 text-[11px] text-[var(--accent)]">{c.emoji} {c.title} · {new Date(c.createdAt).toLocaleDateString('fr-FR')}</span>)}
          </div>
        </div>
      )}
    </Card>
  )
}

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
        <p className="text-sm text-[var(--text-tertiary)]">Ta progression, tes succès, ta boutique et les réglages du jeu.</p>
        <Button size="sm" variant="outline" className="mt-3" onClick={() => window.dispatchEvent(new Event('cockpit:open-wrapped'))}>✨ Bilan de la semaine</Button>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.3fr_1fr]">
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

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SeasonCard game={game} />
        <BossCard />
      </div>

      <WinterArcCard />

      <Shop game={game} />

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
