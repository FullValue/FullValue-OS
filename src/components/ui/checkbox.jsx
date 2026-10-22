import { forwardRef } from 'react'
import * as CheckboxPrimitive from '@radix-ui/react-checkbox'
import { Check, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'

export const Checkbox = forwardRef(function Checkbox({ className, ...props }, ref) {
  return (
    <CheckboxPrimitive.Root
      ref={ref}
      className={cn(
        'peer h-[18px] w-[18px] shrink-0 rounded-md border border-[var(--border-strong)] bg-transparent transition-all duration-150',
        'hover:border-[var(--accent)]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'data-[state=checked]:border-[var(--accent)] data-[state=checked]:bg-[var(--accent)] data-[state=checked]:text-[var(--on-accent)]',
        'data-[state=indeterminate]:border-[var(--accent)] data-[state=indeterminate]:bg-[var(--accent)] data-[state=indeterminate]:text-[var(--on-accent)]',
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="flex items-center justify-center text-current">
        {props.checked === 'indeterminate' ? <Minus size={12} strokeWidth={3} /> : <Check size={12} strokeWidth={3} />}
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
})
