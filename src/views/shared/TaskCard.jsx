import { ImpactBadge, Ship80Badge, DueDateBadge } from './TaskBadge'
import { useStore } from '@/store/useStore'
import { getTagColor, computeProgress } from './taskColors'
import { MessageSquare, Paperclip } from 'lucide-react'

export default function TaskCard({ task, project, style, className = '', onClick, dragHandleProps = {}, compact = false }) {
  const { state } = useStore()
  const tagStyles = state.tagStyles || {}
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'done'
  const isDone = task.status === 'done'
  const progress = computeProgress(task)
  const hasProgress = progress > 0
  const commentsCount = task.commentsCount || 0
  const attachmentsCount = task.attachmentsCount || 0

  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--bg-card)',
        border: `1px solid ${isOverdue ? 'var(--red-solid)' : 'var(--border-soft)'}`,
        borderRadius: 12,
        padding: compact ? '9px 11px' : '11px 13px',
        cursor: onClick ? 'pointer' : 'default',
        opacity: isDone ? 0.55 : 1,
        overflow: 'hidden',
        boxShadow: 'var(--shadow-card)',
        ...style,
      }}
      className={`group transition-all duration-150 hover:-translate-y-px hover:shadow-[var(--shadow-card-hover)] ${className}`}
      {...dragHandleProps}
    >
      {/* Header row */}
      <div className="flex items-start gap-2">
        {project && (
          <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full" style={{ background: project.color }} />
        )}
        <p
          className={`flex-1 text-[13px] font-medium leading-snug ${isDone ? 'text-[var(--text-tertiary)] line-through' : 'text-[var(--text-primary)]'}`}
          style={{ display: '-webkit-box', WebkitLineClamp: compact ? 2 : 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
        >
          {task.title}
        </p>
      </div>

      {/* Badges row */}
      {!compact && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <ImpactBadge impact={task.impact} />
          {task.ship80 && !task.ship80Delivered && <Ship80Badge />}
          {(task.tags || []).slice(0, 2).map(tag => {
            const col = getTagColor(tagStyles, tag)
            return (
              <span
                key={tag}
                style={{ background: col.bg, color: col.text, fontSize: 10, padding: '1px 6px', borderRadius: 5, fontWeight: 500 }}
              >
                {tag}
              </span>
            )
          })}
          <div className="ml-auto flex items-center gap-2">
            {commentsCount > 0 && (
              <span className="flex items-center gap-0.5 text-[10px] text-[var(--text-tertiary)]">
                <MessageSquare size={10} />{commentsCount}
              </span>
            )}
            {attachmentsCount > 0 && (
              <span className="flex items-center gap-0.5 text-[10px] text-[var(--text-tertiary)]">
                <Paperclip size={10} />{attachmentsCount}
              </span>
            )}
            <DueDateBadge dueDate={task.dueDate} />
          </div>
        </div>
      )}

      {/* Progress bar */}
      {!compact && hasProgress && (
        <div style={{ height: 3, background: 'rgba(var(--ink),0.08)', borderRadius: 2, marginTop: 8, marginBottom: -2, marginLeft: -13, marginRight: -13 }}>
          <div style={{ height: '100%', width: `${progress}%`, background: progress >= 80 ? 'var(--green-deep)' : progress >= 40 ? 'var(--violet-deep)' : 'var(--yellow-deep)', borderRadius: 2, transition: 'width 0.4s cubic-bezier(0.16,1,0.3,1)' }} />
        </div>
      )}
    </div>
  )
}
