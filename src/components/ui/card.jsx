import { cn } from '@/lib/utils'

export function Card({ className, hover = false, children, ...props }) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-[var(--border-soft)] bg-[var(--bg-card)] shadow-[var(--shadow-card)] transition-shadow duration-200',
        hover && 'hover:shadow-[var(--shadow-card-hover)]',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardHeader({ className, children, ...props }) {
  return (
    <div className={cn('flex flex-col gap-0.5 px-5 pt-5 pb-3', className)} {...props}>
      {children}
    </div>
  )
}

export function CardContent({ className, children, ...props }) {
  return (
    <div className={cn('px-5 pb-5', className)} {...props}>
      {children}
    </div>
  )
}

export function CardFooter({ className, children, ...props }) {
  return (
    <div className={cn('flex items-center gap-2 px-5 pb-5 pt-1', className)} {...props}>
      {children}
    </div>
  )
}

export function CardTitle({ className, children, ...props }) {
  return (
    <h3
      className={cn('text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-tertiary)]', className)}
      {...props}
    >
      {children}
    </h3>
  )
}

export function CardDescription({ className, children, ...props }) {
  return (
    <p className={cn('text-sm text-[var(--text-secondary)]', className)} {...props}>
      {children}
    </p>
  )
}
