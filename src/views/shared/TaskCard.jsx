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
        background: 'var(--c-card)',
        border: `1px solid ${isOverdue ? '#F8717130' : 'var(--c-border)'}`,
        borderRadius: 10,
        padding: compact ? '8px 10px' : '10px 12px',
        cursor: onClick ? 'pointer' : 'default',
        opacity: isDone ? 0.55 : 1,
        overflow: 'hidden',
        ...style,
      }}
      className={`group transition-all hover:border-white/15 ${className}`}
      {...dragHandleProps}
    >
      {/* Header row */}
      <div className="flex items-start gap-2">
        {project && (
          <span className="w-2 h-2 rounded-full flex-shrink-0 mt-1" style={{ background: project.color }} />
        )}
        <p className={`flex-1 text-[13px] font-medium leading-snug ${isDone ? 'line-through text-white/35' : 'text-white/85'}`} style={{ display: '-webkit-box', WebkitLineClamp: compact ? 2 : 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {task.title}
        </p>
      </div>

      {/* Badges row */}
      {!compact && (
        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
          <ImpactBadge impact={task.impact} />
          {task.ship80 && !task.ship80Delivered && <Ship80Badge />}
          {(task.tags || []).slice(0, 2).map(tag => {
            const col = getTagColor(tagStyles, tag)
            return (
              <span
                key={tag}
                style={{ background: col.bg, color: col.text, fontSize: 10, padding: '1px 6px', borderRadius: 4, fontWeight: 500 }}
              >
                {tag}
              </span>
            )
          })}
          <div className="ml-auto flex items-center gap-2">
            {commentsCount > 0 && (
              <span className="flex items-center gap-0.5 text-[10px] text-white/35">
                <MessageSquare size={10} />{commentsCount}
              </span>
            )}
            {attachmentsCount > 0 && (
              <span className="flex items-center gap-0.5 text-[10px] text-white/35">
                <Paperclip size={10} />{attachmentsCount}
              </span>
            )}
            <DueDateBadge dueDate={task.dueDate} />
          </div>
        </div>
      )}

      {/* Progress bar */}
      {!compact && hasProgress && (
        <div style={{ height: 2, background: 'var(--c-border)', borderRadius: 1, marginTop: 8, marginBottom: -2, marginLeft: -12, marginRight: -12 }}>
          <div style={{ height: '100%', width: `${progress}%`, background: progress >= 80 ? '#A8E6BD' : progress >= 40 ? '#8B7CFF' : '#FFD66B', borderRadius: 1, transition: 'width 0.3s' }} />
        </div>
      )}
    </div>
  )
}
