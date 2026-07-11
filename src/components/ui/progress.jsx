import { forwardRef } from 'react'
import * as ProgressPrimitive from '@radix-ui/react-progress'
import { cn } from '@/lib/utils'

export const Progress = forwardRef(function Progress(
  { className, value = 0, color, ...props },
  ref
) {
  return (
    <ProgressPrimitive.Root
      ref={ref}
      className={cn('relative h-1.5 w-full overflow-hidden rounded-full bg-[rgba(var(--ink),0.08)]', className)}
      value={value}
      {...props}
    >
      <ProgressPrimitive.Indicator
        className="h-full w-full flex-1 rounded-full transition-transform duration-500 ease-out"
        style={{
          transform: `translateX(-${100 - Math.min(100, Math.max(0, value))}%)`,
          background: color || 'var(--violet-deep)',
        }}
      />
    </ProgressPrimitive.Root>
  )
})

/**
 * Anneau de progression SVG — pour le score de journée, north stars, etc.
 * <ProgressRing value={64} size={44} strokeWidth={4} color="var(--green-deep)" />
 */
export function ProgressRing({ value = 0, size = 44, strokeWidth = 4, color = 'var(--violet-deep)', trackColor = 'rgba(var(--ink),0.08)', children, className }) {
  const clamped = Math.min(100, Math.max(0, value))
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - clamped / 100)
  return (
    <div className={cn('relative inline-flex items-center justify-center', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={trackColor} strokeWidth={strokeWidth} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.6s cubic-bezier(0.16, 1, 0.3, 1)' }}
        />
      </svg>
      {children && <div className="absolute inset-0 flex items-center justify-center">{children}</div>}
    </div>
  )
}
