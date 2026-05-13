import { useState, useRef, useEffect, useCallback } from 'react'
import { StoreProvider } from '@/store/useStore'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import FloatingNavbar from '@/components/layout/FloatingNavbar'
import RightSidebar from '@/components/layout/RightSidebar'
import CommandModal from '@/components/CommandModal'
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
  const [activePage, setActivePage] = useState('journee')
  const [cmdOpen, setCmdOpen] = useState(false)

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

  // Global ⌘+K
  useEffect(() => {
    function handler(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setCmdOpen(true)
      }
      if (e.key === 'Escape') setCmdOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

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
      return <ProjetPage projectId={projectPageMatch} onNavigate={setActivePage} />
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
      case 'ulycom_clients': return <ClientSpace />
      case 'projets':        return <Projets onNavigate={setActivePage} />
      case 'migrate':        return <MigratePage />
      case 'import':         return <ImportPage />
      default:               return <Journee onStartTask={goToSessionsWithTask} onNavigate={setActivePage} />
    }
  }

  const [sidebarLocked, setSidebarLocked] = useState(
    () => localStorage.getItem('cockpit:sidebar:locked') === 'true'
  )

  function handleToggleSidebarLock() {
    setSidebarLocked(prev => {
      const next = !prev
      localStorage.setItem('cockpit:sidebar:locked', String(next))
      return next
    })
  }

  const [isMobile, setIsMobile] = useState(() => window.matchMedia('(max-width: 639px)').matches)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)')
    const handler = (e) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  return (
    <div
      className="min-h-screen min-h-dvh"
      style={{ background: 'var(--bg-page)' }}
    >
      {/* Floating left navbar */}
      <FloatingNavbar
        activePage={activePage}
        setActivePage={setActivePage}
        timerRunning={timerRunning}
        theme={theme}
        onToggleTheme={toggleTheme}
        sidebarLocked={sidebarLocked}
        onToggleSidebarLock={handleToggleSidebarLock}
      />

      {/* Right sidebar — only on Journée, desktop only */}
      {isJournee && <RightSidebar nowMinutes={nowMinutes} />}

      {/* Main content — shifts right when sidebar is locked open */}
      <main
        className="transition-all duration-200"
        style={{
          marginLeft: isMobile ? 0 : (sidebarLocked ? 268 : 'clamp(80px, 7vw, 100px)'),
          marginRight: isMobile ? 0 : (isJournee ? 'clamp(0px, calc(300px + 2.5rem), 340px)' : 'clamp(0px, 5vw, 40px)'),
          padding: isMobile ? '16px 16px 80px' : '24px 24px 80px',
        }}
      >
        <div className="mx-auto animate-fadeIn" style={{ maxWidth: isMobile ? '100%' : (isJournee ? 760 : 1024) }}>
          {renderPage()}
        </div>
      </main>

      <CommandModal isOpen={cmdOpen} onClose={() => setCmdOpen(false)} />
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AuthGate />
    </AuthProvider>
  )
}
