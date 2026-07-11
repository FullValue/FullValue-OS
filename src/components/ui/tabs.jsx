import { forwardRef } from 'react'
import * as TabsPrimitive from '@radix-ui/react-tabs'
import { cn } from '@/lib/utils'

export const Tabs = TabsPrimitive.Root

export const TabsList = forwardRef(function TabsList({ className, ...props }, ref) {
  return (
    <TabsPrimitive.List
      ref={ref}
      className={cn(
        'inline-flex h-9 items-center justify-center gap-0.5 rounded-xl bg-[rgba(var(--ink),0.05)] p-1',
        className
      )}
      {...props}
    />
  )
})

export const TabsTrigger = forwardRef(function TabsTrigger({ className, ...props }, ref) {
  return (
    <TabsPrimitive.Trigger
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1 text-sm font-medium text-[var(--text-tertiary)] transition-all',
        'hover:text-[var(--text-secondary)]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]',
        'data-[state=active]:bg-[var(--bg-card)] data-[state=active]:text-[var(--text-primary)] data-[state=active]:shadow-sm',
        'disabled:pointer-events-none disabled:opacity-50',
        className
      )}
      {...props}
    />
  )
})

export const TabsContent = forwardRef(function TabsContent({ className, ...props }, ref) {
  return (
    <TabsPrimitive.Content
      ref={ref}
      className={cn('mt-3 focus-visible:outline-none', className)}
      {...props}
    />
  )
})
