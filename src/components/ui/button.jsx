import { cn } from '@/lib/utils'
import { Slot } from '@radix-ui/react-slot'
import { cva } from 'class-variance-authority'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-1.5 rounded-lg text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-violet/40 disabled:opacity-40 disabled:cursor-not-allowed',
  {
    variants: {
      variant: {
        default: 'bg-violet hover:bg-violet/90 text-white',
        ghost: 'bg-transparent hover:bg-white/5 text-white/60 hover:text-white/90',
        outline: 'border bg-transparent hover:bg-white/5 text-white/70',
        danger: 'bg-red/15 hover:bg-red/25 text-red',
        subtle: 'bg-white/5 hover:bg-white/10 text-white/60 hover:text-white/90',
      },
      size: {
        default: 'px-4 py-2',
        sm: 'px-3 py-1.5 text-xs',
        lg: 'px-6 py-3 text-base',
        icon: 'p-2',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export function Button({ className, variant, size, asChild, children, ...props }) {
  const Comp = asChild ? Slot : 'button'
  return (
    <Comp className={cn(buttonVariants({ variant, size }), className)} {...props}>
      {children}
    </Comp>
  )
}
