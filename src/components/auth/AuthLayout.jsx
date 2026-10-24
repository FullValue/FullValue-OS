import AppearanceMenu from '@/components/ui/AppearanceMenu'

export default function AuthLayout({ children }) {
  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'var(--bg-page)' }}
    >
      <div className="fixed right-4 top-4 z-40"><AppearanceMenu className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--bg-card)] text-[var(--text-secondary)] shadow-[var(--shadow-card)] hover:text-[var(--text-primary)]" /></div>
      <div
        className="w-full max-w-sm rounded-[26px] p-8"
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-soft)',
          boxShadow: 'var(--shadow-float)',
        }}
      >
        <div className="mb-8 text-center">
          <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full" style={{ border: '3px solid var(--accent)' }}>
            <span className="h-4 w-4 rounded-full" style={{ background: 'var(--accent)' }} />
          </span>
          <p className="mt-2 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            Cockpit
          </p>
        </div>
        {children}
      </div>
    </div>
  )
}
