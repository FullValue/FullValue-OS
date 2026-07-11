import { forwardRef } from 'react'
import * as SelectPrimitive from '@radix-ui/react-select'
import { Check, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'

export const Select = SelectPrimitive.Root
export const SelectGroup = SelectPrimitive.Group
export const SelectValue = SelectPrimitive.Value

export const SelectTrigger = forwardRef(function SelectTrigger(
  { className, children, ...props },
  ref
) {
  return (
    <SelectPrimitive.Trigger
      ref={ref}
      className={cn(
        'flex h-9 w-full items-center justify-between gap-2 rounded-xl border border-transparent bg-[var(--bg-input)] px-3 text-sm text-[var(--text-primary)] transition-all',
        'placeholder:text-[var(--text-tertiary)] data-[placeholder]:text-[var(--text-tertiary)]',
        'focus:border-[var(--violet-deep)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]',
        'disabled:cursor-not-allowed disabled:opacity-50 [&>span]:truncate',
        className
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDown size={14} className="shrink-0 text-[var(--text-tertiary)]" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  )
})

export const SelectContent = forwardRef(function SelectContent(
  { className, children, position = 'popper', ...props },
  ref
) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        ref={ref}
        position={position}
        className={cn(
          'relative z-[120] max-h-[min(24rem,var(--radix-select-content-available-height))] min-w-[8rem] overflow-hidden rounded-xl border border-[var(--border-soft)] bg-[var(--bg-surface)] shadow-[var(--shadow-float)] animate-popIn',
          position === 'popper' && 'w-full min-w-[var(--radix-select-trigger-width)]',
          className
        )}
        sideOffset={5}
        {...props}
      >
        <SelectPrimitive.ScrollUpButton className="flex h-6 cursor-default items-center justify-center text-[var(--text-tertiary)]">
          <ChevronUp size={14} />
        </SelectPrimitive.ScrollUpButton>
        <SelectPrimitive.Viewport className="p-1">{children}</SelectPrimitive.Viewport>
        <SelectPrimitive.ScrollDownButton className="flex h-6 cursor-default items-center justify-center text-[var(--text-tertiary)]">
          <ChevronDown size={14} />
        </SelectPrimitive.ScrollDownButton>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  )
})

export const SelectLabel = forwardRef(function SelectLabel({ className, ...props }, ref) {
  return (
    <SelectPrimitive.Label
      ref={ref}
      className={cn('px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]', className)}
      {...props}
    />
  )
})

export const SelectItem = forwardRef(function SelectItem(
  { className, children, ...props },
  ref
) {
  return (
    <SelectPrimitive.Item
      ref={ref}
      className={cn(
        'relative flex w-full cursor-pointer select-none items-center rounded-lg py-1.5 pl-2.5 pr-8 text-sm text-[var(--text-primary)] outline-none transition-colors',
        'focus:bg-[rgba(var(--ink),0.06)]',
        'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        className
      )}
      {...props}
    >
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
      <span className="absolute right-2 flex h-3.5 w-3.5 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <Check size={13} strokeWidth={2.5} className="text-[var(--violet-deep)]" />
        </SelectPrimitive.ItemIndicator>
      </span>
    </SelectPrimitive.Item>
  )
})

export const SelectSeparator = forwardRef(function SelectSeparator({ className, ...props }, ref) {
  return (
    <SelectPrimitive.Separator
      ref={ref}
      className={cn('-mx-1 my-1 h-px bg-[var(--border-soft)]', className)}
      {...props}
    />
  )
})

/**
 * Select natif stylé — migration rapide des <select> existants sans changer la logique.
 * Même API qu'un <select> HTML.
 */
export const NativeSelect = forwardRef(function NativeSelect({ className, children, ...props }, ref) {
  return (
    <div className="relative">
      <select
        ref={ref}
        className={cn(
          'h-9 w-full cursor-pointer appearance-none rounded-xl border border-transparent bg-[var(--bg-input)] pl-3 pr-8 text-sm text-[var(--text-primary)] transition-all',
          'focus:border-[var(--violet-deep)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        size={14}
        className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]"
      />
    </div>
  )
})
