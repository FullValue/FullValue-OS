import { cva } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium leading-tight transition-colors whitespace-nowrap',
  {
    variants: {
      variant: {
        default: 'bg-[rgba(var(--ink),0.06)] text-[var(--text-secondary)]',
        violet: 'bg-[var(--violet-bg)] text-[var(--violet-deep)]',
        green: 'bg-[var(--green-bg)] text-[var(--green-deep)]',
        yellow: 'bg-[var(--yellow-bg)] text-[var(--yellow-deep)]',
        orange: 'bg-[var(--orange-bg)] text-[var(--orange-deep)]',
        red: 'bg-[var(--red-bg)] text-[var(--red-deep)]',
        blue: 'bg-[var(--blue-bg)] text-[var(--blue-deep)]',
        pink: 'bg-[var(--pink-bg)] text-[var(--pink-deep)]',
        outline: 'border border-[var(--border-medium)] text-[var(--text-secondary)]',
        solid: 'bg-[var(--active-bg)] text-[var(--active-text)]',
      },
    },
    defaultVariants: { variant: 'default' },
  }
)

/**
 * Badge shadcn-style avec variantes sémantiques.
 * <UIBadge variant="green">Terminé</UIBadge>
 */
export function UIBadge({ className, variant, dot, children, ...props }) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />}
      {children}
    </span>
  )
}

/**
 * Badge coloré à partir d'une valeur hex (tags, projets, clients).
 * Compat : conserve l'API par défaut { color, name, size } utilisée dans les vues.
 */
export default function Badge({ color, name, size = 'sm', className }) {
  const sizeClass = size === 'sm' ? 'text-[11px] px-2 py-0.5' : 'text-sm px-2.5 py-1'
  return (
    <span
      className={cn('inline-flex items-center gap-1.5 rounded-md font-medium', sizeClass, className)}
      style={{ backgroundColor: color + '1F', color, boxShadow: `inset 0 0 0 1px ${color}33` }}
    >
      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
      {name}
    </span>
  )
}

export { badgeVariants }
