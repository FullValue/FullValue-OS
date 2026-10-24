import { useState, useRef, useEffect, useCallback, lazy, Suspense } from 'react'
import { StoreProvider } from '@/store/useStore'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import FloatingNavbar, { SIDEBAR_WIDTH, RAIL_WIDTH } from '@/components/layout/FloatingNavbar'
import TopBar from '@/components/layout/TopBar'
import PriorityStrip from '@/components/layout/PriorityStrip'
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext'
import { GmailProvider } from '@/contexts/GmailContext'
import CommandPalette from '@/components/CommandPalette'
import ShortcutsDialog from '@/components/ShortcutsDialog'
import FocusMode from '@/components/ui/FocusMode'
import DailyClosingModal from '@/components/DailyClosingModal'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { useShortcuts } from '@/hooks/useShortcuts'
import { useGameNotifications } from '@/hooks/useGame'
import { useStore } from '@/store/useStore'
import { localDateStr } from '@/lib/backup'
import { pickNextAction } from '@/lib/priorities'
import { toast } from '@/lib/toast'
import { playSound, notify } from '@/lib/sound'
import VoiceCapture from '@/components/VoiceCapture'
import CheckinOverlay from '@/components/CheckinOverlay'
import WeeklyWrapped from '@/components/WeeklyWrapped'
import WinterArcLayer from '@/components/WinterArcLayer'
import { arcInfo } from '@/lib/winterArc'
import AccessCodePage from '@/components/auth/AccessCodePage'
import LoginPage from '@/components/auth/LoginPage'
import SignupPage from '@/components/auth/SignupPage'
import ForgotPasswordPage from '@/components/auth/ForgotPasswordPage'
import CheckEmailPage from '@/components/auth/CheckEmailPage'
import UpdatePasswordPage from '@/components/auth/UpdatePasswordPage'
import { CloudSyncProvider } from '@/contexts/CloudSyncContext'
import { WhatsAppProvider } from '@/contexts/WhatsAppContext'
import Journee from '@/components/views/Journee'
import Projets from '@/components/views/Projets'
import ProjetPage from '@/components/views/ProjetPage'
import Taches from '@/components/views/Taches'
import Sessions from '@/components/views/Sessions'
import Inbox from '@/components/views/Inbox'
import Calendrier from '@/components/views/Calendrier'
import HubRessources from '@/components/views/HubRessources'
import Formation from '@/components/views/Formation'
import ClientSpace from '@/components/views/ClientSpace'
import MigratePage from '@/components/views/MigratePage'
import ImportPage from '@/components/views/ImportPage'
import RevueHebdo from '@/components/views/RevueHebdo'
import Donnees from '@/components/views/Donnees'
import Integrations from '@/components/views/Integrations'
import Messages from '@/components/views/Messages'
import Habitudes from '@/components/views/Habitudes'
import Objectifs from '@/components/views/Objectifs'
import Pipeline from '@/components/views/Pipeline'
import Facturation from '@/components/views/Facturation'
import Trophees from '@/components/views/Trophees'

// three.js est lourd : la page 3D vit dans son propre chunk.
const OpenSpace = lazy(() => import('@/components/views/OpenSpace'))

const TIMER_KEY = 'cockpit_timer'
const POMO_KEY = 'cockpit:pomodoro'
const POMO_DEFAULT = { enabled: false, cycles: 0, breakEndsAt: null, last: null }
const CLOSING_SNOOZE_KEY = 'cockpit:closing-snoozed'
const EMPTY_TIMER = { accumulated: 0, startedAt: null, project: '', task: '' }

function readStored(key) {
  try { return localStorage.getItem(key) } catch { return null }
}

function readTimer() {
  try { return { ...EMPTY_TIMER, ...JSON.parse(readStored(TIMER_KEY) || '{}') } } catch { return EMPTY_TIMER }
}

function writeTimer(timer) {
  try { localStorage.setItem(TIMER_KEY, JSON.stringify(timer)) } catch { /* ignore */ }
}

function timerElapsed(timer) {
  return timer.accumulated + (timer.startedAt ? Math.floor((Date.now() - timer.startedAt) / 1000) : 0)
}

function AuthGate() {
  const { user, signInWithCode, recovering, endRecovery } = useAuth()
  const [authPage, setAuthPage] = useState('login')

  if (recovering) return <UpdatePasswordPage onDone={endRecovery} />

  if (user === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: 'var(--bg-page)' }}>
        <div className="h-8 w-8 animate-spin rounded-full border-2" style={{ borderColor: 'var(--border-medium)', borderTopColor: 'var(--accent)' }} />
      </div>
    )
  }

  if (!user) {
    switch (authPage) {
      case 'signup':      return <SignupPage onNavigate={setAuthPage} />
      case 'forgot':      return <ForgotPasswordPage onNavigate={setAuthPage} />
      case 'check-email': return <CheckEmailPage onNavigate={setAuthPage} />
      case 'local':       return <AccessCodePage onUnlock={signInWithCode} onBack={() => setAuthPage('login')} />
      default:            return <LoginPage onNavigate={setAuthPage} />
    }
  }

  return (
    <StoreProvider>
      <CloudSyncProvider>
        <GmailProvider>
          <WhatsAppProvider>
            <AppInner />
          </WhatsAppProvider>
        </GmailProvider>
      </CloudSyncProvider>
    </StoreProvider>
  )
}

function AppInner() {
  const { state, dispatch } = useStore()
  const [activePage, setActivePage] = useState('journee')
  const [cmdOpen, setCmdOpen] = useState(false)
  const [focusOpen, setFocusOpen] = useState(false)
  const [closingOpen, setClosingOpen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const timerRef = useRef(null)

  const { theme, setThemePreference } = useTheme()
  useGameNotifications()

  // Timer
  // Le chrono survit à un rechargement : son état est rejoué depuis localStorage.
  const [savedTimer] = useState(readTimer)
  const [elapsed, setElapsed] = useState(() => timerElapsed(savedTimer))
  const [timerRunning, setTimerRunning] = useState(!!savedTimer.startedAt)
  const [timerPaused, setTimerPaused] = useState(!savedTimer.startedAt && savedTimer.accumulated > 0)
  const [timerProject, setTimerProject] = useState(savedTimer.project)
  const [timerTask, setTimerTask] = useState(savedTimer.task)
  const intervalRef = useRef(null)
  const elapsedRef = useRef(savedTimer.accumulated)
  const startTimeRef = useRef(savedTimer.startedAt)

  useEffect(() => {
    if (!savedTimer.startedAt) return
    intervalRef.current = setInterval(() => {
      setElapsed(elapsedRef.current + Math.floor((Date.now() - startTimeRef.current) / 1000))
    }, 1000)
  }, [savedTimer])

  useEffect(() => {
    writeTimer({
      accumulated: elapsedRef.current,
      startedAt: timerRunning ? startTimeRef.current : null,
      project: timerProject,
      task: timerTask,
    })
  }, [timerRunning, timerPaused, timerProject, timerTask])

  const closeClosing = useCallback(() => {
    try { localStorage.setItem(CLOSING_SNOOZE_KEY, localDateStr()) } catch { /* ignore */ }
    setClosingOpen(false)
  }, [])

  // Daily closing auto-trigger: at endOfWorkday, if no review for today, open modal once
  useEffect(() => {
    function check() {
      const todayStr = (() => {
        const d = new Date()
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      })()
      const alreadyDone = state.dailyReviews?.some(r => r.date === todayStr)
      if (alreadyDone || readStored(CLOSING_SNOOZE_KEY) === todayStr) return
      const endStr = state.settings?.endOfWorkday || '20:00'
      const [eh, em] = endStr.split(':').map(Number)
      const now = new Date()
      const nowMin = now.getHours() * 60 + now.getMinutes()
      const endMin = eh * 60 + em
      if (nowMin >= endMin) setClosingOpen(true)
    }
    check()
    const t = setInterval(check, 60000)
    return () => clearInterval(t)
  }, [state.dailyReviews, state.settings])

  // Raccourcis clavier globaux : ⌘K, N/C, ?, G+lettre
  useShortcuts({
    togglePalette: () => setCmdOpen(o => !o),
    openPalette: () => setCmdOpen(true),
    navigate: setActivePage,
    openShortcuts: () => setShortcutsOpen(true),
    toggleTimer: () => timerRef.current?.toggle(),
  })

  const startTimer = useCallback((projectId = '', taskId = '') => {
    if (projectId) setTimerProject(projectId)
    if (taskId) setTimerTask(taskId)
    startTimeRef.current = Date.now()
    setTimerRunning(true)
    setTimerPaused(false)
    intervalRef.current = setInterval(() => {
      setElapsed(elapsedRef.current + Math.floor((Date.now() - startTimeRef.current) / 1000))
    }, 1000)
  }, [])

  const pauseTimer = useCallback(() => {
    clearInterval(intervalRef.current)
    elapsedRef.current = elapsed
    setTimerRunning(false)
    setTimerPaused(true)
  }, [elapsed])

  const resumeTimer = useCallback(() => {
    startTimeRef.current = Date.now()
    setTimerRunning(true)
    setTimerPaused(false)
    intervalRef.current = setInterval(() => {
      setElapsed(elapsedRef.current + Math.floor((Date.now() - startTimeRef.current) / 1000))
    }, 1000)
  }, [])

  const stopTimer = useCallback(() => {
    clearInterval(intervalRef.current)
    elapsedRef.current = 0
    setTimerRunning(false)
    setTimerPaused(false)
    setTimerProject('')
    setTimerTask('')
    setElapsed(0)
  }, [])

  useEffect(() => () => clearInterval(intervalRef.current), [])


  // Enregistre la session en cours : arrêter ou changer de tâche ne perd jamais de temps.
  const logCurrentSession = useCallback((extra = {}) => {
    if (elapsed <= 0) return
    const task = state.tasks.find(t => t.id === timerTask)
    dispatch({
      type: 'LOG_SESSION',
      payload: { projectId: timerProject || state.projects[0]?.id, taskId: timerTask || undefined, duration: elapsed, note: task?.title || 'Session de focus', ...extra },
    })
    const m = Math.round(elapsed / 60)
    toast.success(`Session enregistrée — ${m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${Math.max(1, m)} min`}`)
  }, [elapsed, timerTask, timerProject, state.tasks, state.projects, dispatch])

  const finishTimer = useCallback((extra) => {
    logCurrentSession(extra)
    stopTimer()
  }, [logCurrentSession, stopTimer])

  // Lance le chrono sur place, depuis n'importe quel bouton « Focus », sans changer de page.
  const quickStart = useCallback((projectId = '', taskId = '') => {
    if (timerRunning || timerPaused) {
      logCurrentSession()
      clearInterval(intervalRef.current)
      elapsedRef.current = 0
      setElapsed(0)
    }
    setTimerProject(projectId || '')
    setTimerTask(taskId || '')
    startTimer(projectId, taskId)
    const task = state.tasks.find(t => t.id === taskId)
    toast(`Chrono lancé${task ? ` · ${task.title}` : ''}`, { description: 'Il tourne en haut à droite. T pour pause, ⏹ pour enregistrer.' })
  }, [timerRunning, timerPaused, logCurrentSession, startTimer, state.tasks])

  const toggleTimer = useCallback(() => {
    if (timerRunning) return pauseTimer()
    if (timerPaused) return resumeTimer()
    const next = pickNextAction(state.tasks, localDateStr())
    quickStart(next?.projectId, next?.id)
  }, [timerRunning, timerPaused, pauseTimer, resumeTimer, quickStart, state.tasks])

  // Pomodoro : séance de travail, puis pause courte ; pause longue toutes les N séances.
  const pomoCfg = { work: 25, short: 5, long: 15, every: 4, ...(state.settings?.pomodoro || {}) }
  const [pomo, setPomo] = useState(() => {
    try { return { ...POMO_DEFAULT, ...JSON.parse(localStorage.getItem(POMO_KEY) || '{}') } } catch { return POMO_DEFAULT }
  })
  useEffect(() => { try { localStorage.setItem(POMO_KEY, JSON.stringify(pomo)) } catch { /* ignore */ } }, [pomo])
  const pomoRef = useRef(pomo)
  const pomoCfgRef = useRef(pomoCfg)
  useEffect(() => { pomoRef.current = pomo; pomoCfgRef.current = pomoCfg })
  const soundsOn = state.settings?.sounds !== false

  useEffect(() => {
    const id = setInterval(() => {
      const t = timerRef.current
      const p = pomoRef.current
      const cfg = pomoCfgRef.current
      if (!t || !p.enabled) return
      if (t.running && t.elapsed >= cfg.work * 60) {
        const cycles = p.cycles + 1
        const breakMin = cycles % cfg.every === 0 ? cfg.long : cfg.short
        t.finish({ pomodoro: true })
        setPomo(prev => ({ ...prev, cycles, breakEndsAt: Date.now() + breakMin * 60000, last: { project: t.project, task: t.task } }))
        playSound('bell', soundsOn)
        notify('Séance terminée 🍅', `Pause de ${breakMin} min`)
        toast.success(`Séance ${cycles} terminée 🍅`, { description: `Pause de ${breakMin} min. La session est enregistrée.` })
      } else if (p.breakEndsAt && Date.now() >= p.breakEndsAt) {
        setPomo(prev => ({ ...prev, breakEndsAt: null }))
        playSound('bell', soundsOn)
        notify('Fin de la pause', 'On repart pour une séance ?')
        toast('Fin de la pause ☕', { duration: 15000, action: { label: 'Reprendre', onClick: () => timerRef.current?.quickStart(p.last?.project, p.last?.task) } })
      }
    }, 1000)
    return () => clearInterval(id)
  }, [soundsOn])

  const pomodoro = {
    ...pomo,
    workMin: pomoCfg.work,
    toggle: () => {
      if (!pomo.enabled && 'Notification' in window && Notification.permission === 'default') Notification.requestPermission().catch(() => {})
      setPomo(p => ({ ...POMO_DEFAULT, enabled: !p.enabled }))
    },
    skipBreak: () => {
      setPomo(p => ({ ...p, breakEndsAt: null }))
      quickStart(pomo.last?.project, pomo.last?.task)
    },
  }

  const timer = {
    elapsed, running: timerRunning, paused: timerPaused, project: timerProject, task: timerTask,
    start: startTimer, pause: pauseTimer, resume: resumeTimer, stop: stopTimer,
    quickStart, finish: finishTimer, toggle: toggleTimer, openFocus: () => setFocusOpen(true),
    pomodoro,
  }
  useEffect(() => { timerRef.current = timer })

  const projectPageMatch = activePage.startsWith('projet_') ? activePage.replace('projet_', '') : null
  const isJournee = activePage === 'journee'
  const isOpenSpace = activePage === 'open-space'

  function renderPage() {
    if (projectPageMatch) {
      return <ProjetPage projectId={projectPageMatch} onNavigate={setActivePage} onStartTask={quickStart} />
    }
    switch (activePage) {
      case 'journee':    return <Journee onStartTask={quickStart} onNavigate={setActivePage} onOpenPalette={() => setCmdOpen(true)} timer={timer} />
      case 'inbox':      return <Inbox onNavigate={setActivePage} />
      case 'calendrier': return <Calendrier />
      case 'taches':     return <Taches />
      case 'sessions':   return (
        <Sessions
          elapsed={elapsed} timerRunning={timerRunning} timerPaused={timerPaused}
          timerProject={timerProject} timerTask={timerTask}
          setTimerProject={setTimerProject} setTimerTask={setTimerTask}
          onStart={startTimer} onPause={pauseTimer} onResume={resumeTimer} onStop={stopTimer}
        />
      )
      case 'hub-ressources': return <HubRessources />
      case 'formation':      return <Formation />
      case 'ulycom_clients': return <ClientSpace onStartTask={quickStart} />
      case 'projets':        return <Projets onNavigate={setActivePage} />
      case 'migrate':        return <MigratePage />
      case 'import':         return <ImportPage />
      case 'revue':          return <RevueHebdo onNavigate={setActivePage} />
      case 'donnees':        return <Donnees onNavigate={setActivePage} />
      case 'integrations':   return <Integrations />
      case 'messages':       return <Messages onNavigate={setActivePage} />
      case 'habitudes':      return <Habitudes />
      case 'objectifs':      return <Objectifs />
      case 'pipeline':       return <Pipeline onNavigate={setActivePage} />
      case 'facturation':    return <Facturation />
      case 'trophees':       return <Trophees />
      case 'open-space':     return (
        <Suspense fallback={<p className="py-20 text-center text-sm text-[var(--text-tertiary)]">Chargement de l'open space…</p>}>
          <OpenSpace onNavigate={setActivePage} timer={timer} onStartTask={quickStart} />
        </Suspense>
      )
      default:               return <Journee onStartTask={quickStart} onNavigate={setActivePage} onOpenPalette={() => setCmdOpen(true)} timer={timer} />
    }
  }

  const [isMobile, setIsMobile] = useState(() => window.matchMedia('(max-width: 639px)').matches)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)')
    const handler = (e) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  return (
    <TooltipProvider delayDuration={350} skipDelayDuration={200}>
    <div
      className="min-h-screen min-h-dvh"
      style={{ background: 'var(--bg-page)' }}
    >
      {/* Floating left navbar */}
      <FloatingNavbar
        activePage={activePage}
        setActivePage={setActivePage}
        timerRunning={timerRunning}
        compact={isOpenSpace && !isMobile}
      />

      {/* Contenu : barre du haut et bandeau « À traiter » communs, puis la page */}
      {isOpenSpace && !isMobile ? (
        // Open space en plein écran : rail d'icônes à gauche, la scène occupe tout le reste.
        <main className="fixed inset-y-0 right-0 animate-fadeIn" style={{ left: RAIL_WIDTH - 12 }}>
          {renderPage()}
        </main>
      ) : (
        <main
          className="transition-all duration-200"
          style={{
            marginLeft: isMobile ? 0 : SIDEBAR_WIDTH,
            padding: isMobile ? '12px 12px 88px' : '12px 12px 64px 0',
          }}
        >
          <TopBar onOpenPalette={() => setCmdOpen(true)} onNavigate={setActivePage} timer={timer} />
          <PriorityStrip onStartTask={quickStart} onOpenPalette={() => setCmdOpen(true)} onNavigate={setActivePage} />
          <div className="mx-auto animate-fadeIn px-0 sm:px-2" style={{ maxWidth: isMobile || isOpenSpace ? '100%' : (isJournee ? 1440 : 1100) }}>
            {renderPage()}
          </div>
        </main>
      )}

      <CommandPalette
        open={cmdOpen}
        onOpenChange={setCmdOpen}
        onNavigate={setActivePage}
        theme={theme}
        onToggleTheme={() => setThemePreference(theme === 'dark' ? 'light' : 'dark')}
        onOpenFocus={() => setFocusOpen(true)}
        onOpenClosing={() => setClosingOpen(true)}
        onOpenShortcuts={() => setShortcutsOpen(true)}
        onStartTask={quickStart}
      />

      <FocusMode
        isOpen={focusOpen}
        onClose={() => setFocusOpen(false)}
        elapsed={elapsed}
        timerRunning={timerRunning}
        timerPaused={timerPaused}
        timerProject={timerProject}
        timerTask={timerTask}
        onPause={pauseTimer}
        onResume={resumeTimer}
        onStop={stopTimer}
      />

      <DailyClosingModal isOpen={closingOpen} onClose={closeClosing} />

      <ShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />

      <VoiceCapture />
      <CheckinOverlay />
      <WeeklyWrapped />
      <WinterArcLayer />

      <Toaster theme={arcInfo(state).active ? 'dark' : theme} />
    </div>
    </TooltipProvider>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AuthGate />
      </AuthProvider>
    </ThemeProvider>
  )
}
