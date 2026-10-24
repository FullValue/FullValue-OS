import { useMemo, useState } from 'react'
import { PanelRightClose, PanelRightOpen, LogOut, Play, Check, Sparkles, Lock } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { useGame } from '@/hooks/useGame'
import { useGmail } from '@/contexts/GmailContext'
import { useTheme } from '@/contexts/ThemeContext'
import { localDateStr } from '@/lib/backup'
import { topTasks, URGENCY_LABEL, URGENCY_COLOR } from '@/lib/priorities'
import { dueToday, doneOn } from '@/lib/habits'
import { AVATAR_ACCESSORIES, AVATAR_COLORS, DECOR_UNLOCKS, nextUnlock } from '@/lib/openspace'
import OfficeScene from '@/components/openspace/OfficeScene'
import DetailPanel from '@/components/openspace/DetailPanel'
import { TimerChip } from '@/components/layout/TopBar'
import { buildLayout, findEntity } from '@/components/openspace/layout'

const GLASS = 'bg-[var(--bg-material)] backdrop-blur-xl shadow-[var(--shadow-float)]'

// Onglet « Aujourd'hui » : ce qui compte maintenant, actionnable sans quitter la scène.
function TodayTab({ onStartTask, onSelect }) {
  const { state, dispatch } = useStore()
  const today = localDateStr()
  const tasks = topTasks(state.tasks, 8)
  const habits = dueToday(state.habits || [])
  const projects = Object.fromEntries(state.projects.map(p => [p.id, p]))
  return (
    <div className="space-y-5">
      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-tertiary)]">À traiter · {tasks.length}</p>
        <ul className="space-y-1">
          {tasks.map(({ task, level }) => (
            <li key={task.id} className="group flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-[rgba(var(--ink),0.04)]">
              <button type="button" aria-label="Terminer" onClick={() => dispatch({ type: 'TOGGLE_TASK_DONE', payload: task.id })}
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-[1.5px] border-[var(--border-strong)] hover:border-[var(--accent)]" />
              <button type="button" className="min-w-0 flex-1 text-left" onClick={() => onSelect(`task:${task.id}`)}>
                <span className="block truncate text-sm text-[var(--text-primary)]">{task.title}</span>
                <span className="block text-[10px]" style={{ color: URGENCY_COLOR[level] }}>{URGENCY_LABEL[level]} · {projects[task.projectId]?.emoji} {projects[task.projectId]?.name}</span>
              </button>
              <button type="button" aria-label="Focus" title="Lancer le chrono" onClick={() => onStartTask(task.projectId, task.id)}
                className="flex h-7 w-7 items-center justify-center rounded-full text-[var(--accent)] opacity-0 hover:bg-[var(--brand-100)] group-hover:opacity-100"><Play size={13} /></button>
            </li>
          ))}
          {!tasks.length && <li className="text-sm text-[var(--text-tertiary)]">Rien d'urgent.</li>}
        </ul>
      </div>
      {habits.length > 0 && (
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-tertiary)]">Routines</p>
          <div className="flex flex-wrap gap-2">
            {habits.map(h => {
              const done = doneOn(state.habitLogs, h.id, today)
              return (
                <button key={h.id} type="button" onClick={() => dispatch({ type: 'TOGGLE_HABIT', payload: { habitId: h.id, date: today } })}
                  className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium"
                  style={done ? { background: 'var(--accent)', color: '#fff' } : { background: 'var(--bg-card-soft)', color: 'var(--text-secondary)' }}>
                  {done ? <Check size={12} /> : h.emoji} {h.name}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// Onglet « Avatar » : couleur et accessoires débloqués, et ce que le prochain niveau apporte.
function AvatarTab({ game }) {
  const { state, dispatch } = useStore()
  const avatar = { color: '#3B6FF0', accessory: 'cap', ...(state.settings?.avatar || {}) }
  const set = patch => dispatch({ type: 'UPDATE_SETTINGS', payload: { avatar: { ...avatar, ...patch } } })
  const next = nextUnlock(game.level)
  return (
    <div className="space-y-5">
      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-tertiary)]">Couleur</p>
        <div className="flex flex-wrap gap-2">
          {AVATAR_COLORS.map(c => (
            <button key={c} type="button" aria-label={`Couleur ${c}`} onClick={() => set({ color: c })} className="h-8 w-8 rounded-full"
              style={{ background: c, outline: avatar.color === c ? '2px solid var(--accent)' : 'none', outlineOffset: 2 }} />
          ))}
        </div>
      </div>
      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-tertiary)]">Accessoire</p>
        <div className="grid grid-cols-2 gap-2">
          {AVATAR_ACCESSORIES.map(a => {
            const locked = game.level < a.level
            return (
              <button key={a.id} type="button" disabled={locked} onClick={() => set({ accessory: a.id })}
                className="flex items-center justify-between rounded-xl px-3 py-2 text-xs font-medium disabled:opacity-50"
                style={avatar.accessory === a.id ? { background: 'var(--bg-selection)', color: 'var(--accent)' } : { background: 'var(--bg-card-soft)', color: 'var(--text-secondary)' }}>
                {a.label} {locked && <span className="flex items-center gap-1 text-[10px]"><Lock size={10} /> niv. {a.level}</span>}
              </button>
            )
          })}
        </div>
      </div>
      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-tertiary)]">Décor de l'étage</p>
        <ul className="space-y-1.5 text-xs">
          {DECOR_UNLOCKS.map(u => (
            <li key={u.level} className="flex items-center gap-2" style={{ color: game.level >= u.level ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>
              {game.level >= u.level ? <Check size={12} className="text-[var(--accent)]" /> : <Lock size={12} />} {u.label} <span className="ml-auto text-[10px] text-[var(--text-tertiary)]">niv. {u.level}</span>
            </li>
          ))}
        </ul>
        {next && <p className="mt-3 flex items-center gap-1.5 rounded-xl bg-[var(--brand-100)] px-3 py-2 text-xs text-[var(--accent)]"><Sparkles size={12} /> Niveau {next.level} : {next.label}</p>}
      </div>
    </div>
  )
}

// Chargée en lazy depuis App.jsx : three.js n'entre dans le bundle qu'à l'ouverture de cette page.
export default function OpenSpace({ onNavigate, timer, onStartTask }) {
  const { state } = useStore()
  const { theme } = useTheme()
  const game = useGame()
  const gmail = useGmail()
  const mailCount = gmail.status === 'connected' ? gmail.messages.length : 0
  const [selectedId, setSelectedId] = useState(null)
  const [tab, setTab] = useState('today')
  // Panneau ouvert d'office sur grand écran, replié sur mobile pour laisser voir la scène.
  const [panelOpen, setPanelOpen] = useState(() => window.innerWidth >= 900)
  const layout = useMemo(() => buildLayout(state), [state])
  const entity = findEntity(layout, selectedId)
  const openTasks = state.tasks.filter(t => t.status !== 'done').length

  function select(id) {
    setSelectedId(id)
    if (id) { setTab('detail'); setPanelOpen(true) }
  }

  const zones = [
    ...layout.zones.map(z => ({ id: z.id, label: `${z.pole.emoji || ''} ${z.pole.name}`.trim(), color: z.pole.color })),
    { id: 'hub', label: '🏠 Bureau', color: '#3b6ff0' },
    { id: 'agent:claude', label: '🤖 Agents', color: '#D97757' },
    { id: 'meeting', label: '🤝 Prestataires', color: '#5BA8E0' },
  ]
  const tabs = [['today', "Aujourd'hui"], ['detail', 'Détail'], ['avatar', 'Avatar']]

  return (
    <div className="relative h-full w-full overflow-hidden rounded-[26px] sm:rounded-none" style={{ minHeight: 'calc(100dvh - 120px)' }}>
      <div className="absolute inset-0">
        <OfficeScene
          layout={layout} theme={theme} inboxCount={state.inbox.length} mailCount={mailCount}
          game={game} avatar={state.settings?.avatar}
          selectedId={entity ? selectedId : null} onSelect={select} panelOpen={panelOpen}
        />
      </div>

      {/* En-tête flottant */}
      <div className={`absolute left-4 top-4 z-20 max-w-[min(640px,calc(100%-2rem))] rounded-[22px] px-5 py-3 ${GLASS}`}>
        <div className="flex items-baseline gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">Open space</h1>
          <span className="text-xs text-[var(--text-tertiary)]">Niv. {game.level} · 🔥 {game.streak.current} j · {openTasks} tâches ouvertes</span>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {zones.map(z => (
            <button key={z.id} type="button" onClick={() => select(z.id)}
              className="rounded-full bg-[var(--bg-card)] px-3 py-1 text-xs font-medium text-[var(--text-primary)] shadow-[var(--shadow-card)] hover:bg-[var(--bg-selection)]"
              style={{ outline: selectedId === z.id ? `2px solid ${z.color}` : 'none' }}>{z.label}</button>
          ))}
        </div>
      </div>

      {/* Chrono et sortie, en haut à droite */}
      <div className="absolute top-4 z-20 flex items-center gap-2 transition-all" style={{ right: panelOpen ? 'calc(min(380px, 90vw) + 1.5rem)' : '1rem' }}>
        {timer && <TimerChip timer={timer} />}
        <button type="button" onClick={() => setPanelOpen(o => !o)} aria-label={panelOpen ? 'Masquer le panneau' : 'Afficher le panneau'}
          className={`flex h-11 w-11 items-center justify-center rounded-full text-[var(--text-secondary)] ${GLASS}`}>
          {panelOpen ? <PanelRightClose size={17} /> : <PanelRightOpen size={17} />}
        </button>
        <button type="button" onClick={() => onNavigate('journee')} className={`flex h-11 items-center gap-2 rounded-full px-4 text-sm font-medium text-[var(--text-secondary)] ${GLASS}`}>
          <LogOut size={15} /> Quitter
        </button>
      </div>

      {/* Panneau latéral */}
      <aside
        className={`absolute bottom-4 right-4 top-4 z-30 flex w-[min(380px,90vw)] flex-col rounded-[26px] transition-transform duration-300 ${GLASS}`}
        style={{ transform: panelOpen ? 'none' : 'translateX(calc(100% + 2rem))' }}
      >
        <div className="flex gap-1 p-2">
          {tabs.map(([id, label]) => (
            <button key={id} type="button" onClick={() => setTab(id)}
              className={`flex-1 rounded-full py-2 text-sm font-medium transition-colors ${tab === id ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-[var(--shadow-card)]' : 'text-[var(--text-tertiary)]'}`}>{label}</button>
          ))}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
          {tab === 'today' && <TodayTab onStartTask={onStartTask} onSelect={select} />}
          {tab === 'detail' && (entity
            ? <DetailPanel embedded entity={entity} game={game} onClose={() => setSelectedId(null)} onNavigate={onNavigate} />
            : <p className="py-10 text-center text-sm text-[var(--text-tertiary)]">Clique sur un poste, un pôle ou ton bureau pour voir le détail.</p>)}
          {tab === 'avatar' && <AvatarTab game={game} />}
        </div>
      </aside>

      {/* Légende */}
      <div className={`absolute bottom-4 left-4 z-20 hidden gap-3 rounded-full px-4 py-2 text-[11px] text-[var(--text-secondary)] sm:flex ${GLASS}`}>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[var(--brand-500)]" /> Écran allumé : en cours</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#E5484D]" /> En retard</span>
        <span>🔥 Série · 📬 Mails · Glisser pour tourner, molette pour zoomer</span>
      </div>
    </div>
  )
}
