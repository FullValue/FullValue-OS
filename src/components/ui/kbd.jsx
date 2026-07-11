import { cn } from '@/lib/utils'

export function Kbd({ className, children, ...props }) {
  return (
    <kbd
      className={cn('inline-flex min-w-[18px] items-center justify-center', className)}
      {...props}
    >
      {children}
    </kbd>
  )
}
