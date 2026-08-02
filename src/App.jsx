import { useState, useRef, useEffect, useCallback } from 'react'
import { Sun, Moon, Search } from 'lucide-react'
import { StoreProvider } from '@/store/useStore'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import FloatingNavbar, { SIDEBAR_WIDTH } from '@/components/layout/FloatingNavbar'
import RightSidebar from '@/components/layout/RightSidebar'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import CommandPalette from '@/components/CommandPalette'
import ShortcutsDialog from '@/components/ShortcutsDialog'
import StickyTimer from '@/components/ui/StickyTimer'
import FocusMode from '@/components/ui/FocusMode'
import DailyClosingModal from '@/components/DailyClosingModal'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { SimpleTooltip } from '@/components/ui/tooltip'
import { useShortcuts } from '@/hooks/useShortcuts'
import { useStore } from '@/store/useStore'
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
import LoginPage from '@/components/auth/LoginPage'
import SignupPage from '@/components/auth/SignupPage'
import ForgotPasswordPage from '@/components/auth/ForgotPasswordPage'
import CheckEmailPage from '@/components/auth/CheckEmailPage'

function AuthGate() {
  const [authPage, setAuthPage] = useState('login')
  const { user } = useAuth()

  if (user === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-page)' }}>
        <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: 'var(--border-medium)', borderTopColor: 'var(--violet-deep)' }} />
      </div>
    )
  }

  if (!user) {
    switch (authPage) {
      case 'signup':     return <SignupPage onNavigate={setAuthPage} />
      case 'forgot':     return <ForgotPasswordPage onNavigate={setAuthPage} />
      case 'check-email': return <CheckEmailPage onNavigate={setAuthPage} />
      default:           return <LoginPage onNavigate={setAuthPage} />
    }
  }

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

  // Theme — light mode is the new default
  const [theme, setTheme] = useState(() => localStorage.getItem('cockpit_theme') || 'light')
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('cockpit_theme', theme)
  }, [theme])
  const toggleTheme = useCallback(() => setTheme(t => t === 'dark' ? 'light' : 'dark'), [])

  // Live clock for right sidebar prayer widget
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000)
    return () => clearInterval(t)
  }, [])
  const nowMinutes = now.getHours() * 60 + now.getMinutes()

  // Timer
  const [elapsed, setElapsed] = useState(0)
  const [timerRunning, setTimerRunning] = useState(false)
  const [timerPaused, setTimerPaused] = useState(false)
  const [timerProject, setTimerProject] = useState('')
  const [timerTask, setTimerTask] = useState('')
  const intervalRef = useRef(null)
  const elapsedRef = useRef(0)
  const startTimeRef = useRef(null)

  // Daily closing auto-trigger: at endOfWorkday, if no review for today, open modal once
  useEffect(() => {
    function check() {
      const todayStr = (() => {
        const d = new Date()
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      })()
      const alreadyDone = state.dailyReviews?.some(r => r.date === todayStr)
      if (alreadyDone) return
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
        <SimpleTooltip label={theme === 'dark' ? 'Passer en mode clair' : 'Passer en mode sombre'}>
          <div className="flex h-9 items-center gap-2 rounded-xl border border-[var(--border-soft)] bg-[var(--bg-surface)] px-2.5 shadow-[var(--shadow-card)]">
            <Moon size={13} className="text-[var(--text-tertiary)]" />
            <Switch
              id="cockpit-theme-toggle"
            checked={theme === 'dark'}
              onCheckedChange={toggleTheme}
              aria-label={theme === 'dark' ? 'Passer en mode clair' : 'Passer en mode sombre'}
            />
            <Sun size={13} className="text-[var(--yellow-deep)]" />
          </div>
        </SimpleTooltip>
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
          padding: isMobile ? '16px 16px 80px' : '24px 32px 80px',
        }}
      >
        <div className="mx-auto animate-fadeIn" style={{ maxWidth: isMobile ? '100%' : (isJournee ? 760 : 1024) }}>
          {renderPage()}
        </div>
      </main>

      <CommandPalette
        open={cmdOpen}
        onOpenChange={setCmdOpen}
        onNavigate={setActivePage}
        theme={theme}
        onToggleTheme={toggleTheme}
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

      <DailyClosingModal isOpen={closingOpen} onClose={() => setClosingOpen(false)} />

      <ShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />

      <Toaster theme={theme} />
    </div>
    </TooltipProvider>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AuthGate />
    </AuthProvider>
  )
}
