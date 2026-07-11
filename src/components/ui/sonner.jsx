import { Toaster as SonnerToaster } from 'sonner'

/**
 * Toaster global — stylé sur les tokens du Cockpit, suit le thème via prop.
 */
export function Toaster({ theme = 'light', ...props }) {
  return (
    <SonnerToaster
      theme={theme}
      position="bottom-right"
      offset={20}
      gap={8}
      toastOptions={{
        style: {
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-soft)',
          borderRadius: 14,
          boxShadow: 'var(--shadow-float)',
          color: 'var(--text-primary)',
          fontFamily: 'var(--font-sans)',
          fontSize: 13,
        },
        classNames: {
          actionButton: '!bg-[var(--active-bg)] !text-[var(--active-text)] !rounded-lg !text-xs !font-medium',
          cancelButton: '!bg-[rgba(var(--ink),0.06)] !text-[var(--text-secondary)] !rounded-lg !text-xs',
          description: '!text-[var(--text-secondary)]',
        },
      }}
      {...props}
    />
  )
}
