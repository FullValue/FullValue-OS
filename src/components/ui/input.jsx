import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

export const Input = forwardRef(function Input({ className, type = 'text', ...props }, ref) {
  return (
    <input
      ref={ref}
      type={type}
      className={cn(
        'flex h-9 w-full rounded-xl border border-transparent bg-[var(--bg-input)] px-3 text-sm text-[var(--text-primary)] transition-all duration-150',
        'placeholder:text-[var(--text-tertiary)]',
        'focus:border-[var(--violet-deep)] focus:bg-[var(--bg-surface)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    />
  )
})
