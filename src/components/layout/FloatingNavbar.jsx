import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Home, Inbox, Calendar, CheckSquare, Timer,
  BookOpen, GraduationCap,
  Users, LayoutDashboard, ChevronDown, LogOut, Database, FileJson,
  PanelLeftClose, PanelLeftOpen, Pencil, Trash2, Check, X, Plus,
} from 'lucide-react'
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
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

const PROJECT_COLORS = ['#A8E6BD', '#8B7CFF', '#FFD66B', '#FFB088', '#A8D4F0', '#FFC1E0', '#98E2C6', '#FF9898']

function SortableProjectItem({ id, children }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
      {...attributes}
      {...listeners}
    >
      {children}
    </div>
  )
}

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
        style={{ width: 32, height: 32, color: isActive ? 'var(--active-text)' : 'var(--text-tertiary)' }}
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

export default function FloatingNavbar({ activePage, setActivePage, timerRunning, sidebarLocked = false, onToggleSidebarLock }) {
  const { state, dispatch } = useStore()
  const { user, signOut } = useAuth()
  const [hovered, setHovered] = useState(false)
  const expanded = sidebarLocked || hovered
  const inboxCount = state.inbox.length

  // Project CRUD state
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  function handleProjectDragEnd({ active, over }) {
    if (!over || active.id === over.id) return
    const oldIdx = state.projects.findIndex(p => p.id === active.id)
    const newIdx = state.projects.findIndex(p => p.id === over.id)
    if (oldIdx < 0 || newIdx < 0) return
    dispatch({ type: 'REORDER_PROJECTS', payload: arrayMove(state.projects, oldIdx, newIdx) })
  }

  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [editEmoji, setEditEmoji] = useState('')
  const [addingProject, setAddingProject] = useState(false)
  const [newName, setNewName] = useState('')
  const [newEmoji, setNewEmoji] = useState('📁')

  function startEdit(p) {
    setEditingId(p.id)
    setEditName(p.name)
    setEditEmoji(p.emoji)
  }

  function saveEdit(id) {
    if (!editName.trim()) return
    dispatch({ type: 'UPDATE_PROJECT', payload: { id, name: editName.trim(), emoji: editEmoji.trim() || '📁' } })
    setEditingId(null)
  }

  function handleDeleteProject(id) {
    dispatch({ type: 'DELETE_PROJECT', payload: id })
    if (activePage === `projet_${id}` || activePage === 'ulycom_clients') setActivePage('journee')
  }

  function handleAddProject() {
    if (!newName.trim()) return
    const color = PROJECT_COLORS[state.projects.length % PROJECT_COLORS.length]
    dispatch({ type: 'ADD_PROJECT', payload: { name: newName.trim(), emoji: newEmoji.trim() || '📁', color } })
    setNewName('')
    setNewEmoji('📁')
    setAddingProject(false)
  }

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
          overflowX: 'hidden',
          overflowY: 'auto',
          maxHeight: 'calc(100dvh - 32px)',
          scrollbarWidth: 'none',
          gap: 2,
        }}
        animate={{ width: expanded ? 220 : 56 }}
        transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
        onMouseEnter={() => !sidebarLocked && setHovered(true)}
        onMouseLeave={() => !sidebarLocked && setHovered(false)}
      >
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

        {/* PROJETS — divider with + button */}
        <div className="flex items-center gap-2 px-1 my-1" style={{ height: 20 }}>
          <div className="flex-1 h-px" style={{ background: 'var(--border-soft)' }} />
          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.1 }}
                className="flex items-center gap-1.5"
              >
                <span className="text-[9px] uppercase tracking-widest font-semibold whitespace-nowrap" style={{ color: 'var(--text-tertiary)' }}>
                  Projets
                </span>
                <button
                  onClick={() => { setAddingProject(true); setNewName(''); setNewEmoji('📁') }}
                  className="flex items-center justify-center w-4 h-4 rounded-full hover:opacity-70 transition-opacity"
                  style={{ color: 'var(--text-tertiary)', background: 'var(--border-soft)' }}
                  title="Ajouter un projet"
                >
                  <Plus size={9} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
          <div className="flex-1 h-px" style={{ background: 'var(--border-soft)' }} />
        </div>

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleProjectDragEnd}>
        <SortableContext items={state.projects.map(p => p.id)} strategy={verticalListSortingStrategy}>
        {state.projects.map(p => {
          const isActive = activePage === `projet_${p.id}`
          const isUlycom = p.id === 'p1'
          const showSub = isUlycom && ulycomExpanded && expanded
          const isEditing = editingId === p.id
          const rowActive = isActive || (isUlycom && activePage === 'ulycom_clients')

          return (
            <SortableProjectItem key={p.id} id={p.id}>
            <div>
              {isEditing && expanded ? (
                /* ── Inline edit form ── */
                <div
                  className="flex items-center gap-1.5 w-full rounded-xl px-2 py-1.5"
                  style={{ background: 'var(--bg-card-soft)', border: '1px solid var(--border-soft)' }}
                >
                  <input
                    value={editEmoji}
                    onChange={e => setEditEmoji(e.target.value)}
                    className="w-7 text-center bg-transparent text-base focus:outline-none"
                    maxLength={2}
                  />
                  <input
                    autoFocus
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') saveEdit(p.id)
                      if (e.key === 'Escape') setEditingId(null)
                    }}
                    placeholder="Nom..."
                    className="flex-1 text-sm bg-transparent focus:outline-none min-w-0"
                    style={{ color: 'var(--text-primary)' }}
                  />
                  <button onClick={() => saveEdit(p.id)} style={{ color: 'var(--green-deep)', flexShrink: 0 }}><Check size={12} /></button>
                  <button onClick={() => setEditingId(null)} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }}><X size={12} /></button>
                </div>
              ) : (
                /* ── Normal row ── */
                <div className="group relative">
                  <button
                    onClick={() => setActivePage(`projet_${p.id}`)}
                    title={!expanded ? `${p.emoji} ${p.name}` : undefined}
                    className="flex items-center gap-3 w-full transition-all duration-150 focus:outline-none"
                    style={{
                      padding: expanded ? '7px 12px' : '7px 0',
                      justifyContent: expanded ? 'flex-start' : 'center',
                      borderRadius: 12,
                      background: rowActive ? 'var(--active-bg)' : 'transparent',
                    }}
                  >
                    <span className="flex-shrink-0 flex items-center justify-center text-base" style={{ width: 32, height: 32 }}>
                      {p.emoji}
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
                            style={{ color: rowActive ? 'var(--active-text)' : 'var(--text-secondary)', fontWeight: rowActive ? 500 : 400 }}
                          >
                            {p.name}
                          </span>
                          {isUlycom && (
                            <ChevronDown size={11} style={{ color: rowActive ? 'var(--active-text)' : 'var(--text-tertiary)', flexShrink: 0, transform: ulycomExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                          )}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </button>

                  {/* Edit / delete — visible on hover */}
                  {expanded && (
                    <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto">
                      <button
                        onClick={e => { e.stopPropagation(); startEdit(p) }}
                        className="p-1 rounded-md"
                        style={{ color: rowActive ? 'rgba(255,255,255,0.7)' : 'var(--text-tertiary)', background: rowActive ? 'rgba(255,255,255,0.12)' : 'var(--bg-card-soft)' }}
                        title="Renommer"
                      >
                        <Pencil size={10} />
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); handleDeleteProject(p.id) }}
                        className="p-1 rounded-md"
                        style={{ color: 'var(--red-deep)', background: 'var(--red-bg)' }}
                        title="Supprimer"
                      >
                        <Trash2 size={10} />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Ulycom sub-nav */}
              {showSub && !isEditing && (
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
            </SortableProjectItem>
          )
        })}
        </SortableContext>
        </DndContext>

        {/* Add project form */}
        {addingProject && expanded && (
          <div
            className="rounded-xl overflow-hidden"
            style={{ background: 'var(--bg-card-soft)', border: '1px solid var(--border-soft)' }}
          >
            {/* Emoji quick-pick */}
            <div className="flex flex-wrap gap-0.5 px-1.5 pt-1.5">
              {['⚡','🚀','💡','🛍','📊','🎯','💼','🔥','🌟','🏆','💰','🎨','📱','🌐'].map(e => (
                <button
                  key={e}
                  onClick={() => setNewEmoji(e)}
                  className="text-base leading-none"
                  style={{
                    padding: '3px 4px',
                    borderRadius: 6,
                    background: newEmoji === e ? 'var(--violet-bg)' : 'transparent',
                    border: newEmoji === e ? '1px solid var(--violet-solid)' : '1px solid transparent',
                  }}
                >
                  {e}
                </button>
              ))}
            </div>
            {/* Name row */}
            <div className="flex items-center gap-1.5 px-2 py-1.5">
              <span className="text-base flex-shrink-0">{newEmoji}</span>
              <input
                autoFocus
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleAddProject()
                  if (e.key === 'Escape') setAddingProject(false)
                }}
                placeholder="Nom du projet..."
                className="flex-1 text-sm bg-transparent focus:outline-none min-w-0"
                style={{ color: 'var(--text-primary)' }}
              />
              <button onClick={handleAddProject} style={{ color: 'var(--green-deep)', flexShrink: 0 }}><Check size={12} /></button>
              <button onClick={() => setAddingProject(false)} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }}><X size={12} /></button>
            </div>
          </div>
        )}

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

        {/* Bottom controls */}
        <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border-soft)' }}>
          <button
            onClick={onToggleSidebarLock}
            title={sidebarLocked ? 'Réduire la sidebar' : 'Épingler la sidebar ouverte'}
            className="flex items-center gap-3 w-full transition-all duration-150 focus:outline-none"
            style={{ padding: expanded ? '7px 12px' : '7px 0', justifyContent: expanded ? 'flex-start' : 'center', borderRadius: 12 }}
          >
            <span className="flex-shrink-0 flex items-center justify-center" style={{ width: 32, height: 32, color: 'var(--text-tertiary)' }}>
              {sidebarLocked ? <PanelLeftClose size={17} strokeWidth={1.6} /> : <PanelLeftOpen size={17} strokeWidth={1.6} />}
            </span>
            <NavLabel expanded={expanded}>
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{sidebarLocked ? 'Réduire' : 'Épingler'}</span>
            </NavLabel>
          </button>

          <button
            onClick={() => setActivePage('migrate')}
            title="Migration Supabase"
            className="flex items-center gap-3 w-full transition-all duration-150 focus:outline-none"
            style={{ padding: expanded ? '7px 12px' : '7px 0', justifyContent: expanded ? 'flex-start' : 'center', borderRadius: 12, background: activePage === 'migrate' ? 'var(--active-bg)' : 'transparent' }}
          >
            <span className="flex-shrink-0 flex items-center justify-center" style={{ width: 32, height: 32, color: 'var(--text-tertiary)' }}>
              <Database size={15} strokeWidth={1.6} />
            </span>
            <NavLabel expanded={expanded}>
              <span className="text-sm" style={{ color: activePage === 'migrate' ? 'var(--active-text)' : 'var(--text-secondary)' }}>Migration</span>
            </NavLabel>
          </button>

          <div
            className="flex items-center gap-3 w-full mt-1"
            style={{ padding: expanded ? '7px 12px' : '7px 0', justifyContent: expanded ? 'flex-start' : 'center' }}
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
                  <span className="text-xs truncate flex-1" style={{ color: 'var(--text-tertiary)' }}>{user?.email}</span>
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
