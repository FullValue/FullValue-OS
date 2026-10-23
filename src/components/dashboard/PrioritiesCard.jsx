import { useState, useEffect, useRef } from 'react'
import confetti from 'canvas-confetti'
import { Play, Plus, X, Zap } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'

// Priorités du jour (5 max) : choix des tâches « today », coche et célébration.

function WidgetCard({ title, badge, action, children, accent }) {
  return (
    <Card className="overflow-hidden">
      {title && (
        <div
          className="flex items-center justify-between px-5 pt-4 pb-3"
          style={{ borderBottom: '1px solid var(--border-soft)' }}
        >
          <h2 className="font-semibold text-sm" style={{ color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
            {title}
          </h2>
          <div className="flex items-center gap-2">
            {badge}
            {action}
          </div>
        </div>
      )}
      <div className="px-5 py-4">{children}</div>
    </Card>
  )
}

export default function PrioritiesCard({ tasks, projects, dispatch, onStartTask }) {
  const [picking, setPicking] = useState(false)
  const [search, setSearch] = useState('')
  const [showCelebration, setShowCelebration] = useState(false)
  const prevNotDoneRef = useRef(null)

  const todayAll = tasks.filter(t => t.today)
  const todayNotDone = todayAll.filter(t => t.status !== 'done')
  const todayDone = todayAll.filter(t => t.status === 'done')
  const tooMany = todayNotDone.length > 5

  useEffect(() => {
    if (
      todayAll.length > 0 &&
      todayNotDone.length === 0 &&
      prevNotDoneRef.current > 0
    ) {
      setShowCelebration(true)
      const end = Date.now() + 3000
      const colors = ['#a786ff', '#fd8bbc', '#eca184', '#f8deb1']
      const frame = () => {
        if (Date.now() > end) return
        confetti({ particleCount: 2, angle: 60,  spread: 55, startVelocity: 60, origin: { x: 0, y: 0.5 }, colors })
        confetti({ particleCount: 2, angle: 120, spread: 55, startVelocity: 60, origin: { x: 1, y: 0.5 }, colors })
        requestAnimationFrame(frame)
      }
      frame()
      setTimeout(() => setShowCelebration(false), 3000)
    }
    prevNotDoneRef.current = todayNotDone.length
  }, [todayNotDone.length, todayAll.length])

  const available = tasks.filter(t => !t.today && t.status !== 'done')
  const filtered = search
    ? available.filter(t => t.title.toLowerCase().includes(search.toLowerCase()))
    : available

  const byProject = projects
    .map(p => ({ ...p, items: filtered.filter(t => t.projectId === p.id) }))
    .filter(p => p.items.length > 0)
  const orphaned = filtered.filter(t => !projects.find(p => p.id === t.projectId))

  const sortedToday = [
    ...todayNotDone.sort((a, b) => (a.impact === 'high' ? -1 : 1) - (b.impact === 'high' ? -1 : 1)),
    ...todayDone,
  ]

  return (
    <div className="relative">
    {showCelebration && (
      <div
        className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-2xl"
        style={{ background: 'rgba(10,8,20,0.82)', backdropFilter: 'blur(8px)' }}
      >
        <p className="text-3xl font-bold text-[var(--text-primary)]" style={{ letterSpacing: '-0.02em' }}>Mission accomplie</p>
        <p className="text-4xl mt-2">🎉</p>
      </div>
    )}
    <WidgetCard
      title="Priorités du jour · 5 max"
      badge={
        <div className="flex items-center gap-1.5">
          {tooMany && (
            <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: 'var(--yellow-bg)', color: 'var(--yellow-deep)' }}>
              Trop chargé
            </span>
          )}
          <span className="text-xs font-mono" style={{ color: 'var(--text-tertiary)' }}>{todayDone.length}/{todayAll.length}</span>
        </div>
      }
      action={
        <Button
          size="icon-sm"
          onClick={() => { setPicking(p => !p); setSearch('') }}
          className="w-5 h-5 rounded-full"
          style={{ background: picking ? 'var(--violet-deep)' : 'var(--violet-bg)', color: picking ? '#fff' : 'var(--violet-deep)' }}
        >
          {picking ? <X size={10} /> : <Plus size={10} />}
        </Button>
      }
    >
      {/* Current today tasks */}
      {sortedToday.length === 0 && !picking ? (
        <p className="text-sm text-center py-4" style={{ color: 'var(--text-tertiary)' }}>
          Clique <strong>+</strong> pour choisir tes priorités du jour
        </p>
      ) : (
        <div className="flex flex-col gap-1">
          {sortedToday.map(task => {
            const project = projects.find(p => p.id === task.projectId)
            const isDone = task.status === 'done'
            return (
              <div
                key={task.id}
                className="flex items-center gap-3 py-1.5 px-1 rounded-xl group"
                style={{ opacity: isDone ? 0.5 : 1 }}
              >
                <Checkbox
                  checked={isDone}
                  onCheckedChange={() => dispatch({ type: 'TOGGLE_TASK_DONE', payload: task.id })}
                  className="flex-shrink-0"
                />
                {project && <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: project.color }} />}
                <span
                  className="flex-1 text-sm truncate"
                  style={{ color: 'var(--text-primary)', textDecoration: isDone ? 'line-through' : 'none' }}
                >
                  {task.title}
                </span>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {task.impact === 'high' && <Zap size={10} style={{ color: 'var(--yellow-deep)' }} />}
                  {task.ship80 && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium" style={{ background: 'var(--pink-bg)', color: 'var(--pink-deep)' }}>80%</span>
                  )}
                  {!isDone && (
                    <Button
                      size="xs"
                      onClick={() => onStartTask(task.projectId, task.id)}
                      className="text-[10px]"
                      style={{ background: 'var(--violet-bg)', color: 'var(--violet-deep)' }}
                    >
                      <Play size={9} /> Go
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => dispatch({ type: 'UPDATE_TASK', payload: { id: task.id, today: false } })}
                    className="h-auto w-auto p-0.5 rounded opacity-0 group-hover:opacity-100"
                    style={{ color: 'var(--text-tertiary)' }}
                    title="Retirer des priorités"
                  >
                    <X size={11} />
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Picker */}
      {picking && (
        <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--border-soft)' }}>
          <Input
            autoFocus
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Chercher une tâche..."
            className="mb-2"
          />
          {filtered.length === 0 ? (
            <p className="text-sm text-center py-3" style={{ color: 'var(--text-tertiary)' }}>
              {search ? 'Aucun résultat' : 'Toutes les tâches sont épinglées ou terminées'}
            </p>
          ) : (
            <div className="flex flex-col gap-0.5 max-h-52 overflow-y-auto">
              {byProject.map(p => (
                <div key={p.id} className="mb-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wide px-2 py-1" style={{ color: 'var(--text-tertiary)' }}>
                    {p.emoji} {p.name}
                  </p>
                  {p.items.map(task => (
                    <Button
                      type="button"
                      variant="ghost"
                      key={task.id}
                      onClick={() => dispatch({ type: 'UPDATE_TASK', payload: { id: task.id, today: true } })}
                      className="h-auto w-full justify-start gap-2 rounded-xl px-3 py-2 text-left text-sm"
                      style={{ color: 'var(--text-primary)' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--violet-bg)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <Plus size={10} style={{ color: 'var(--violet-deep)', flexShrink: 0 }} />
                      <span className="flex-1 truncate">{task.title}</span>
                      {task.impact === 'high' && <Zap size={10} style={{ color: 'var(--yellow-deep)', flexShrink: 0 }} />}
                      {task.ship80 && <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0" style={{ background: 'var(--pink-bg)', color: 'var(--pink-deep)' }}>80%</span>}
                    </Button>
                  ))}
                </div>
              ))}
              {orphaned.map(task => (
                <Button
                  type="button"
                  variant="ghost"
                  key={task.id}
                  onClick={() => dispatch({ type: 'UPDATE_TASK', payload: { id: task.id, today: true } })}
                  className="h-auto w-full justify-start gap-2 rounded-xl px-3 py-2 text-left text-sm"
                  style={{ color: 'var(--text-primary)' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--violet-bg)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <Plus size={10} style={{ color: 'var(--violet-deep)', flexShrink: 0 }} />
                  <span className="flex-1 truncate">{task.title}</span>
                </Button>
              ))}
            </div>
          )}
        </div>
      )}
    </WidgetCard>
    </div>
  )
}
