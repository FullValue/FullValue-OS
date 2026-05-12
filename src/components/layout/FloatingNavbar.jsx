import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Home, Inbox, Calendar, CheckSquare, Timer,
  BookOpen, GraduationCap, Zap, Sun, Moon,
  Users, LayoutDashboard, ChevronDown, LogOut, Database, FileJson,
  PanelLeftClose, PanelLeftOpen,
} from 'lucide-react'
import { useStore } from '@/store/useStore'
import { useAuth } from '@/contexts/AuthContext'

const PILOTAGE = [
  { id: 'journee',    label: 'Journée',     Icon: Home },
  { id: 'inbox',      label: 'Inbox',       Icon: Inbox,       badge: true },
  { id: 'calendrier', label: 'Calendrier',  Icon: Calendar },
  { id: 'taches',     label: 'Tâches',      Icon: CheckSquare },
  { id: 'sessions',   label: 'Sessions',    Icon: Timer,       timer: true },
  { id: 'import',     label: 'Import bulk', Icon: FileJson },
]

const RESSOURCES = [
  { id: 'hub-ressources', label: 'Hub Ressources', Icon: BookOpen },
  { id: 'formation',      label: 'Formation',       Icon: GraduationCap },
]

function NavLabel({ children, expanded }) {
  return (
    <AnimatePresence>
      {expanded && (
        <motion.span
          initial={{ opacity: 0, x: -6 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -6 }}
          transition={{ duration: 0.13 }}
          className="text-sm leading-none whitespace-nowrap overflow-hidden"
        >
          {children}
        </motion.span>
      )}
    </AnimatePresence>
  )
}

function NavItem({ id, label, Icon, isActive, onClick, badgeCount = 0, timerActive = false, expanded }) {
  return (
    <button
      onClick={() => onClick(id)}
      title={!expanded ? label : undefined}
      className="flex items-center gap-3 w-full transition-all duration-150 focus:outline-none group"
      style={{
        padding: expanded ? '7px 12px' : '7px 0',
        justifyContent: expanded ? 'flex-start' : 'center',
        borderRadius: 12,
        background: isActive ? 'var(--active-bg)' : 'transparent',
      }}
    >
      <span
        className="relative flex-shrink-0 flex items-center justify-center rounded-full transition-all"
        style={{
          width: 32,
          height: 32,
          background: isActive ? 'transparent' : 'transparent',
          color: isActive ? 'var(--active-text)' : 'var(--text-tertiary)',
        }}
      >
        <Icon size={17} strokeWidth={isActive ? 2 : 1.6} />
        {badgeCount > 0 && (
          <span
            className="absolute -top-1 -right-1 min-w-[14px] h-3.5 rounded-full text-[8px] flex items-center justify-center font-bold px-0.5"
            style={{ background: 'var(--yellow-solid)', color: '#1A1918' }}
          >
            {badgeCount > 9 ? '9+' : badgeCount}
          </span>
        )}
        {timerActive && (
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--green-deep)' }} />
        )}
      </span>
      <span style={{ color: isActive ? 'var(--active-text)' : 'var(--text-secondary)', fontWeight: isActive ? 500 : 400 }}>
        <NavLabel expanded={expanded}>{label}</NavLabel>
      </span>
    </button>
  )
}

function SectionDivider({ label, expanded }) {
  return (
    <div className="flex items-center gap-2 px-1 my-1" style={{ height: 20 }}>
      <div className="flex-1 h-px" style={{ background: 'var(--border-soft)' }} />
      <AnimatePresence>
        {expanded && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
            className="text-[9px] uppercase tracking-widest font-semibold whitespace-nowrap"
            style={{ color: 'var(--text-tertiary)' }}
          >
            {label}
          </motion.span>
        )}
      </AnimatePresence>
      <div className="flex-1 h-px" style={{ background: 'var(--border-soft)' }} />
    </div>
  )
}

// ─── Mobile bottom bar ────────────────────────────────────────────────────────

function MobileNav({ activePage, setActivePage, timerRunning, inboxCount }) {
  const MOBILE_ITEMS = [
    { id: 'journee',    label: 'Journée',  Icon: Home },
    { id: 'inbox',      label: 'Inbox',    Icon: Inbox, badge: true },
    { id: 'taches',     label: 'Tâches',   Icon: CheckSquare },
    { id: 'sessions',   label: 'Sessions', Icon: Timer, timer: true },
    { id: 'calendrier', label: 'Agenda',   Icon: Calendar },
  ]

  return (
    <nav
      className="sm:hidden fixed bottom-0 left-0 right-0 z-50 flex safe-bottom"
      style={{
        background: 'var(--bg-surface)',
        borderTop: '1px solid var(--border-soft)',
        boxShadow: '0 -4px 20px rgba(0,0,0,0.08)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {MOBILE_ITEMS.map(({ id, label, Icon, badge, timer }) => {
        const isActive = activePage === id
        return (
          <button
            key={id}
            onClick={() => setActivePage(id)}
            className="flex-1 flex flex-col items-center gap-1 py-2.5 transition-colors relative"
            style={{ color: isActive ? 'var(--violet-deep)' : 'var(--text-tertiary)' }}
          >
            <span className="relative">
              <Icon size={20} strokeWidth={isActive ? 2 : 1.5} />
              {badge && inboxCount > 0 && (
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full text-[8px] flex items-center justify-center font-bold" style={{ background: 'var(--yellow-solid)', color: '#1A1918' }}>
                  {inboxCount > 9 ? '9+' : inboxCount}
                </span>
              )}
              {timer && timerRunning && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--green-deep)' }} />
              )}
            </span>
            <span className="text-[10px] font-medium">{label}</span>
          </button>
        )
      })}
    </nav>
  )
}

// ─── Main floating navbar ─────────────────────────────────────────────────────

export default function FloatingNavbar({ activePage, setActivePage, timerRunning, theme, onToggleTheme, sidebarLocked = false, onToggleSidebarLock }) {
  const { state } = useStore()
  const { user, signOut } = useAuth()
  const [hovered, setHovered] = useState(false)
  const expanded = sidebarLocked || hovered
  const inboxCount = state.inbox.length

  const userInitials = (user?.user_metadata?.full_name || user?.email || '?')
    .split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  const ulycomExpanded = activePage === 'projet_p1' || activePage === 'ulycom_clients'

  return (
    <>
      {/* Desktop floating pill */}
      <motion.aside
        className="hidden sm:flex flex-col fixed z-50"
        style={{
          left: 20,
          top: '50%',
          y: '-50%',
          background: 'var(--bg-surface)',
          border: '0.5px solid var(--border-soft)',
          boxShadow: 'var(--shadow-float)',
          borderRadius: expanded ? 24 : 9999,
          padding: '12px 8px',
          overflow: 'hidden',
          gap: 2,
        }}
        animate={{ width: expanded ? 220 : 56 }}
        transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
        onMouseEnter={() => !sidebarLocked && setHovered(true)}
        onMouseLeave={() => !sidebarLocked && setHovered(false)}
      >
        {/* Logo row */}
        <div
          className="flex items-center gap-3 mb-2"
          style={{ padding: expanded ? '4px 8px 8px' : '4px 0 8px', justifyContent: expanded ? 'flex-start' : 'center', borderBottom: '1px solid var(--border-soft)' }}
        >
          <div
            className="flex-shrink-0 flex items-center justify-center rounded-xl"
            style={{ width: 32, height: 32, background: 'var(--violet-bg)' }}
          >
            <Zap size={16} style={{ color: 'var(--violet-deep)' }} strokeWidth={2} />
          </div>
          <NavLabel expanded={expanded}>
            <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>Le Cockpit</span>
          </NavLabel>
        </div>

        {/* PILOTAGE */}
        <SectionDivider label="Pilotage" expanded={expanded} />
        {PILOTAGE.map(({ id, label, Icon, badge, timer }) => (
          <NavItem
            key={id}
            id={id}
            label={label}
            Icon={Icon}
            isActive={activePage === id}
            onClick={setActivePage}
            badgeCount={badge ? inboxCount : 0}
            timerActive={timer && timerRunning}
            expanded={expanded}
          />
        ))}

        {/* PROJETS */}
        <SectionDivider label="Projets" expanded={expanded} />
        {state.projects.map(p => {
          const isActive = activePage === `projet_${p.id}`
          const isUlycom = p.id === 'p1'
          const showSub = isUlycom && ulycomExpanded && expanded

          return (
            <div key={p.id}>
              <button
                onClick={() => setActivePage(`projet_${p.id}`)}
                title={!expanded ? `${p.emoji} ${p.name}` : undefined}
                className="flex items-center gap-3 w-full transition-all duration-150 focus:outline-none"
                style={{
                  padding: expanded ? '7px 12px' : '7px 0',
                  justifyContent: expanded ? 'flex-start' : 'center',
                  borderRadius: 12,
                  background: (isActive || (isUlycom && activePage === 'ulycom_clients')) ? 'var(--active-bg)' : 'transparent',
                }}
              >
                <span
                  className="flex-shrink-0 flex items-center justify-center"
                  style={{ width: 32, height: 32 }}
                >
                  <span
                    className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{
                      background: p.color + '22',
                      color: p.color,
                      border: `1.5px solid ${p.color}44`,
                    }}
                  >
                    {p.emoji}
                  </span>
                </span>
                <AnimatePresence>
                  {expanded && (
                    <motion.span
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -6 }}
                      transition={{ duration: 0.13 }}
                      className="flex items-center gap-1 flex-1 min-w-0"
                    >
                      <span
                        className="text-sm truncate"
                        style={{
                          color: (isActive || (isUlycom && activePage === 'ulycom_clients')) ? 'var(--active-text)' : 'var(--text-secondary)',
                          fontWeight: isActive ? 500 : 400,
                        }}
                      >
                        {p.name}
                      </span>
                      <span className="text-[9px] ml-auto" style={{ color: 'var(--text-tertiary)' }}>T{p.tier}</span>
                      {isUlycom && (
                        <ChevronDown size={11} style={{ color: 'var(--text-tertiary)', flexShrink: 0, transform: ulycomExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                      )}
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>

              {/* Ulycom sub-nav */}
              {showSub && (
                <div className="ml-10 flex flex-col gap-0.5 mt-0.5">
                  {[
                    { id: 'projet_p1', label: 'Dashboard', Icon: LayoutDashboard },
                    { id: 'ulycom_clients', label: 'Clients', Icon: Users },
                  ].map(sub => (
                    <button
                      key={sub.id}
                      onClick={() => setActivePage(sub.id)}
                      className="flex items-center gap-2 text-xs transition-colors"
                      style={{
                        padding: '5px 10px',
                        borderRadius: 8,
                        color: activePage === sub.id ? 'var(--violet-deep)' : 'var(--text-tertiary)',
                        background: activePage === sub.id ? 'var(--violet-bg)' : 'transparent',
                        fontWeight: activePage === sub.id ? 500 : 400,
                      }}
                    >
                      <sub.Icon size={11} /> {sub.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )
        })}

        {/* RESSOURCES */}
        <SectionDivider label="Ressources" expanded={expanded} />
        {RESSOURCES.map(({ id, label, Icon }) => (
          <NavItem
            key={id}
            id={id}
            label={label}
            Icon={Icon}
            isActive={activePage === id}
            onClick={setActivePage}
            expanded={expanded}
          />
        ))}

        {/* Theme toggle + user menu */}
        <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border-soft)' }}>
          {/* Sidebar lock toggle */}
          <button
            onClick={onToggleSidebarLock}
            title={sidebarLocked ? 'Réduire la sidebar' : 'Épingler la sidebar ouverte'}
            className="flex items-center gap-3 w-full transition-all duration-150 focus:outline-none"
            style={{
              padding: expanded ? '7px 12px' : '7px 0',
              justifyContent: expanded ? 'flex-start' : 'center',
              borderRadius: 12,
            }}
          >
            <span className="flex-shrink-0 flex items-center justify-center" style={{ width: 32, height: 32, color: 'var(--text-tertiary)' }}>
              {sidebarLocked
                ? <PanelLeftClose size={17} strokeWidth={1.6} />
                : <PanelLeftOpen size={17} strokeWidth={1.6} />}
            </span>
            <NavLabel expanded={expanded}>
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                {sidebarLocked ? 'Réduire' : 'Épingler'}
              </span>
            </NavLabel>
          </button>

          <button
            onClick={onToggleTheme}
            title={theme === 'dark' ? 'Mode clair' : 'Mode sombre'}
            className="flex items-center gap-3 w-full transition-all duration-150 focus:outline-none"
            style={{
              padding: expanded ? '7px 12px' : '7px 0',
              justifyContent: expanded ? 'flex-start' : 'center',
              borderRadius: 12,
            }}
          >
            <span className="flex-shrink-0 flex items-center justify-center" style={{ width: 32, height: 32, color: 'var(--text-tertiary)' }}>
              {theme === 'dark' ? <Sun size={17} strokeWidth={1.6} /> : <Moon size={17} strokeWidth={1.6} />}
            </span>
            <NavLabel expanded={expanded}>
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                {theme === 'dark' ? 'Mode clair' : 'Mode sombre'}
              </span>
            </NavLabel>
          </button>

          {/* Migrate */}
          <button
            onClick={() => setActivePage('migrate')}
            title="Migration Supabase"
            className="flex items-center gap-3 w-full transition-all duration-150 focus:outline-none"
            style={{
              padding: expanded ? '7px 12px' : '7px 0',
              justifyContent: expanded ? 'flex-start' : 'center',
              borderRadius: 12,
              background: activePage === 'migrate' ? 'var(--active-bg)' : 'transparent',
            }}
          >
            <span className="flex-shrink-0 flex items-center justify-center" style={{ width: 32, height: 32, color: 'var(--text-tertiary)' }}>
              <Database size={15} strokeWidth={1.6} />
            </span>
            <NavLabel expanded={expanded}>
              <span className="text-sm" style={{ color: activePage === 'migrate' ? 'var(--active-text)' : 'var(--text-secondary)' }}>Migration</span>
            </NavLabel>
          </button>

          {/* User + signout */}
          <div
            className="flex items-center gap-3 w-full mt-1"
            style={{
              padding: expanded ? '7px 12px' : '7px 0',
              justifyContent: expanded ? 'flex-start' : 'center',
            }}
          >
            <span
              className="flex-shrink-0 flex items-center justify-center rounded-full text-xs font-bold"
              style={{ width: 32, height: 32, background: 'var(--violet-bg)', color: 'var(--violet-deep)' }}
            >
              {userInitials}
            </span>
            <AnimatePresence>
              {expanded && (
                <motion.div
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -6 }}
                  transition={{ duration: 0.13 }}
                  className="flex items-center gap-2 flex-1 min-w-0"
                >
                  <span className="text-xs truncate flex-1" style={{ color: 'var(--text-tertiary)' }}>
                    {user?.email}
                  </span>
                  <button onClick={signOut} title="Se déconnecter">
                    <LogOut size={13} style={{ color: 'var(--text-tertiary)' }} />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.aside>

      {/* Mobile bottom nav */}
      <MobileNav
        activePage={activePage}
        setActivePage={setActivePage}
        timerRunning={timerRunning}
        inboxCount={inboxCount}
      />
    </>
  )
}
