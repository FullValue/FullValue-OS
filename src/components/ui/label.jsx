import { cn } from '@/lib/utils'

export function Label({ className, children, ...props }) {
  return (
    <label
      className={cn('mb-1 block text-xs font-medium text-[var(--text-secondary)]', className)}
      {...props}
    >
      {children}
    </label>
  )
}
