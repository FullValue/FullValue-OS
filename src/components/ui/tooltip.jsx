import { forwardRef } from 'react'
import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import { cn } from '@/lib/utils'

export const TooltipProvider = TooltipPrimitive.Provider
export const Tooltip = TooltipPrimitive.Root
export const TooltipTrigger = TooltipPrimitive.Trigger

export const TooltipContent = forwardRef(function TooltipContent(
  { className, sideOffset = 6, ...props },
  ref
) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        ref={ref}
        sideOffset={sideOffset}
        className={cn(
          'z-[120] overflow-hidden rounded-lg bg-[var(--active-bg)] px-2.5 py-1.5 text-xs font-medium text-[var(--active-text)] shadow-md animate-popIn select-none',
          className
        )}
        {...props}
      />
    </TooltipPrimitive.Portal>
  )
})

/**
 * Raccourci : <SimpleTooltip label="Supprimer" side="top"><Button…/></SimpleTooltip>
 */
export function SimpleTooltip({ label, side = 'top', shortcut, children }) {
  if (!label) return children
  return (
    <Tooltip delayDuration={350}>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side={side}>
        <span className="inline-flex items-center gap-1.5">
          {label}
          {shortcut && (
            <span className="rounded bg-[rgba(255,255,255,0.18)] px-1 font-mono text-[9px] leading-4">
              {shortcut}
            </span>
          )}
        </span>
      </TooltipContent>
    </Tooltip>
  )
}
