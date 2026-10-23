/* eslint-disable react-refresh/only-export-components */
import { forwardRef } from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva } from 'class-variance-authority'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex select-none items-center justify-center gap-1.5 whitespace-nowrap rounded-full text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] disabled:pointer-events-none disabled:opacity-45 active:scale-[0.98]',
  {
    variants: {
      variant: {
        default: 'bg-[var(--accent)] text-[var(--on-accent)] shadow-[var(--shadow-control)] hover:bg-[var(--accent-hover)]',
        secondary: 'bg-[var(--active-bg)] text-[var(--active-text)] hover:opacity-90',
        ghost: 'bg-transparent text-[var(--text-secondary)] hover:bg-[rgba(var(--ink),0.05)] hover:text-[var(--text-primary)]',
        outline: 'border border-[var(--border-medium)] bg-[var(--bg-surface)] text-[var(--text-secondary)] shadow-[var(--shadow-control)] hover:bg-[var(--bg-card-soft)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]',
        danger: 'bg-[var(--red-bg)] text-[var(--red-deep)] hover:bg-[var(--red-solid)]',
        subtle: 'bg-[rgba(var(--ink),0.05)] text-[var(--text-secondary)] hover:bg-[rgba(var(--ink),0.09)] hover:text-[var(--text-primary)]',
      },
      size: {
        default: 'h-9 px-4',
        xs: 'h-6 gap-1 rounded-full px-2.5 text-xs',
        sm: 'h-8 rounded-full px-3.5 text-xs',
        lg: 'h-11 rounded-full px-6 text-base',
        icon: 'h-9 w-9 p-0',
        'icon-sm': 'h-7 w-7 rounded-full p-0',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export const Button = forwardRef(function Button(
  { className, variant, size, asChild, loading, disabled, children, ...props },
  ref
) {
  const Comp = asChild ? Slot : 'button'
  return (
    <Comp
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 size={14} className="animate-spin" />}
      {children}
    </Comp>
  )
})

export { buttonVariants }
