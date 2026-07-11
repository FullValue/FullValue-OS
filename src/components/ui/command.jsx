import { forwardRef } from 'react'
import { Command as CommandPrimitive } from 'cmdk'
import { Search } from 'lucide-react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

export const Command = forwardRef(function Command({ className, ...props }, ref) {
  return (
    <CommandPrimitive
      ref={ref}
      className={cn('flex h-full w-full flex-col overflow-hidden rounded-2xl bg-[var(--bg-surface)]', className)}
      {...props}
    />
  )
})

export function CommandDialog({ children, ...props }) {
  return (
    <Dialog {...props}>
      <DialogContent hideClose className="top-[18%] max-w-xl translate-y-0 overflow-hidden p-0 data-[state=open]:animate-contentShow">
        <Command
          className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pb-1.5 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.08em] [&_[cmdk-group-heading]]:text-[var(--text-tertiary)]"
          loop
        >
          {children}
        </Command>
      </DialogContent>
    </Dialog>
  )
}

export const CommandInput = forwardRef(function CommandInput({ className, ...props }, ref) {
  return (
    <div className="flex items-center gap-2.5 border-b border-[var(--border-soft)] px-4" cmdk-input-wrapper="">
      <Search size={16} className="shrink-0 text-[var(--text-tertiary)]" />
      <CommandPrimitive.Input
        ref={ref}
        className={cn(
          'flex h-12 w-full bg-transparent text-[15px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)] disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        {...props}
      />
    </div>
  )
})

export const CommandList = forwardRef(function CommandList({ className, ...props }, ref) {
  return (
    <CommandPrimitive.List
      ref={ref}
      className={cn('max-h-[380px] overflow-y-auto overscroll-contain px-1.5 pb-2', className)}
      {...props}
    />
  )
})

export const CommandEmpty = forwardRef(function CommandEmpty({ className, ...props }, ref) {
  return (
    <CommandPrimitive.Empty
      ref={ref}
      className={cn('py-8 text-center text-sm text-[var(--text-tertiary)]', className)}
      {...props}
    />
  )
})

export const CommandGroup = forwardRef(function CommandGroup({ className, ...props }, ref) {
  return (
    <CommandPrimitive.Group ref={ref} className={cn('overflow-hidden', className)} {...props} />
  )
})

export const CommandSeparator = forwardRef(function CommandSeparator({ className, ...props }, ref) {
  return (
    <CommandPrimitive.Separator
      ref={ref}
      className={cn('-mx-1.5 my-1 h-px bg-[var(--border-soft)]', className)}
      {...props}
    />
  )
})

export const CommandItem = forwardRef(function CommandItem({ className, ...props }, ref) {
  return (
    <CommandPrimitive.Item
      ref={ref}
      className={cn(
        'relative flex cursor-pointer select-none items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm text-[var(--text-primary)] outline-none transition-colors',
        'data-[selected=true]:bg-[rgba(var(--ink),0.06)]',
        'data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50',
        className
      )}
      {...props}
    />
  )
})

export function CommandShortcut({ className, ...props }) {
  return (
    <span
      className={cn('ml-auto font-mono text-[10px] tracking-wide text-[var(--text-tertiary)]', className)}
      {...props}
    />
  )
}
