// Check-ins plein écran : 30 min après chaque prière (« as-tu prié ? ») et à l'heure des
// routines planifiées (sport, lecture…). Une réponse = un log ; on peut reporter ou passer.
import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, Clock, X } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { localDateStr } from '@/lib/backup'
import { pendingPrayers, PRAYERS, PRAYER_XP } from '@/lib/prayers'
import { doneOn, isDue } from '@/lib/habits'
import { playSound } from '@/lib/sound'
import { toast } from '@/lib/toast'

const SNOOZE_KEY = 'cockpit:checkins'

function readSnoozes() {
  try { return JSON.parse(localStorage.getItem(SNOOZE_KEY) || '{}') } catch { return {} }
}
function writeSnoozes(map) {
  try { localStorage.setItem(SNOOZE_KEY, JSON.stringify(map)) } catch { /* ignore */ }
}
const toMin = (hhmm = '00:00') => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + (m || 0) }

function BigButton({ children, onClick, tone = 'primary' }) {
  const styles = {
    primary: { background: '#fff', color: 'var(--brand-900)' },
    ghost: { background: 'rgba(255,255,255,0.12)', color: '#fff' },
  }[tone]
  return (
    <button type="button" onClick={onClick} className="flex h-12 items-center justify-center gap-2 rounded-full px-6 text-sm font-semibold transition-transform active:scale-95" style={styles}>
      {children}
    </button>
  )
}

export default function CheckinOverlay() {
  const { state, dispatch } = useStore()
  const [now, setNow] = useState(() => new Date())
  const [snoozes, setSnoozes] = useState(readSnoozes)
  const shownRef = useRef(new Set())
  const soundsOn = state.settings?.sounds !== false

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000)
    return () => clearInterval(t)
  }, [])

  const today = localDateStr(now)
  const snoozed = key => {
    const v = snoozes[key]
    return v === `skip:${today}` || (typeof v === 'number' && v > now.getTime())
  }

  const prayers = useMemo(() => pendingPrayers(state, now).filter(p => !snoozed(`prayer:${p.id}`)), [state, now, snoozes]) // eslint-disable-line react-hooks/exhaustive-deps
  const habit = useMemo(() => {
    const nowMin = now.getHours() * 60 + now.getMinutes()
    return (state.habits || []).find(h => h.time && !h.archived && isDue(h, now) && !doneOn(state.habitLogs, h.id, today)
      && nowMin >= toMin(h.time) && !snoozed(`habit:${h.id}`))
  }, [state, now, snoozes]) // eslint-disable-line react-hooks/exhaustive-deps

  const current = prayers.length ? { kind: 'prayers', key: `prayers:${prayers.map(p => p.id).join(',')}` } : habit ? { kind: 'habit', key: `habit:${habit.id}` } : null

  // Petit son à l'apparition d'un nouveau check-in.
  useEffect(() => {
    if (current && !shownRef.current.has(current.key)) {
      shownRef.current.add(current.key)
      playSound('bell', soundsOn)
    }
  }, [current?.key]) // eslint-disable-line react-hooks/exhaustive-deps

  function snooze(key, minutes) {
    const next = { ...snoozes, [key]: Date.now() + minutes * 60000 }
    setSnoozes(next)
    writeSnoozes(next)
  }
  function skipToday(key) {
    const next = { ...snoozes, [key]: `skip:${today}` }
    setSnoozes(next)
    writeSnoozes(next)
  }

  function logPrayer(p, status) {
    dispatch({ type: 'LOG_PRAYER', payload: { date: today, prayer: p.id, status } })
    if (PRAYER_XP[status]) toast.success(`${p.label} noté${status === 'late' ? ' (en retard)' : ''}`, { description: `+${PRAYER_XP[status]} XP` })
    // Les 5 prières faites : on coche aussi la routine « prières » si elle existe.
    const log = { ...(state.prayerLogs?.[today] || {}), [p.id]: status }
    if (PRAYERS.every(x => log[x.id] === 'ontime' || log[x.id] === 'late')) {
      const h = (state.habits || []).find(x => /pri[eè]re/i.test(x.name) && !doneOn(state.habitLogs, x.id, today))
      if (h) dispatch({ type: 'TOGGLE_HABIT', payload: { habitId: h.id, date: today } })
    }
  }

  return (
    <AnimatePresence>
      {current && (
        <motion.div
          key={current.key}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[140] flex items-center justify-center p-6 text-white"
          style={{ background: 'var(--hero-dark)' }}
          role="dialog" aria-modal="true" aria-label="Check-in"
        >
          <motion.div initial={{ y: 24, scale: 0.97 }} animate={{ y: 0, scale: 1 }} transition={{ type: 'spring', damping: 22 }} className="w-full max-w-lg text-center">
            {current.kind === 'prayers' ? (
              <>
                <p className="text-5xl">🕌</p>
                <h2 className="mt-4 text-3xl font-semibold tracking-tight">As-tu prié ?</h2>
                <p className="mt-2 text-sm text-white/70">Note-le en un clic : ça nourrit ta série et ton XP.</p>
                <div className="mt-8 space-y-3 text-left">
                  {prayers.map(p => (
                    <div key={p.id} className="flex flex-wrap items-center gap-3 rounded-[22px] bg-white/10 px-5 py-4">
                      <div className="min-w-0 flex-1">
                        <p className="text-lg font-semibold">{p.label}</p>
                        <p className="text-xs text-white/60">{p.time}</p>
                      </div>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => logPrayer(p, 'ontime')} className="flex items-center gap-1 rounded-full bg-white px-4 py-2 text-xs font-semibold text-[var(--brand-900)]"><Check size={13} /> À l'heure</button>
                        <button type="button" onClick={() => logPrayer(p, 'late')} className="rounded-full bg-white/15 px-4 py-2 text-xs font-semibold">En retard</button>
                        <button type="button" onClick={() => logPrayer(p, 'missed')} className="rounded-full bg-white/5 px-3 py-2 text-xs text-white/70">Manquée</button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-6 flex justify-center">
                  <BigButton tone="ghost" onClick={() => prayers.forEach(p => snooze(`prayer:${p.id}`, 20))}><Clock size={15} /> Me redemander dans 20 min</BigButton>
                </div>
              </>
            ) : (
              <>
                <p className="text-6xl">{habit.emoji}</p>
                <p className="mt-5 text-sm uppercase tracking-[0.2em] text-white/60">C'est l'heure · {habit.time}</p>
                <h2 className="mt-2 text-4xl font-semibold tracking-tight">{habit.name}</h2>
                <p className="mt-3 text-sm text-white/70">C'est fait ? Coche-le, ta série continue.</p>
                <div className="mt-8 flex flex-wrap justify-center gap-3">
                  <BigButton onClick={() => { dispatch({ type: 'TOGGLE_HABIT', payload: { habitId: habit.id, date: today } }); toast.success(`${habit.emoji} ${habit.name} : fait`, { description: '+5 XP' }) }}>
                    <Check size={16} /> C'est fait
                  </BigButton>
                  <BigButton tone="ghost" onClick={() => snooze(`habit:${habit.id}`, 30)}><Clock size={15} /> Dans 30 min</BigButton>
                  <BigButton tone="ghost" onClick={() => skipToday(`habit:${habit.id}`)}><X size={15} /> Pas aujourd'hui</BigButton>
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
