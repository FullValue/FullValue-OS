import { Home, Inbox, Calendar, CheckSquare, Timer, BookOpen, GraduationCap, Zap, Sun, Moon, Users, LayoutDashboard, ChevronDown } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { cn } from '@/lib/utils'

const PILOTAGE = [
  { id: 'journee', label: 'Journée', Icon: Home },
  { id: 'inbox', label: 'Inbox', Icon: Inbox, badge: true },
  { id: 'calendrier', label: 'Calendrier', Icon: Calendar },
  { id: 'taches', label: 'Tâches', Icon: CheckSquare },
  { id: 'sessions', label: 'Sessions', Icon: Timer, timer: true },
]

const RESSOURCES = [
  { id: 'hub-ressources', label: 'Hub Ressources', Icon: BookOpen },
  { id: 'formation', label: 'Formation', Icon: GraduationCap },
]

function NavItem({ id, label, Icon, isActive, onClick, badgeCount, timerActive }) {
  return (
    <button
      onClick={() => onClick(id)}
      className={cn(
        'flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm w-full text-left transition-all duration-150 relative focus:outline-none focus:ring-2 focus:ring-violet/40',
        isActive
          ? 'bg-violet/12 text-violet font-medium'
          : 'text-white/40 hover:text-white/75 hover:bg-white/4'
      )}
    >
      <span className="relative flex-shrink-0">
        <Icon size={16} />
        {badgeCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[14px] h-3.5 bg-yellow rounded-full text-[8px] flex items-center justify-center text-black font-bold px-0.5">
            {badgeCount > 9 ? '9+' : badgeCount}
          </span>
        )}
        {timerActive && (
          <span className="absolute -top-1 -right-1 w-2 h-2 bg-green rounded-full animate-pulse" />
        )}
      </span>
      <span className="leading-none">{label}</span>
    </button>
  )
}

export default function Nav({ activePage, setActivePage, timerRunning, theme, onToggleTheme }) {
  const { state } = useStore()
  const inboxCount = state.inbox.length
  const isProjectPage = activePage.startsWith('projet_')

  // Ulycom sub-pages are visible when on an Ulycom-related page
  const ulycomExpanded = activePage === 'projet_p1' || activePage === 'ulycom_clients'

  return (
    <>
      {/* Desktop sidebar */}
      <nav
        className="hidden md:flex flex-col w-56 bg-surface fixed left-0 top-0 bottom-0 z-40 py-5 px-3 overflow-y-auto"
        style={{ borderRight: '1px solid var(--c-border)' }}
      >
        {/* Logo + theme toggle */}
        <div className="px-3 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-violet/20 rounded-lg flex items-center justify-center">
              <Zap size={14} className="text-violet" />
            </div>
            <span className="font-semibold text-white/90 text-sm tracking-tight">Le Cockpit</span>
          </div>
          <button
            onClick={onToggleTheme}
            className="p-1.5 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/8 transition-all"
            title={theme === 'dark' ? 'Mode clair' : 'Mode sombre'}
          >
            {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
          </button>
        </div>

        {/* PILOTAGE */}
        <div className="mb-4">
          <p className="px-3 text-[10px] font-semibold text-white/20 uppercase tracking-widest mb-1.5">Pilotage</p>
          <div className="flex flex-col gap-0.5">
            {PILOTAGE.map(({ id, label, Icon, badge, timer }) => (
              <NavItem
                key={id} id={id} label={label} Icon={Icon}
                isActive={activePage === id}
                onClick={setActivePage}
                badgeCount={badge ? inboxCount : 0}
                timerActive={timer && timerRunning}
              />
            ))}
          </div>
        </div>

        {/* PROJETS */}
        <div className="mb-4">
          <p className="px-3 text-[10px] font-semibold text-white/20 uppercase tracking-widest mb-1.5">Projets</p>
          <div className="flex flex-col gap-0.5">
            {state.projects.map(p => {
              const isActive = activePage === `projet_${p.id}`
              const isUlycom = p.id === 'p1'
              const showSub = isUlycom && ulycomExpanded

              return (
                <div key={p.id}>
                  <button
                    onClick={() => setActivePage(`projet_${p.id}`)}
                    className={cn(
                      'flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm w-full text-left transition-all duration-150 focus:outline-none',
                      isActive || (isUlycom && activePage === 'ulycom_clients')
                        ? 'bg-white/6 text-white/90 font-medium'
                        : 'text-white/40 hover:text-white/70 hover:bg-white/4'
                    )}
                  >
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
                    <span className="leading-none flex-1">{p.emoji} {p.name}</span>
                    <span className="text-[10px] text-white/20">T{p.tier}</span>
                    {isUlycom && (
                      <ChevronDown size={12} className={cn('text-white/20 transition-transform', showSub && 'rotate-180')} />
                    )}
                  </button>

                  {/* Ulycom sub-nav */}
                  {showSub && (
                    <div className="ml-4 mt-0.5 flex flex-col gap-0.5">
                      <button
                        onClick={() => setActivePage('projet_p1')}
                        className={cn(
                          'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs w-full text-left transition-all',
                          activePage === 'projet_p1'
                            ? 'text-white/90 font-medium bg-white/5'
                            : 'text-white/35 hover:text-white/65 hover:bg-white/4'
                        )}
                      >
                        <LayoutDashboard size={12} />
                        Dashboard
                      </button>
                      <button
                        onClick={() => setActivePage('ulycom_clients')}
                        className={cn(
                          'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs w-full text-left transition-all',
                          activePage === 'ulycom_clients'
                            ? 'text-white/90 font-medium bg-white/5'
                            : 'text-white/35 hover:text-white/65 hover:bg-white/4'
                        )}
                      >
                        <Users size={12} />
                        Clients
                        {state.clients.filter(c => c.status !== 'archived').length > 0 && (
                          <span className="ml-auto text-[9px] bg-white/8 text-white/40 px-1 py-0.5 rounded-full">
                            {state.clients.filter(c => c.status !== 'archived').length}
                          </span>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* RESSOURCES */}
        <div className="mb-4">
          <p className="px-3 text-[10px] font-semibold text-white/20 uppercase tracking-widest mb-1.5">Ressources</p>
          <div className="flex flex-col gap-0.5">
            {RESSOURCES.map(({ id, label, Icon }) => (
              <NavItem key={id} id={id} label={label} Icon={Icon} isActive={activePage === id} onClick={setActivePage} badgeCount={0} timerActive={false} />
            ))}
          </div>
        </div>

        {/* Bottom: date */}
        <div className="mt-auto px-3 pt-4" style={{ borderTop: '1px solid var(--c-border-sub)' }}>
          <p className="text-[10px] text-white/20 font-mono">
            {new Date().toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
          </p>
        </div>
      </nav>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex" style={{ background: 'var(--c-surface)', borderTop: '1px solid var(--c-border)' }}>
        {[
          { id: 'journee', label: 'Journée', Icon: Home },
          { id: 'inbox', label: 'Inbox', Icon: Inbox },
          { id: 'taches', label: 'Tâches', Icon: CheckSquare },
          { id: 'sessions', label: 'Sessions', Icon: Timer },
          { id: 'ulycom_clients', label: 'Clients', Icon: Users },
        ].map(({ id, label, Icon }) => {
          const isActive = activePage === id || (id === 'ulycom_clients' && isProjectPage)
          return (
            <button
              key={id}
              onClick={() => setActivePage(id)}
              className={cn('flex-1 flex flex-col items-center gap-1 py-3 transition-colors', isActive ? 'text-violet' : 'text-white/30')}
            >
              <span className="relative">
                <Icon size={20} />
                {id === 'inbox' && inboxCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-yellow rounded-full text-[7px] flex items-center justify-center text-black font-bold">{inboxCount}</span>
                )}
                {id === 'sessions' && timerRunning && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-green rounded-full animate-pulse" />
                )}
              </span>
              <span className="text-[10px] font-medium">{label}</span>
            </button>
          )
        })}
      </nav>
    </>
  )
}
