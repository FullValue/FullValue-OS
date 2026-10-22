import { useMemo, useState } from 'react'
import { useStore } from '@/store/useStore'
import { useTheme } from '@/contexts/ThemeContext'
import OfficeScene from '@/components/openspace/OfficeScene'
import DetailPanel from '@/components/openspace/DetailPanel'
import { buildLayout, findEntity } from '@/components/openspace/layout'

// Chargée en lazy depuis App.jsx : three.js n'entre dans le bundle qu'à l'ouverture de cette page.
export default function OpenSpace({ onNavigate }) {
  const { state } = useStore()
  const { theme } = useTheme()
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
            {state.projects.length} pôles · {clientCount} clients · {openTasks} tâches ouvertes
          </p>
        </div>
        <p className="hidden text-xs text-[var(--text-tertiary)] sm:block">Glisser pour tourner · clic droit pour déplacer · molette pour zoomer</p>
      </div>
      <div
        className="relative overflow-hidden rounded-2xl border border-[var(--border-soft)] shadow-[var(--shadow-card)]"
        style={{ height: 'calc(100dvh - 170px)', minHeight: 420 }}
      >
        <OfficeScene
          layout={layout}
          theme={theme}
          inboxCount={state.inbox.length}
          selectedId={entity ? selectedId : null}
          onSelect={setSelectedId}
        />
        <DetailPanel entity={entity} onClose={() => setSelectedId(null)} onNavigate={onNavigate} />
      </div>
    </div>
  )
}
