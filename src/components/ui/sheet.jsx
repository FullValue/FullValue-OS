/* eslint-disable react-refresh/only-export-components */
import { forwardRef } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Sheet — panneau latéral (Radix Dialog). Pour l'édition inline sans modale centrale.
 */
export const Sheet = DialogPrimitive.Root
export const SheetTrigger = DialogPrimitive.Trigger
export const SheetClose = DialogPrimitive.Close
export const SheetPortal = DialogPrimitive.Portal

export const SheetOverlay = forwardRef(function SheetOverlay({ className, ...props }, ref) {
  return (
    <DialogPrimitive.Overlay
      ref={ref}
      className={cn('fixed inset-0 z-[90] bg-black/40 backdrop-blur-[2px] animate-overlayShow', className)}
      {...props}
    />
  )
})

const SIDES = {
  right: 'inset-y-0 right-0 h-full w-full max-w-md border-l data-[state=open]:animate-sheetIn data-[state=closed]:animate-sheetOut sm:rounded-l-2xl',
  left: 'inset-y-0 left-0 h-full w-full max-w-md border-r sm:rounded-r-2xl data-[state=open]:animate-[sheetInLeft_0.28s_cubic-bezier(0.32,0.72,0,1)]',
  bottom: 'inset-x-0 bottom-0 max-h-[92dvh] rounded-t-2xl border-t data-[state=open]:animate-slideUp',
}

export const SheetContent = forwardRef(function SheetContent(
  { className, side = 'right', children, hideClose = false, ...props },
  ref
) {
  return (
    <SheetPortal>
      <SheetOverlay />
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          'fixed z-[95] flex flex-col gap-0 overflow-y-auto border-[var(--border-soft)] bg-[var(--bg-surface)] shadow-[var(--shadow-modal)]',
          SIDES[side] || SIDES.right,
          className
        )}
        {...props}
      >
        {children}
        {!hideClose && (
          <DialogPrimitive.Close className="absolute right-4 top-4 rounded-lg p-1.5 text-[var(--text-tertiary)] transition-colors hover:bg-[rgba(var(--ink),0.06)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]">
            <X size={16} />
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </SheetPortal>
  )
})

export function SheetHeader({ className, children, ...props }) {
  return (
    <div className={cn('border-b border-[var(--border-soft)] px-6 pb-4 pt-6', className)} {...props}>
      {children}
    </div>
  )
}

export const SheetTitle = forwardRef(function SheetTitle({ className, ...props }, ref) {
  return (
    <DialogPrimitive.Title
      ref={ref}
      className={cn('text-base font-semibold text-[var(--text-primary)]', className)}
      {...props}
    />
  )
})

export const SheetDescription = forwardRef(function SheetDescription({ className, ...props }, ref) {
  return (
    <DialogPrimitive.Description
      ref={ref}
      className={cn('text-sm text-[var(--text-secondary)]', className)}
      {...props}
    />
  )
})

export function SheetBody({ className, children, ...props }) {
  return (
    <div className={cn('flex-1 px-6 py-5', className)} {...props}>
      {children}
    </div>
  )
}

export function SheetFooter({ className, children, ...props }) {
  return (
    <div className={cn('sticky bottom-0 flex items-center justify-end gap-2 border-t border-[var(--border-soft)] bg-[var(--bg-surface)] px-6 py-4', className)} {...props}>
      {children}
    </div>
  )
}
