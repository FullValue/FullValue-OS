import { cn } from '@/lib/utils'

/**
 * État vide composé : icône, titre, description, action.
 * <EmptyState icon={Inbox} title="Inbox vide" description="…" action={<Button…/>} />
 */
export function EmptyState({ icon: Icon, title, description, action, className, compact = false, ...props }) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        compact ? 'gap-2 px-4 py-8' : 'gap-3 px-6 py-14',
        className
      )}
      {...props}
    >
      {Icon && (
        <div
          className={cn(
            'flex items-center justify-center rounded-2xl border border-[var(--border-soft)] bg-[var(--bg-card-soft)]',
            compact ? 'h-10 w-10' : 'h-12 w-12'
          )}
        >
          <Icon size={compact ? 18 : 22} className="text-[var(--text-tertiary)]" strokeWidth={1.5} />
        </div>
      )}
      <div className="flex flex-col gap-1">
        <p className={cn('font-medium text-[var(--text-primary)]', compact ? 'text-sm' : 'text-base')}>{title}</p>
        {description && (
          <p className="mx-auto max-w-[38ch] text-sm text-[var(--text-tertiary)]">{description}</p>
        )}
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  )
}
