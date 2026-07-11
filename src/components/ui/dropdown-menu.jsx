import { forwardRef } from 'react'
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu'
import { Check, ChevronRight, Circle } from 'lucide-react'
import { cn } from '@/lib/utils'

export const DropdownMenu = DropdownMenuPrimitive.Root
export const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger
export const DropdownMenuGroup = DropdownMenuPrimitive.Group
export const DropdownMenuPortal = DropdownMenuPrimitive.Portal
export const DropdownMenuSub = DropdownMenuPrimitive.Sub
export const DropdownMenuRadioGroup = DropdownMenuPrimitive.RadioGroup

export const DropdownMenuContent = forwardRef(function DropdownMenuContent(
  { className, sideOffset = 6, ...props },
  ref
) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        ref={ref}
        sideOffset={sideOffset}
        className={cn(
          'z-[110] min-w-[10rem] overflow-hidden rounded-xl border border-[var(--border-soft)] bg-[var(--bg-surface)] p-1 shadow-[var(--shadow-float)] animate-popIn',
          className
        )}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  )
})

export const DropdownMenuItem = forwardRef(function DropdownMenuItem(
  { className, inset, destructive, ...props },
  ref
) {
  return (
    <DropdownMenuPrimitive.Item
      ref={ref}
      className={cn(
        'relative flex cursor-pointer select-none items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm outline-none transition-colors',
        destructive
          ? 'text-[var(--red-deep)] focus:bg-[var(--red-bg)]'
          : 'text-[var(--text-primary)] focus:bg-[rgba(var(--ink),0.06)]',
        'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        inset && 'pl-8',
        className
      )}
      {...props}
    />
  )
})

export const DropdownMenuCheckboxItem = forwardRef(function DropdownMenuCheckboxItem(
  { className, children, checked, ...props },
  ref
) {
  return (
    <DropdownMenuPrimitive.CheckboxItem
      ref={ref}
      checked={checked}
      className={cn(
        'relative flex cursor-pointer select-none items-center rounded-lg py-1.5 pl-8 pr-2 text-sm text-[var(--text-primary)] outline-none transition-colors focus:bg-[rgba(var(--ink),0.06)] data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        className
      )}
      {...props}
    >
      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
        <DropdownMenuPrimitive.ItemIndicator>
          <Check size={13} strokeWidth={2.5} className="text-[var(--violet-deep)]" />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownMenuPrimitive.CheckboxItem>
  )
})

export const DropdownMenuRadioItem = forwardRef(function DropdownMenuRadioItem(
  { className, children, ...props },
  ref
) {
  return (
    <DropdownMenuPrimitive.RadioItem
      ref={ref}
      className={cn(
        'relative flex cursor-pointer select-none items-center rounded-lg py-1.5 pl-8 pr-2 text-sm text-[var(--text-primary)] outline-none transition-colors focus:bg-[rgba(var(--ink),0.06)] data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        className
      )}
      {...props}
    >
      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
        <DropdownMenuPrimitive.ItemIndicator>
          <Circle size={7} className="fill-[var(--violet-deep)] text-[var(--violet-deep)]" />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownMenuPrimitive.RadioItem>
  )
})

export const DropdownMenuLabel = forwardRef(function DropdownMenuLabel(
  { className, inset, ...props },
  ref
) {
  return (
    <DropdownMenuPrimitive.Label
      ref={ref}
      className={cn(
        'px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]',
        inset && 'pl-8',
        className
      )}
      {...props}
    />
  )
})

export const DropdownMenuSeparator = forwardRef(function DropdownMenuSeparator(
  { className, ...props },
  ref
) {
  return (
    <DropdownMenuPrimitive.Separator
      ref={ref}
      className={cn('-mx-1 my-1 h-px bg-[var(--border-soft)]', className)}
      {...props}
    />
  )
})

export function DropdownMenuShortcut({ className, ...props }) {
  return <span className={cn('ml-auto text-[10px] tracking-wide text-[var(--text-tertiary)]', className)} {...props} />
}

export const DropdownMenuSubTrigger = forwardRef(function DropdownMenuSubTrigger(
  { className, inset, children, ...props },
  ref
) {
  return (
    <DropdownMenuPrimitive.SubTrigger
      ref={ref}
      className={cn(
        'flex cursor-pointer select-none items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm text-[var(--text-primary)] outline-none focus:bg-[rgba(var(--ink),0.06)] data-[state=open]:bg-[rgba(var(--ink),0.06)]',
        inset && 'pl-8',
        className
      )}
      {...props}
    >
      {children}
      <ChevronRight size={14} className="ml-auto text-[var(--text-tertiary)]" />
    </DropdownMenuPrimitive.SubTrigger>
  )
})

export const DropdownMenuSubContent = forwardRef(function DropdownMenuSubContent(
  { className, ...props },
  ref
) {
  return (
    <DropdownMenuPrimitive.SubContent
      ref={ref}
      className={cn(
        'z-[110] min-w-[9rem] overflow-hidden rounded-xl border border-[var(--border-soft)] bg-[var(--bg-surface)] p-1 shadow-[var(--shadow-float)] animate-popIn',
        className
      )}
      {...props}
    />
  )
})
