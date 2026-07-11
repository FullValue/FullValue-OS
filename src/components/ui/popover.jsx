import { forwardRef } from 'react'
import * as PopoverPrimitive from '@radix-ui/react-popover'
import { cn } from '@/lib/utils'

export const Popover = PopoverPrimitive.Root
export const PopoverTrigger = PopoverPrimitive.Trigger
export const PopoverAnchor = PopoverPrimitive.Anchor
export const PopoverClose = PopoverPrimitive.Close

export const PopoverContent = forwardRef(function PopoverContent(
  { className, align = 'center', sideOffset = 6, ...props },
  ref
) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        ref={ref}
        align={align}
        sideOffset={sideOffset}
        className={cn(
          'z-[110] w-72 rounded-xl border border-[var(--border-soft)] bg-[var(--bg-surface)] p-4 shadow-[var(--shadow-float)] outline-none animate-popIn',
          className
        )}
        {...props}
      />
    </PopoverPrimitive.Portal>
  )
})
