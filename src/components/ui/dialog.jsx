import { forwardRef } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

export const Dialog = DialogPrimitive.Root
export const DialogTrigger = DialogPrimitive.Trigger
export const DialogPortal = DialogPrimitive.Portal
export const DialogClose = DialogPrimitive.Close

export const DialogOverlay = forwardRef(function DialogOverlay({ className, ...props }, ref) {
  return (
    <DialogPrimitive.Overlay
      ref={ref}
      className={cn('fixed inset-0 z-[90] bg-black/40 backdrop-blur-[2px] animate-overlayShow', className)}
      {...props}
    />
  )
})

export const DialogContent = forwardRef(function DialogContent(
  { className, children, hideClose = false, ...props },
  ref
) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          'fixed left-1/2 top-1/2 z-[95] w-full max-w-lg -translate-x-1/2 -translate-y-1/2',
          'rounded-2xl border border-[var(--border-soft)] bg-[var(--bg-surface)] shadow-[var(--shadow-modal)]',
          'max-h-[88dvh] overflow-y-auto',
          'data-[state=open]:animate-contentShow data-[state=closed]:animate-contentHide',
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
    </DialogPortal>
  )
})

export function DialogHeader({ className, children, ...props }) {
  return (
    <div className={cn('border-b border-[var(--border-soft)] px-6 pb-4 pt-6', className)} {...props}>
      {children}
    </div>
  )
}

export const DialogTitle = forwardRef(function DialogTitle({ className, children, ...props }, ref) {
  return (
    <DialogPrimitive.Title
      ref={ref}
      className={cn('text-base font-semibold text-[var(--text-primary)]', className)}
      {...props}
    >
      {children}
    </DialogPrimitive.Title>
  )
})

export const DialogDescription = forwardRef(function DialogDescription(
  { className, ...props },
  ref
) {
  return (
    <DialogPrimitive.Description
      ref={ref}
      className={cn('mt-0.5 text-sm text-[var(--text-secondary)]', className)}
      {...props}
    />
  )
})

export function DialogBody({ className, children, ...props }) {
  return (
    <div className={cn('px-6 py-5', className)} {...props}>
      {children}
    </div>
  )
}

export function DialogFooter({ className, children, ...props }) {
  return (
    <div
      className={cn('flex items-center justify-end gap-2 border-t border-[var(--border-soft)] px-6 py-4', className)}
      {...props}
    >
      {children}
    </div>
  )
}
