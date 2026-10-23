import { useState, useRef, useEffect, useCallback, lazy, Suspense } from 'react'
import { Search } from 'lucide-react'
import { StoreProvider } from '@/store/useStore'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import FloatingNavbar, { SIDEBAR_WIDTH } from '@/components/layout/FloatingNavbar'
import RightSidebar from '@/components/layout/RightSidebar'
import { Button } from '@/components/ui/button'
import AppearanceMenu from '@/components/ui/AppearanceMenu'
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext'
import CommandPalette from '@/components/CommandPalette'
import ShortcutsDialog from '@/components/ShortcutsDialog'
import StickyTimer from '@/components/ui/StickyTimer'
import FocusMode from '@/components/ui/FocusMode'
import DailyClosingModal from '@/components/DailyClosingModal'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { SimpleTooltip } from '@/components/ui/tooltip'
import { useShortcuts } from '@/hooks/useShortcuts'
import { useGameNotifications } from '@/hooks/useGame'
import { useStore } from '@/store/useStore'
import { localDateStr } from '@/lib/backup'
import AccessCodePage from '@/components/auth/AccessCodePage'
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

// three.js est lourd : la page 3D vit dans son propre chunk.
const OpenSpace = lazy(() => import('@/components/views/OpenSpace'))

const TIMER_KEY = 'cockpit_timer'
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
  const { user, signInWithCode } = useAuth()

  if (!user) return <AccessCodePage onUnlock={signInWithCode} />

  return (
    <StoreProvider>
      <AppInner />
    </StoreProvider>
  )
}

function AppInner() {
  const { state } = useStore()
  const [activePage, setActivePage] = useState('journee')
  const [cmdOpen, setCmdOpen] = useState(false)
  const [focusOpen, setFocusOpen] = useState(false)
  const [closingOpen, setClosingOpen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)

  const { theme, setThemePreference } = useTheme()
  useGameNotifications()

  // Live clock for right sidebar prayer widget
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000)
    return () => clearInterval(t)
  }, [])
  const nowMinutes = now.getHours() * 60 + now.getMinutes()

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

  const goToSessionsWithTask = useCallback((projectId, taskId) => {
    if (projectId) setTimerProject(projectId)
    if (taskId) setTimerTask(taskId)
    setActivePage('sessions')
  }, [])

  const projectPageMatch = activePage.startsWith('projet_') ? activePage.replace('projet_', '') : null
  const isJournee = activePage === 'journee'
  const isOpenSpace = activePage === 'open-space'

  function renderPage() {
    if (projectPageMatch) {
      return <ProjetPage projectId={projectPageMatch} onNavigate={setActivePage} onStartTask={goToSessionsWithTask} />
    }
    switch (activePage) {
      case 'journee':    return <Journee onStartTask={goToSessionsWithTask} onNavigate={setActivePage} />
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
      case 'ulycom_clients': return <ClientSpace onStartTask={goToSessionsWithTask} />
      case 'projets':        return <Projets onNavigate={setActivePage} />
      case 'migrate':        return <MigratePage />
      case 'import':         return <ImportPage />
      case 'revue':          return <RevueHebdo onNavigate={setActivePage} />
      case 'donnees':        return <Donnees onNavigate={setActivePage} />
      case 'open-space':     return (
        <Suspense fallback={<p className="py-20 text-center text-sm text-[var(--text-tertiary)]">Chargement de l'open space…</p>}>
          <OpenSpace onNavigate={setActivePage} />
        </Suspense>
      )
      default:               return <Journee onStartTask={goToSessionsWithTask} onNavigate={setActivePage} />
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
      {/* Top-right controls — palette + theme toggle */}
      <div className="fixed top-4 right-4 z-40 flex items-center gap-2">
        <SimpleTooltip label="Rechercher & commandes" shortcut="⌘K" side="bottom">
          <Button
            type="button"
            onClick={() => setCmdOpen(true)}
            aria-label="Ouvrir la palette de commandes"
            variant="outline"
            size="sm"
            className="hidden border-[var(--border-soft)] bg-[var(--bg-surface)] text-[var(--text-tertiary)] shadow-[var(--shadow-card)] hover:text-[var(--text-secondary)] hover:shadow-[var(--shadow-card-hover)] sm:flex"
          >
            <Search size={14} />
            <span>Rechercher</span>
            <kbd className="ml-1">⌘K</kbd>
          </Button>
        </SimpleTooltip>
        <AppearanceMenu />
      </div>

      {/* Floating left navbar */}
      <FloatingNavbar
        activePage={activePage}
        setActivePage={setActivePage}
        timerRunning={timerRunning}
      />

      {/* Right sidebar — only on Journée, desktop only */}
      {isJournee && <RightSidebar nowMinutes={nowMinutes} />}

      {/* Main content — shifts right when sidebar is locked open */}
      <main
        className="transition-all duration-200"
        style={{
          marginLeft: isMobile ? 0 : SIDEBAR_WIDTH,
          marginRight: isMobile ? 0 : (isJournee ? 'clamp(0px, calc(300px + 2.5rem), 340px)' : 'clamp(0px, 5vw, 40px)'),
          padding: isMobile ? '64px 16px 80px' : '24px 32px 80px',
        }}
      >
        <div className="mx-auto animate-fadeIn" style={{ maxWidth: isMobile || isOpenSpace ? '100%' : (isJournee ? 760 : 1024) }}>
          {renderPage()}
        </div>
      </main>

      <CommandPalette
        open={cmdOpen}
        onOpenChange={setCmdOpen}
        onNavigate={setActivePage}
        theme={theme}
        onToggleTheme={() => setThemePreference(theme === 'dark' ? 'light' : 'dark')}
        onOpenFocus={() => setFocusOpen(true)}
        onOpenClosing={() => setClosingOpen(true)}
        onOpenShortcuts={() => setShortcutsOpen(true)}
        onStartTask={goToSessionsWithTask}
      />

      <StickyTimer
        elapsed={elapsed}
        timerRunning={timerRunning}
        timerPaused={timerPaused}
        timerProject={timerProject}
        timerTask={timerTask}
        onPause={pauseTimer}
        onResume={resumeTimer}
        onStop={stopTimer}
        onOpenFocus={() => setFocusOpen(true)}
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

      <Toaster theme={theme} />
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
