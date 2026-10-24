// Bilan de la semaine façon « Wrapped » : des slides plein écran, comme des stories.
// S'ouvre seul le dimanche à partir de 18 h (une fois par semaine), ou via l'événement cockpit:open-wrapped.
import { useCallback, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { useGame } from '@/hooks/useGame'
import { localDateStr } from '@/lib/backup'
import { bossStatus, bossOfWeek, weekBounds } from '@/lib/boss'
import { ACHIEVEMENTS } from '@/lib/achievements'
import { playSound } from '@/lib/sound'

const SLIDE_MS = 5500
const BACKGROUNDS = [
  'var(--hero-gradient)',
  'var(--noise), radial-gradient(120% 120% at 100% 0%, #ff8c42 0%, #e5484d 50%, #3a0d1f 100%)',
  'var(--noise), radial-gradient(120% 120% at 0% 100%, #22a06b 0%, #0f5c3d 50%, #04261a 100%)',
  'var(--hero-dark)',
  'var(--noise), radial-gradient(120% 120% at 50% 0%, #8b5cf6 0%, #4c1d95 55%, #1e0b3d 100%)',
  'var(--noise), radial-gradient(120% 120% at 100% 100%, #ffd66b 0%, #e0a800 45%, #3d2a00 100%)',
  'var(--hero-gradient)',
]

// Numéro de semaine ISO (le même que sur le tableau de bord).
function isoWeek(d) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const dayNum = date.getUTCDay() || 7
  date.setUTCDate(date.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  return Math.ceil((((date - yearStart) / 86400000) + 1) / 7)
}

// range (optionnel) : { start, end } en AAAA-MM-JJ pour le bilan d'un Winter Arc entier.
function weeklyStats(state, game, now = new Date(), range = null) {
  const w = range
    ? { start: new Date(range.start + 'T00:00:00').getTime(), end: new Date(range.end + 'T00:00:00').getTime() + 86400000 }
    : weekBounds(now)
  const inW = iso => { if (!iso) return false; const t = new Date(iso).getTime(); return t >= w.start && t < w.end }
  const days = Array.from({ length: Math.round((w.end - w.start) / 86400000) }, (_, i) => localDateStr(new Date(w.start + i * 86400000 + 43200000)))
  const sessions = state.sessions.filter(s => inW(s.date))
  const focusMin = Math.round(sessions.reduce((s, x) => s + (x.duration || 0), 0) / 60)
  const focusByDay = days.map(d => Math.round(sessions.filter(s => localDateStr(new Date(s.date)) === d).reduce((s, x) => s + (x.duration || 0), 0) / 60))
  const bestIdx = focusByDay.indexOf(Math.max(...focusByDay))
  const done = state.tasks.filter(t => t.status === 'done' && inW(t.completedAt))
  const byPole = {}
  for (const t of done) byPole[t.projectId] = (byPole[t.projectId] || 0) + 1
  const topPoleId = Object.entries(byPole).sort((a, b) => b[1] - a[1])[0]?.[0]
  const habitsChecked = days.reduce((s, d) => s + (state.habitLogs?.[d]?.length || 0), 0)
  const prayersOnTime = days.reduce((s, d) => s + Object.values(state.prayerLogs?.[d] || {}).filter(v => v === 'ontime').length, 0)
  const prayersLogged = days.reduce((s, d) => s + Object.keys(state.prayerLogs?.[d] || {}).length, 0)
  const wins = (state.dailyReviews || []).filter(r => days.includes(r.date)).flatMap(r => r.wins || [])
  const unlocked = Object.entries(state.game?.achievements || {}).filter(([, d]) => days.includes(d)).map(([id]) => ACHIEVEMENTS.find(a => a.id === id)).filter(Boolean)
  const xp = days.reduce((s, d) => s + (game.xpByDay[d] || 0), 0)
  return {
    weekNumber: isoWeek(new Date(w.start)),
    focusMin, bestDay: focusByDay[bestIdx] > 0 ? new Date(days[bestIdx] + 'T12:00:00').toLocaleDateString('fr-FR', range ? { weekday: 'long', day: 'numeric', month: 'long' } : { weekday: 'long' }) : null,
    arc: range ? { days: days.length } : null,
    done: done.length, high: done.filter(t => t.impact === 'high').length, topPole: state.projects.find(p => p.id === topPoleId), topPoleCount: byPole[topPoleId] || 0,
    habitsChecked, prayersOnTime, prayersLogged, wins, unlocked, xp,
    boss: bossStatus(state, now), nextBoss: bossOfWeek(new Date(w.end + 3600000)),
  }
}

const fmtH = m => (m >= 60 ? `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')}` : `${m} min`)

function Big({ children }) {
  return <motion.p initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', damping: 14, delay: 0.25 }} className="text-[min(22vw,140px)] font-semibold leading-none tracking-tight">{children}</motion.p>
}
function Line({ children, delay = 0.6 }) {
  return <motion.p initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay }} className="mt-4 text-lg text-white/80">{children}</motion.p>
}

export default function WeeklyWrapped() {
  const { state, dispatch } = useStore()
  const game = useGame()
  const [open, setOpen] = useState(false)
  const [index, setIndex] = useState(0)
  const [range, setRange] = useState(null)
  const soundsOn = state.settings?.sounds !== false
  const stats = useMemo(() => (open ? weeklyStats(state, game, new Date(), range) : null), [open, state, game, range])

  const show = useCallback(e => { setRange(e?.detail?.arc || null); setIndex(0); setOpen(true); playSound('levelUp', soundsOn) }, [soundsOn])
  const close = useCallback(() => {
    setOpen(false)
    dispatch({ type: 'UPDATE_SETTINGS', payload: { lastWrapped: weekBounds().key } })
  }, [dispatch])

  // Ouverture automatique le dimanche soir, une fois par semaine.
  useEffect(() => {
    const check = () => {
      const now = new Date()
      if (now.getDay() === 0 && now.getHours() >= 18 && state.settings?.lastWrapped !== weekBounds(now).key) show()
    }
    const first = setTimeout(check, 4000)
    const t = setInterval(check, 10 * 60000)
    window.addEventListener('cockpit:open-wrapped', show)
    return () => { clearTimeout(first); clearInterval(t); window.removeEventListener('cockpit:open-wrapped', show) }
  }, [state.settings?.lastWrapped, show])

  const slides = stats ? [
    stats.arc
      ? <><p className="text-sm uppercase tracking-[0.3em] text-white/70">❄️ Ton Winter Arc</p><Big>{stats.arc.days} jours</Big><Line>Tu es allé au bout. Voici ce que tu as construit.</Line></>
      : <><p className="text-sm uppercase tracking-[0.3em] text-white/70">Ton bilan</p><Big>Semaine {stats.weekNumber}</Big><Line>Prêt à voir ce que tu as accompli ?</Line></>,
    <><p className="text-sm uppercase tracking-[0.3em] text-white/70">Temps de focus</p><Big>{fmtH(stats.focusMin)}</Big><Line>{stats.bestDay ? `Ton meilleur jour : ${stats.bestDay}.` : 'Lance le chrono la semaine prochaine pour voir ton meilleur jour.'}</Line></>,
    <><p className="text-sm uppercase tracking-[0.3em] text-white/70">Tâches terminées</p><Big>{stats.done}</Big><Line>dont {stats.high} à fort impact{stats.topPole ? ` · pôle star : ${stats.topPole.emoji} ${stats.topPole.name} (${stats.topPoleCount})` : ''}</Line></>,
    <><p className="text-sm uppercase tracking-[0.3em] text-white/70">Routines</p><Big>{stats.habitsChecked}</Big><Line>cases cochées · 🕌 {stats.prayersOnTime} prière{stats.prayersOnTime > 1 ? 's' : ''} à l'heure sur {stats.prayersLogged} notée{stats.prayersLogged > 1 ? 's' : ''}</Line></>,
    <><p className="text-sm uppercase tracking-[0.3em] text-white/70">Tes victoires</p>
      {stats.wins.length ? (
        <ul className="mt-6 space-y-3 text-left text-xl font-medium">{stats.wins.slice(0, 5).map((w, i) => <motion.li key={i} initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.3 + i * 0.25 }}>🏆 {w}</motion.li>)}</ul>
      ) : <Line delay={0.3}>Note tes victoires en fin de journée : elles s'afficheront ici.</Line>}
      {stats.unlocked.length > 0 && <Line delay={1.6}>Succès débloqués : {stats.unlocked.map(a => a.emoji).join(' ')}</Line>}
    </>,
    stats.arc ? <><p className="text-sm uppercase tracking-[0.3em] text-white/70">Discipline</p><Big>❄️</Big><Line>Succès « Winter Arc terminé » débloqué et bonnet exclusif pour ton avatar.</Line></> : <><p className="text-sm uppercase tracking-[0.3em] text-white/70">Boss de la semaine</p><Big>{stats.boss.emoji}</Big>
      <Line>{stats.boss.defeated ? `${stats.boss.name} : vaincu !` : `${stats.boss.name} : ${stats.boss.value} / ${stats.boss.goal} ${stats.boss.unit}.`}</Line>
      <Line delay={1}>Semaine prochaine : {stats.nextBoss.emoji} {stats.nextBoss.name}</Line></>,
    <><p className="text-sm uppercase tracking-[0.3em] text-white/70">Au total</p><Big>+{stats.xp} XP</Big>
      <Line>Niveau {game.level} · {game.title} · 🔥 {game.streak.current} j · 🪙 {game.coins.balance}</Line>
      <motion.button type="button" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }} onClick={e => { e.stopPropagation(); close() }} className="mt-8 rounded-full bg-white px-6 py-3 text-sm font-semibold text-[var(--brand-900)]">On attaque la semaine suivante 💪</motion.button></>,
  ] : []

  useEffect(() => {
    if (!open) return
    if (index >= slides.length - 1) return
    const t = setTimeout(() => setIndex(i => i + 1), SLIDE_MS)
    return () => clearTimeout(t)
  }, [open, index, slides.length])

  useEffect(() => {
    if (!open) return
    const onKey = e => {
      if (e.key === 'Escape') close()
      if (e.key === 'ArrowRight') setIndex(i => Math.min(slides.length - 1, i + 1))
      if (e.key === 'ArrowLeft') setIndex(i => Math.max(0, i - 1))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, slides.length, close])

  return (
    <AnimatePresence>
      {open && stats && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[150] flex flex-col text-white"
          style={{ background: BACKGROUNDS[index % BACKGROUNDS.length], transition: 'background 0.6s' }}
          role="dialog" aria-modal="true" aria-label="Bilan de la semaine"
          onClick={e => setIndex(i => (e.clientX < window.innerWidth / 3 ? Math.max(0, i - 1) : Math.min(slides.length - 1, i + 1)))}
        >
          <div className="flex gap-1.5 px-6 pt-6">
            {slides.map((_, i) => (
              <div key={i} className="h-1 flex-1 overflow-hidden rounded-full bg-white/25">
                {i < index && <div className="h-full w-full bg-white" />}
                {i === index && <motion.div key={index} className="h-full bg-white" initial={{ width: '0%' }} animate={{ width: '100%' }} transition={{ duration: SLIDE_MS / 1000, ease: 'linear' }} />}
              </div>
            ))}
          </div>
          <button type="button" aria-label="Fermer" onClick={e => { e.stopPropagation(); close() }} className="absolute right-6 top-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/15"><X size={18} /></button>
          <div className="flex flex-1 items-center justify-center px-8 text-center">
            <AnimatePresence mode="wait">
              <motion.div key={index} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -30 }} transition={{ duration: 0.35 }} className="max-w-2xl">
                {slides[index]}
              </motion.div>
            </AnimatePresence>
          </div>
          <p className="pb-6 text-center text-xs text-white/50">Clique à droite pour avancer, à gauche pour revenir · Échap pour fermer</p>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
