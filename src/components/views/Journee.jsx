import { useState, useEffect } from 'react'
import { AlertTriangle, ChevronRight, ClipboardCheck, Plus, Mic } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { PrayerWidget } from '@/components/layout/RightSidebar'
import GameCard from '@/components/widgets/GameCard'
import HabitsCard from '@/components/widgets/HabitsCard'
import BossCard from '@/components/widgets/BossCard'
import WinterArcBanner from '@/components/widgets/WinterArcBanner'
import NextActionCard from '@/components/dashboard/NextActionCard'
import PrioritiesCard from '@/components/dashboard/PrioritiesCard'
import {
  StatCards, FocusChart, RemindersCard, PolesCard, ClientsCard, ProgressGauge, TimeTrackerCard, DashboardHeaderDate,
} from '@/components/dashboard/DashboardCards'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

// ── Helpers ──────────────────────────────────────────────────────────────────

function getWeekNumber(d) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const dayNum = date.getUTCDay() || 7
  date.setUTCDate(date.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  return Math.ceil((((date - yearStart) / 86400000) + 1) / 7)
}

function hhmmToMin(s) {
  if (!s || typeof s !== 'string') return 0
  const [h, m] = s.split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

function getNextPrayer(nowMin, prayerTimes) {
  const blocks = [
    { label: 'Fajr',    startMin: hhmmToMin(prayerTimes?.fajr    || '05:30') },
    { label: 'Dhuhr',   startMin: hhmmToMin(prayerTimes?.dhuhr   || '13:15') },
    { label: 'Asr',     startMin: hhmmToMin(prayerTimes?.asr     || '17:00') },
    { label: 'Maghrib', startMin: hhmmToMin(prayerTimes?.maghrib || '20:30') },
    { label: 'Isha',    startMin: hhmmToMin(prayerTimes?.isha    || '21:30') },
  ]
  const upcoming = blocks.filter(p => p.startMin > nowMin)
  return upcoming[0] || { label: 'Qiyâm', startMin: 3 * 60 + 30 }
}

function formatTimeUntil(diff) {
  if (diff <= 0) return '0m'
  const h = Math.floor(diff / 60)
  const m = diff % 60
  if (h > 0 && m > 0) return `${h}h${m}m`
  if (h > 0) return `${h}h`
  return `${m}m`
}

function getWeekStart() {
  const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - d.getDay()); return d
}

// ── Tableau de bord ──────────────────────────────────────────────────────────

export default function Journee({ onStartTask, onNavigate, onOpenPalette, timer }) {
  const { state, dispatch } = useStore()
  const [now, setNow] = useState(new Date())
  const [captureText, setCaptureText] = useState('')
  const [captured, setCaptured] = useState(false)

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000)
    return () => clearInterval(t)
  }, [])

  const nowMinutes = now.getHours() * 60 + now.getMinutes()
  const weekNum = getWeekNumber(now)

  function getGreeting() {
    const h = now.getHours()
    if (h >= 3 && h < 6) return 'Qiyâm 🌙'
    if (h >= 6 && h < 12) return 'Bonjour ☀️'
    if (h >= 12 && h < 18) return 'Bon après-midi 🌤'
    if (h >= 18 && h < 21) return 'Bonne soirée 🌇'
    return 'Bonne nuit 🌙'
  }

  const prayer = getNextPrayer(nowMinutes, state.settings?.prayerTimes)
  const nextPrayer = prayer ? { ...prayer, until: formatTimeUntil((prayer.startMin - nowMinutes + 1440) % 1440) } : null

  // Alerte de dérive : trop de temps sur les pôles T3/T4 cette semaine
  const weekStart = getWeekStart()
  const weekSessions = state.sessions.filter(s => new Date(s.date) >= weekStart)
  const totalWeekSec = weekSessions.reduce((s, x) => s + x.duration, 0)
  const tier34Ids = new Set(state.projects.filter(p => p.tier >= 3).map(p => p.id))
  const tier34Sec = weekSessions.filter(s => tier34Ids.has(s.projectId)).reduce((s, x) => s + x.duration, 0)
  const driftPct = totalWeekSec > 0 ? Math.round((tier34Sec / totalWeekSec) * 100) : 0

  function handleCapture(e) {
    if (e.key === 'Enter' && captureText.trim()) {
      dispatch({ type: 'ADD_INBOX', payload: { text: captureText.trim(), type: 'task' } })
      setCaptureText('')
      setCaptured(true)
      setTimeout(() => setCaptured(false), 2000)
    }
  }

  const weekend = now.getDay() === 0 || now.getDay() === 6 || (now.getDay() === 5 && now.getHours() >= 14)

  return (
    <div className="space-y-5 pb-8">
      {/* En-tête */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[34px] font-semibold leading-tight tracking-tight text-[var(--text-primary)]">{getGreeting()}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[var(--text-tertiary)]">
            <DashboardHeaderDate />
            <span>· Semaine {weekNum}</span>
            {nextPrayer && <span className="text-[var(--pink-deep)]">· {nextPrayer.label} dans {nextPrayer.until}</span>}
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="lg" onClick={onOpenPalette}><Plus size={16} /> Nouvelle tâche</Button>
          <Button size="lg" variant="outline" onClick={() => onNavigate('revue')}>Revue hebdo</Button>
        </div>
      </div>

      <WinterArcBanner />

      {/* Capture rapide : vider sa tête sans quitter la page */}
      <div className="flex items-center gap-3 rounded-full bg-[var(--bg-card)] px-5 py-2.5 shadow-[var(--shadow-card)]">
        <Input
          value={captureText}
          onChange={e => setCaptureText(e.target.value)}
          onKeyDown={handleCapture}
          placeholder="Capture rapide — idée, tâche, à ne pas oublier… (Entrée)"
          className="h-auto flex-1 border-transparent bg-transparent px-0 shadow-none focus:border-transparent focus:bg-transparent focus:ring-0"
        />
        {captured
          ? <span className="shrink-0 text-xs font-medium text-[var(--green-deep)]">Capturé ✓</span>
          : <span className="shrink-0 text-[11px] text-[var(--text-tertiary)]">→ Inbox</span>}
        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event('cockpit:voice-toggle'))}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--bg-card-soft)] text-[var(--text-secondary)] hover:text-[var(--accent)]"
          title="Dictée vocale (V)" aria-label="Dictée vocale"
        ><Mic size={15} /></button>
      </div>

      {driftPct > 30 && (
        <div className="flex items-center gap-3 rounded-2xl px-4 py-3" style={{ background: 'var(--yellow-bg)' }}>
          <AlertTriangle size={15} className="shrink-0 text-[var(--yellow-deep)]" />
          <p className="flex-1 text-sm text-[var(--yellow-deep)]">
            Tu as passé <strong>{driftPct}%</strong> de ton temps sur T3/T4 cette semaine. Recentre-toi sur T1/T2.
          </p>
        </div>
      )}

      <NextActionCard tasks={state.tasks} projects={state.projects} dispatch={dispatch} onStartTask={onStartTask} />

      <StatCards state={state} onNavigate={onNavigate} />

      <div className="grid gap-5 lg:grid-cols-12">
        <div className="lg:col-span-5"><FocusChart state={state} /></div>
        <div className="lg:col-span-3"><RemindersCard state={state} nextPrayer={nextPrayer} onNavigate={onNavigate} /></div>
        <div className="lg:col-span-4"><PolesCard state={state} onNavigate={onNavigate} /></div>
        <div className="lg:col-span-5"><ClientsCard state={state} onNavigate={onNavigate} /></div>
        <div className="lg:col-span-3"><ProgressGauge state={state} /></div>
        <div className="lg:col-span-4"><TimeTrackerCard timer={timer} state={state} /></div>
      </div>

      {weekend && (
        <button
          type="button"
          onClick={() => onNavigate('revue')}
          className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition-colors hover:bg-[rgba(var(--ink),0.04)]"
          style={{ border: '1px dashed var(--border-medium)' }}
        >
          <ClipboardCheck size={15} className="shrink-0 text-[var(--accent)]" />
          <span className="flex-1 text-sm text-[var(--text-secondary)]">Fin de semaine : 10 minutes de revue hebdo pour trier ce qui traîne et préparer lundi.</span>
          <ChevronRight size={15} className="text-[var(--text-tertiary)]" />
        </button>
      )}

      <div className="grid gap-5 lg:grid-cols-12">
        <div className="lg:col-span-7"><GameCard /></div>
        <div className="lg:col-span-5"><BossCard /></div>
      </div>

      <div className="grid gap-5 lg:grid-cols-12">
        <div className="lg:col-span-5"><HabitsCard onNavigate={onNavigate} /></div>
        <div className="lg:col-span-7"><PrayerWidget nowMinutes={nowMinutes} /></div>
      </div>

      <PrioritiesCard tasks={state.tasks} projects={state.projects} dispatch={dispatch} onStartTask={onStartTask} />
    </div>
  )
}
