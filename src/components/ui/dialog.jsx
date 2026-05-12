import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

export const Dialog = DialogPrimitive.Root
export const DialogTrigger = DialogPrimitive.Trigger
export const DialogPortal = DialogPrimitive.Portal
export const DialogClose = DialogPrimitive.Close

export function DialogOverlay({ className, ...props }) {
  return (
    <DialogPrimitive.Overlay
      className={cn('fixed inset-0 z-50 bg-black/60 backdrop-blur-sm animate-fadeIn', className)}
      {...props}
    />
  )
}

export function DialogContent({ className, children, title, ...props }) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        className={cn(
          'fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg',
          'bg-surface border rounded-2xl shadow-2xl animate-fadeIn',
          'max-h-[90vh] overflow-y-auto',
          className
        )}
        style={{ borderColor: 'rgba(255,255,255,0.08)' }}
        {...props}
      >
        {children}
        <DialogPrimitive.Close className="absolute right-4 top-4 p-1.5 rounded-lg hover:bg-white/5 text-white/40 hover:text-white/80 transition-colors focus:outline-none focus:ring-2 focus:ring-violet/40">
          <X size={16} />
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPortal>
  )
}

export function DialogHeader({ className, children, ...props }) {
  return (
    <div className={cn('px-6 pt-6 pb-4 border-b', className)} style={{ borderColor: 'rgba(255,255,255,0.06)' }} {...props}>
      {children}
    </div>
  )
}

export function DialogTitle({ className, children, ...props }) {
  return (
    <DialogPrimitive.Title className={cn('text-base font-semibold text-white', className)} {...props}>
      {children}
    </DialogPrimitive.Title>
  )
}

export function DialogBody({ className, children, ...props }) {
  return (
    <div className={cn('px-6 py-5', className)} {...props}>
      {children}
    </div>
  )
}
