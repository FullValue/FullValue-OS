/* eslint-disable react-refresh/only-export-components */
import { forwardRef } from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva } from 'class-variance-authority'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex select-none items-center justify-center gap-1.5 whitespace-nowrap rounded-xl text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] disabled:pointer-events-none disabled:opacity-45 active:scale-[0.98]',
  {
    variants: {
      variant: {
        default: 'bg-[var(--violet-deep)] text-[var(--text-inverse)] shadow-sm hover:bg-[#7A6BF0]',
        secondary: 'bg-[var(--active-bg)] text-[var(--active-text)] hover:opacity-88',
        ghost: 'bg-transparent text-[var(--text-secondary)] hover:bg-[rgba(var(--ink),0.05)] hover:text-[var(--text-primary)]',
        outline: 'border border-[var(--border-medium)] bg-transparent text-[var(--text-secondary)] hover:bg-[rgba(var(--ink),0.04)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]',
        danger: 'bg-[var(--red-bg)] text-[var(--red-deep)] hover:bg-[var(--red-solid)]',
        subtle: 'bg-[rgba(var(--ink),0.05)] text-[var(--text-secondary)] hover:bg-[rgba(var(--ink),0.09)] hover:text-[var(--text-primary)]',
      },
      size: {
        default: 'h-9 px-4',
        xs: 'h-6 gap-1 rounded-lg px-2 text-xs',
        sm: 'h-8 rounded-lg px-3 text-xs',
        lg: 'h-11 rounded-xl px-6 text-base',
        icon: 'h-9 w-9 p-0',
        'icon-sm': 'h-7 w-7 rounded-lg p-0',
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
