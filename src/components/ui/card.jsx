import { cn } from '@/lib/utils'

export function Card({ className, children, ...props }) {
  return (
    <div
      className={cn('bg-card border rounded-2xl', className)}
      style={{ borderColor: 'rgba(255,255,255,0.06)', ...props.style }}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardHeader({ className, children, ...props }) {
  return (
    <div className={cn('px-5 pt-5 pb-3', className)} {...props}>
      {children}
    </div>
  )
}

export function CardContent({ className, children, ...props }) {
  return (
    <div className={cn('px-5 pb-5', className)} {...props}>
      {children}
    </div>
  )
}

export function CardTitle({ className, children, ...props }) {
  return (
    <h3 className={cn('text-sm font-semibold text-white/70 uppercase tracking-wider', className)} {...props}>
      {children}
    </h3>
  )
}
