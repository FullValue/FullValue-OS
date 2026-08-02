import { useState } from 'react'
import {
  Home, Inbox, Calendar, CheckSquare, Timer,
  BookOpen, GraduationCap,
  Users, LayoutDashboard, ChevronDown, LogOut, Database, FileJson,
  Pencil, Trash2, Check, X, Plus, Menu,
} from 'lucide-react'
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useStore } from '@/store/useStore'
import { useAuth } from '@/contexts/AuthContext'
import { toast, toastUndo } from '@/lib/toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'

export const SIDEBAR_WIDTH = 248

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

function SectionLabel({ children, className = '' }) {
  return (
    <p
      className={`px-3 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-[0.09em] ${className}`}
      style={{ color: 'var(--text-tertiary)' }}
    >
      {children}
    </p>
  )
}

// Rangée de navigation (toujours ouverte). Fond actif = inverse ; sinon hover neutre.
function NavRow({ id, label, Icon, isActive, onClick, badgeCount = 0, timerActive = false }) {
  return (
    <Button
      type="button"
      variant="ghost"
      onClick={() => onClick(id)}
      className="h-auto w-full justify-start gap-3 rounded-xl px-3 py-2 text-left transition-colors duration-100 hover:bg-[rgba(var(--ink),0.05)]"
      style={{ background: isActive ? 'var(--active-bg)' : undefined }}
    >
      <span className="relative flex h-5 w-5 flex-shrink-0 items-center justify-center">
        <Icon
          size={18}
          strokeWidth={isActive ? 2 : 1.7}
          style={{ color: isActive ? 'var(--active-text)' : 'var(--text-tertiary)' }}
        />
        {badgeCount > 0 && (
          <span
            className="absolute -right-1.5 -top-1.5 flex h-3.5 min-w-[14px] items-center justify-center rounded-full px-0.5 text-[8px] font-bold"
            style={{ background: 'var(--violet-deep)', color: '#fff' }}
          >
            {badgeCount > 9 ? '9+' : badgeCount}
          </span>
        )}
        {timerActive && (
          <span className="absolute -right-0.5 -top-0.5 h-2 w-2 animate-pulse rounded-full" style={{ background: 'var(--green-deep)' }} />
        )}
      </span>
      <span
        className="text-sm"
        style={{
          color: isActive ? 'var(--active-text)' : 'var(--text-secondary)',
          fontWeight: isActive ? 600 : 500,
        }}
      >
        {label}
      </span>
    </Button>
  )
}

// ─── Mobile bottom bar ────────────────────────────────────────────────────────

function MobileNav({ activePage, setActivePage, timerRunning, inboxCount, onOpenMenu }) {
  const MOBILE_ITEMS = [
    { id: 'journee', label: 'Journée',  Icon: Home },
    { id: 'inbox',   label: 'Inbox',    Icon: Inbox, badge: true },
    { id: 'taches',  label: 'Tâches',   Icon: CheckSquare },
    { id: 'sessions',label: 'Sessions', Icon: Timer, timer: true },
  ]

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex sm:hidden"
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
          <Button
            type="button"
            variant="ghost"
            key={id}
            onClick={() => setActivePage(id)}
            className="relative h-auto flex-1 flex-col gap-1 rounded-none py-2.5 transition-colors"
            style={{ color: isActive ? 'var(--violet-deep)' : 'var(--text-tertiary)' }}
          >
            <span className="relative">
              <Icon size={20} strokeWidth={isActive ? 2 : 1.5} />
              {badge && inboxCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full text-[8px] font-bold" style={{ background: 'var(--violet-deep)', color: '#fff' }}>
                  {inboxCount > 9 ? '9+' : inboxCount}
                </span>
              )}
              {timer && timerRunning && (
                <span className="absolute -right-0.5 -top-0.5 h-2 w-2 animate-pulse rounded-full" style={{ background: 'var(--green-deep)' }} />
              )}
            </span>
            <span className="text-[10px] font-medium">{label}</span>
          </Button>
        )
      })}
      <Button
        type="button"
        variant="ghost"
        onClick={onOpenMenu}
        className="relative h-auto flex-1 flex-col gap-1 rounded-none py-2.5 transition-colors"
        style={{ color: 'var(--text-tertiary)' }}
      >
        <Menu size={20} strokeWidth={1.5} />
        <span className="text-[10px] font-medium">Plus</span>
      </Button>
    </nav>
  )
}

// ─── Mobile menu drawer (full nav mirror) ─────────────────────────────────────

function MobileMenuDrawer({ isOpen, onClose, activePage, setActivePage, projects, user, userInitials, onSignOut }) {

  function handlePick(id) {
    setActivePage(id)
    onClose()
  }

  const SECTIONS = [
    {
      label: 'Pilotage',
      items: [
        { id: 'calendrier', label: 'Calendrier',  Icon: Calendar },
        { id: 'import',     label: 'Import bulk', Icon: FileJson },
      ],
    },
    { label: 'Ressources', items: RESSOURCES },
  ]

  return (
    <Sheet open={isOpen} onOpenChange={open => { if (!open) onClose() }}>
      <SheetContent hideClose side="left" className="w-full max-w-none border-0 p-0 sm:hidden">
        <SheetTitle className="sr-only">Menu principal</SheetTitle>
      <div className="flex flex-shrink-0 items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border-soft)' }}>
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl text-xs font-semibold" style={{ background: 'var(--violet-bg)', color: 'var(--violet-deep)' }}>
            {userInitials}
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Menu</p>
            <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>{user?.email}</p>
          </div>
        </div>
        <Button type="button" variant="ghost" size="icon" onClick={onClose} className="h-9 w-9 text-[var(--text-tertiary)] hover:bg-[rgba(var(--ink),0.05)]">
          <X size={18} />
        </Button>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto px-4 py-4 pb-24">
        {SECTIONS.map(section => (
          <div key={section.label}>
            <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-tertiary)' }}>{section.label}</p>
            <div className="flex flex-col gap-1">
              {section.items.map(item => {
                const isActive = activePage === item.id
                return (
                  <Button key={item.id} type="button" variant="ghost" onClick={() => handlePick(item.id)}
                    className="h-auto w-full justify-start gap-3 rounded-xl px-3 py-3 text-left transition-colors"
                    style={{ background: isActive ? 'var(--active-bg)' : 'transparent', color: isActive ? 'var(--active-text)' : 'var(--text-secondary)' }}>
                    <item.Icon size={18} strokeWidth={isActive ? 2 : 1.6} />
                    <span className="text-sm font-medium">{item.label}</span>
                  </Button>
                )
              })}
            </div>
          </div>
        ))}

        <div>
          <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-tertiary)' }}>Projets</p>
          <div className="flex flex-col gap-1">
            {projects.map(p => {
              const isActive = activePage === `projet_${p.id}` || (p.id === 'p1' && activePage === 'ulycom_clients')
              return (
                <div key={p.id} className="flex items-center gap-1 rounded-xl transition-colors"
                  style={{ background: isActive ? p.color + '22' : 'transparent' }}>
                  <Button type="button" variant="ghost" onClick={() => handlePick(`projet_${p.id}`)}
                    className="h-auto min-w-0 flex-1 justify-start gap-3 rounded-xl px-3 py-3 text-left"
                    style={{ color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                  <span className="text-lg">{p.emoji}</span>
                  <span className="flex-1 truncate text-sm font-medium">{p.name}</span>
                  </Button>
                  {p.id === 'p1' && (
                    <Button type="button" variant="ghost" onClick={() => handlePick('ulycom_clients')}
                      className="mr-1 h-auto rounded-lg px-2 py-1 text-[10px] transition-colors"
                      style={{ background: activePage === 'ulycom_clients' ? p.color + '30' : 'rgba(var(--ink),0.05)', color: activePage === 'ulycom_clients' ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>
                      Clients
                    </Button>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        <div>
          <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-tertiary)' }}>Compte</p>
          <Button type="button" variant="ghost" onClick={onSignOut} className="h-auto w-full justify-start gap-3 rounded-xl px-3 py-3 text-left text-[var(--red-deep)] transition-colors">
            <LogOut size={18} strokeWidth={1.6} />
            <span className="text-sm font-medium">Déconnexion</span>
          </Button>
        </div>
      </div>
      </SheetContent>
    </Sheet>
  )
}

// ─── Fixed full-height sidebar ────────────────────────────────────────────────

export default function FloatingNavbar({ activePage, setActivePage, timerRunning }) {
  const { state, dispatch } = useStore()
  const { user, signOut } = useAuth()
  const [addingProject, setAddingProject] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const inboxCount = state.inbox.length

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
    const project = state.projects.find(p => p.id === id)
    const tasks = state.tasks.filter(t => t.projectId === id)
    const sessions = state.sessions.filter(s => s.projectId === id)
    dispatch({ type: 'DELETE_PROJECT', payload: id })
    if (activePage === `projet_${id}` || activePage === 'ulycom_clients') setActivePage('journee')
    toastUndo('Projet supprimé', () =>
      dispatch({ type: 'RESTORE_ITEMS', payload: { projects: [project], tasks, sessions } })
    )
  }

  function handleAddProject() {
    if (!newName.trim()) return
    const color = PROJECT_COLORS[state.projects.length % PROJECT_COLORS.length]
    dispatch({ type: 'ADD_PROJECT', payload: { name: newName.trim(), emoji: newEmoji.trim() || '📁', color } })
    toast.success('Projet créé')
    setNewName('')
    setNewEmoji('📁')
    setAddingProject(false)
  }

  const userInitials = (user?.user_metadata?.full_name || user?.email || '?')
    .split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  const ulycomExpanded = activePage === 'projet_p1' || activePage === 'ulycom_clients'

  return (
    <>
      {/* Desktop fixed sidebar */}
      <aside
        className="fixed left-0 top-0 z-50 hidden flex-col sm:flex"
        style={{
          width: SIDEBAR_WIDTH,
          height: '100dvh',
          background: 'var(--bg-sidebar)',
          borderRight: '1px solid var(--border-medium)',
        }}
      >
        {/* Brand */}
        <div className="flex h-16 flex-shrink-0 items-center gap-2.5 px-5">
          <span className="text-lg leading-none">✦</span>
          <span className="text-[15px] font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Le Cockpit
          </span>
        </div>

        {/* Scrollable nav */}
        <div className="flex-1 overflow-y-auto px-3 pb-4" style={{ scrollbarWidth: 'thin' }}>
          <SectionLabel>Pilotage</SectionLabel>
          <div className="flex flex-col gap-0.5">
            {PILOTAGE.map(({ id, label, Icon, badge, timer }) => (
              <NavRow
                key={id}
                id={id}
                label={label}
                Icon={Icon}
                isActive={activePage === id}
                onClick={setActivePage}
                badgeCount={badge ? inboxCount : 0}
                timerActive={timer && timerRunning}
              />
            ))}
          </div>

          {/* Projets header */}
          <div className="flex items-center justify-between px-3 pb-1 pt-4">
            <span className="text-[10px] font-semibold uppercase tracking-[0.09em]" style={{ color: 'var(--text-tertiary)' }}>
              Projets
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => { setAddingProject(true); setNewName(''); setNewEmoji('📁') }}
              className="h-5 w-5 rounded-md p-0 text-[var(--text-tertiary)] transition-colors hover:bg-[rgba(var(--ink),0.08)]"
              style={{ color: 'var(--text-tertiary)' }}
              title="Ajouter un projet"
            >
              <Plus size={13} />
            </Button>
          </div>

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleProjectDragEnd}>
            <SortableContext items={state.projects.map(p => p.id)} strategy={verticalListSortingStrategy}>
              <div className="flex flex-col gap-0.5">
                {state.projects.map(p => {
                  const isActive = activePage === `projet_${p.id}`
                  const isUlycom = p.id === 'p1'
                  const showSub = isUlycom && ulycomExpanded
                  const isEditing = editingId === p.id
                  const rowActive = isActive || (isUlycom && activePage === 'ulycom_clients')

                  return (
                    <SortableProjectItem key={p.id} id={p.id}>
                      <div>
                        {isEditing ? (
                          <div className="flex items-center gap-1.5 rounded-xl px-2 py-1.5" style={{ background: 'var(--bg-card-soft)', border: '1px solid var(--border-soft)' }}>
                            <Input
                              value={editEmoji}
                              onChange={e => setEditEmoji(e.target.value)}
                              className="h-7 w-7 rounded-lg bg-transparent p-0 text-center text-base shadow-none focus:bg-transparent focus:ring-0"
                              maxLength={2}
                            />
                            <Input
                              autoFocus
                              value={editName}
                              onChange={e => setEditName(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') saveEdit(p.id)
                                if (e.key === 'Escape') setEditingId(null)
                              }}
                              placeholder="Nom..."
                              className="h-7 min-w-0 flex-1 rounded-lg bg-transparent px-2 text-sm shadow-none focus:bg-transparent focus:ring-0"
                              style={{ color: 'var(--text-primary)' }}
                            />
                            <Button type="button" variant="ghost" size="icon-sm" onClick={() => saveEdit(p.id)} className="h-6 w-6 p-0 text-[var(--green-deep)]"><Check size={13} /></Button>
                            <Button type="button" variant="ghost" size="icon-sm" onClick={() => setEditingId(null)} className="h-6 w-6 p-0 text-[var(--text-tertiary)]"><X size={13} /></Button>
                          </div>
                        ) : (
                          <div className="group relative">
                            <Button
                              type="button"
                              variant="ghost"
                              onClick={() => setActivePage(`projet_${p.id}`)}
                              className="h-auto w-full justify-start gap-3 rounded-xl px-3 py-2 text-left transition-colors duration-100 hover:bg-[rgba(var(--ink),0.05)]"
                              style={{ background: rowActive ? 'var(--active-bg)' : undefined }}
                            >
                              <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center text-[15px] leading-none">{p.emoji}</span>
                              <span className="flex min-w-0 flex-1 items-center gap-1">
                                <span
                                  className="truncate text-sm"
                                  style={{ color: rowActive ? 'var(--active-text)' : 'var(--text-secondary)', fontWeight: rowActive ? 600 : 500 }}
                                >
                                  {p.name}
                                </span>
                                <span className="ml-auto flex-shrink-0 text-[9px]" style={{ color: rowActive ? 'rgba(255,255,255,0.6)' : 'var(--text-tertiary)' }}>T{p.tier}</span>
                                {isUlycom && (
                                  <ChevronDown size={12} style={{ color: rowActive ? 'rgba(255,255,255,0.6)' : 'var(--text-tertiary)', flexShrink: 0, transform: ulycomExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                                )}
                              </span>
                            </Button>

                            {/* Edit / delete on hover */}
                            <div className="pointer-events-none absolute right-1.5 top-1/2 flex -translate-y-1/2 items-center gap-0.5 opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                onClick={e => { e.stopPropagation(); startEdit(p) }}
                                className="h-6 w-6 rounded-md p-1"
                                style={{ color: rowActive ? 'rgba(255,255,255,0.8)' : 'var(--text-tertiary)', background: rowActive ? 'rgba(255,255,255,0.15)' : 'var(--bg-card-soft)' }}
                                title="Renommer"
                              >
                                <Pencil size={10} />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                onClick={e => { e.stopPropagation(); handleDeleteProject(p.id) }}
                                className="h-6 w-6 rounded-md p-1"
                                style={{ color: 'var(--red-deep)', background: 'var(--red-bg)' }}
                                title="Supprimer"
                              >
                                <Trash2 size={10} />
                              </Button>
                            </div>
                          </div>
                        )}

                        {/* Ulycom sub-nav */}
                        {showSub && !isEditing && (
                          <div className="ml-8 mt-0.5 flex flex-col gap-0.5">
                            {[
                              { id: 'projet_p1', label: 'Dashboard', Icon: LayoutDashboard },
                              { id: 'ulycom_clients', label: 'Clients', Icon: Users },
                            ].map(sub => (
                              <Button
                                type="button"
                                variant="ghost"
                                key={sub.id}
                                onClick={() => setActivePage(sub.id)}
                                className="h-auto justify-start gap-2 rounded-lg px-2.5 py-1.5 text-xs transition-colors hover:bg-[rgba(var(--ink),0.05)]"
                                style={{
                                  color: activePage === sub.id ? 'var(--violet-deep)' : 'var(--text-tertiary)',
                                  background: activePage === sub.id ? 'var(--violet-bg)' : 'transparent',
                                  fontWeight: activePage === sub.id ? 600 : 500,
                                }}
                              >
                                <sub.Icon size={12} /> {sub.label}
                              </Button>
                            ))}
                          </div>
                        )}
                      </div>
                    </SortableProjectItem>
                  )
                })}
              </div>
            </SortableContext>
          </DndContext>

          {/* Add project form */}
          {addingProject && (
            <div className="mt-1 flex items-center gap-1.5 rounded-xl px-2 py-1.5" style={{ background: 'var(--bg-card-soft)', border: '1px solid var(--border-soft)' }}>
              <Input
                value={newEmoji}
                onChange={e => setNewEmoji(e.target.value)}
                className="h-7 w-7 rounded-lg bg-transparent p-0 text-center text-base shadow-none focus:bg-transparent focus:ring-0"
                maxLength={2}
              />
              <Input
                autoFocus
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleAddProject()
                  if (e.key === 'Escape') setAddingProject(false)
                }}
                placeholder="Nom du projet..."
                className="h-7 min-w-0 flex-1 rounded-lg bg-transparent px-2 text-sm shadow-none focus:bg-transparent focus:ring-0"
                style={{ color: 'var(--text-primary)' }}
              />
              <Button type="button" variant="ghost" size="icon-sm" onClick={handleAddProject} className="h-6 w-6 p-0 text-[var(--green-deep)]"><Check size={13} /></Button>
              <Button type="button" variant="ghost" size="icon-sm" onClick={() => setAddingProject(false)} className="h-6 w-6 p-0 text-[var(--text-tertiary)]"><X size={13} /></Button>
            </div>
          )}

          <SectionLabel>Ressources</SectionLabel>
          <div className="flex flex-col gap-0.5">
            {RESSOURCES.map(({ id, label, Icon }) => (
              <NavRow key={id} id={id} label={label} Icon={Icon} isActive={activePage === id} onClick={setActivePage} />
            ))}
          </div>
        </div>

        {/* Bottom: migration + account */}
        <div className="flex-shrink-0 px-3 py-3" style={{ borderTop: '1px solid var(--border-soft)' }}>
          <NavRow id="migrate" label="Migration" Icon={Database} isActive={activePage === 'migrate'} onClick={setActivePage} />
          <div className="mt-1 flex items-center gap-2.5 px-3 py-2">
            <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl text-xs font-bold" style={{ background: 'var(--violet-bg)', color: 'var(--violet-deep)' }}>
              {userInitials}
            </span>
            <span className="min-w-0 flex-1 truncate text-xs" style={{ color: 'var(--text-tertiary)' }}>{user?.email}</span>
            <Button type="button" variant="ghost" size="icon-sm" onClick={signOut} title="Se déconnecter" className="h-7 w-7 flex-shrink-0 rounded-lg p-1.5 transition-colors hover:bg-[rgba(var(--ink),0.06)]">
              <LogOut size={15} style={{ color: 'var(--text-tertiary)' }} />
            </Button>
          </div>
        </div>
      </aside>

      {/* Mobile */}
      <MobileNav
        activePage={activePage}
        setActivePage={setActivePage}
        timerRunning={timerRunning}
        inboxCount={inboxCount}
        onOpenMenu={() => setMobileMenuOpen(true)}
      />
      <MobileMenuDrawer
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        activePage={activePage}
        setActivePage={setActivePage}
        projects={state.projects}
        user={user}
        userInitials={userInitials}
        onSignOut={() => { signOut(); setMobileMenuOpen(false) }}
      />
    </>
  )
}
