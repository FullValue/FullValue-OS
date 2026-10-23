import { useMemo, useState } from 'react'
import { useStore } from '@/store/useStore'
import { useGame } from '@/hooks/useGame'
import { useGmail } from '@/contexts/GmailContext'
import { useTheme } from '@/contexts/ThemeContext'
import OfficeScene from '@/components/openspace/OfficeScene'
import DetailPanel from '@/components/openspace/DetailPanel'
import { buildLayout, findEntity } from '@/components/openspace/layout'

// Chargée en lazy depuis App.jsx : three.js n'entre dans le bundle qu'à l'ouverture de cette page.
export default function OpenSpace({ onNavigate }) {
  const { state } = useStore()
  const { theme } = useTheme()
  const game = useGame()
  const gmail = useGmail()
  const mailCount = gmail.status === 'connected' ? gmail.messages.length : 0
  const [selectedId, setSelectedId] = useState(null)
  const layout = useMemo(() => buildLayout(state), [state])
  const entity = findEntity(layout, selectedId)

  const clientCount = state.clients.filter(c => c.status !== 'archived').length
  const openTasks = state.tasks.filter(t => t.status !== 'done').length

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="font-heading text-2xl font-bold text-[var(--text-primary)]">Open space</h1>
          <p className="text-sm text-[var(--text-tertiary)]">
            Niv. {game.level} · {game.streak.current ? `🔥 ${game.streak.current} j · ` : ''}{state.projects.length} pôles · {clientCount} clients · {openTasks} tâches ouvertes
          </p>
        </div>
        <p className="hidden text-xs text-[var(--text-tertiary)] sm:block">Glisser pour tourner · clic droit pour déplacer · molette pour zoomer</p>
      </div>
      <div
        className="relative overflow-hidden rounded-2xl border border-[var(--border-soft)] shadow-[var(--shadow-card)]"
        style={{ height: 'calc(100dvh - 300px)', minHeight: 440 }}
      >
        <OfficeScene
          layout={layout}
          theme={theme}
          inboxCount={state.inbox.length}
          mailCount={mailCount}
          game={game}
          selectedId={entity ? selectedId : null}
          onSelect={setSelectedId}
        />
        {/* Accès direct aux zones, sans chercher dans la scène */}
        <div className="absolute left-3 top-3 z-20 flex max-w-[calc(100%-1.5rem)] flex-wrap gap-1.5 sm:max-w-[60%]">
          {[
            ...layout.zones.map(z => ({ id: z.id, label: `${z.pole.emoji || ''} ${z.pole.name}`.trim(), color: z.pole.color })),
            { id: 'hub', label: '🏠 Bureau', color: '#2f8f5b' },
            { id: 'agent:claude', label: '🤖 Agents', color: '#D97757' },
            { id: 'meeting', label: '🤝 Prestataires', color: '#5BA8E0' },
          ].map(z => (
            <button
              key={z.id}
              type="button"
              onClick={() => setSelectedId(z.id)}
              className="flex items-center gap-1.5 rounded-full bg-[var(--bg-material)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] shadow-[var(--shadow-card)] backdrop-blur hover:bg-[var(--bg-card)]"
              style={{ outline: selectedId === z.id ? `2px solid ${z.color}` : 'none' }}
            >
              {z.label}
            </button>
          ))}
        </div>
        <div className="absolute bottom-3 left-3 z-20 hidden gap-3 rounded-full bg-[var(--bg-material)] px-3 py-1.5 text-[11px] text-[var(--text-secondary)] shadow-[var(--shadow-card)] backdrop-blur sm:flex">
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[var(--brand-500)]" /> Écran allumé : en cours</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#E5484D]" /> En retard</span>
          <span>🔥 Série · 📬 Mails importants</span>
        </div>
        <DetailPanel entity={entity} game={game} onClose={() => setSelectedId(null)} onNavigate={onNavigate} />
      </div>
    </div>
  )
}
