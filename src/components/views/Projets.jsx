import { accentText } from '@/lib/colors'
import { TrendingUp, Clock, CheckSquare } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'

function formatDuration(seconds) {
  if (!seconds) return '0m'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h${m > 0 ? m + 'm' : ''}`
  return `${m}m`
}

function getWeekStart() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return d
}

export default function Projets({ onNavigate }) {
  const { state } = useStore()

  const weekStart = getWeekStart()

  const TIER_LABELS = { 1: 'Tier 1', 2: 'Tier 2', 3: 'Tier 3', 4: 'Tier 4' }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-[34px] font-semibold leading-tight tracking-tight text-[var(--text-primary)]">Projets</h1>
        <p className="text-sm text-[var(--text-tertiary)]">Chaque pôle a son espace : tâches, notes, liens et sessions. Le « + » à côté de chaque projet dans la barre latérale ajoute sans quitter ta page.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {state.projects.map(project => {
          const projectTasks = state.tasks.filter(t => t.projectId === project.id)
          const activeTasks = projectTasks.filter(t => t.status !== 'done')
          const weekSessions = state.sessions.filter(s => {
            return s.projectId === project.id && new Date(s.date) >= weekStart
          })
          const weekTime = weekSessions.reduce((sum, s) => sum + s.duration, 0)
          const completedThisWeek = projectTasks.filter(t => t.completedAt && new Date(t.completedAt) >= weekStart).length
          const hasMomentum = completedThisWeek > 0

          return (
            <Card
              key={project.id}
              hover
              role="button"
              tabIndex={0}
              onClick={() => onNavigate('projet_' + project.id)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onNavigate('projet_' + project.id) } }}
              className="p-5 text-left cursor-pointer group focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-heading font-bold flex-shrink-0"
                    style={{ backgroundColor: project.color + '25', color: accentText(project.color) }}
                  >
                    {project.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-[var(--text-primary)] text-sm group-hover:text-[var(--text-primary)]">{project.name}</h3>
                    <span className="text-[10px] text-[var(--text-tertiary)]">{TIER_LABELS[project.tier]}</span>
                  </div>
                </div>
                {hasMomentum && (
                  <span className="text-emerald text-xs flex items-center gap-0.5">
                    <TrendingUp size={12} /> ↑
                  </span>
                )}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-2 mb-4">
                <div className="bg-[rgba(var(--ink),0.03)] rounded-lg p-2">
                  <p className="text-[var(--text-tertiary)] text-[10px] flex items-center gap-1">
                    <CheckSquare size={9} /> Tâches actives
                  </p>
                  <p className="font-mono text-[var(--text-primary)] text-lg font-medium mt-0.5">{activeTasks.length}</p>
                </div>
                <div className="bg-[rgba(var(--ink),0.03)] rounded-lg p-2">
                  <p className="text-[var(--text-tertiary)] text-[10px] flex items-center gap-1">
                    <Clock size={9} /> Cette semaine
                  </p>
                  <p className="font-mono text-[var(--text-primary)] text-lg font-medium mt-0.5">{formatDuration(weekTime)}</p>
                </div>
              </div>

              {/* North star progress */}
              <div>
                <div className="flex justify-between text-[10px] text-[var(--text-tertiary)] mb-1">
                  <span className="truncate max-w-[70%]">{project.northStar}</span>
                  <span>{project.northStarProgress}%</span>
                </div>
                <Progress value={project.northStarProgress} color={project.color} className="h-1" />
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
