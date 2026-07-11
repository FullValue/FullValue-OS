import { forwardRef } from 'react'
import * as AvatarPrimitive from '@radix-ui/react-avatar'
import { cn } from '@/lib/utils'

export const Avatar = forwardRef(function Avatar({ className, ...props }, ref) {
  return (
    <AvatarPrimitive.Root
      ref={ref}
      className={cn('relative flex h-8 w-8 shrink-0 overflow-hidden rounded-xl', className)}
      {...props}
    />
  )
})

export const AvatarImage = forwardRef(function AvatarImage({ className, ...props }, ref) {
  return (
    <AvatarPrimitive.Image
      ref={ref}
      className={cn('aspect-square h-full w-full object-cover', className)}
      {...props}
    />
  )
})

export const AvatarFallback = forwardRef(function AvatarFallback(
  { className, color, ...props },
  ref
) {
  return (
    <AvatarPrimitive.Fallback
      ref={ref}
      className={cn(
        'flex h-full w-full items-center justify-center rounded-[inherit] bg-[var(--violet-bg)] text-xs font-semibold text-[var(--violet-deep)]',
        className
      )}
      style={color ? { background: color + '22', color } : undefined}
      {...props}
    />
  )
})
