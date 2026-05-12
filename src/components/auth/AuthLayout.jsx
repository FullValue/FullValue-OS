export default function AuthLayout({ children }) {
  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'var(--bg-page)' }}
    >
      <div
        className="w-full max-w-sm rounded-2xl p-8"
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-soft)',
          boxShadow: 'var(--shadow-float)',
        }}
      >
        <div className="mb-8 text-center">
          <span className="text-2xl">✦</span>
          <p className="mt-1 text-sm font-medium" style={{ color: 'var(--text-tertiary)' }}>
            Le Cockpit
          </p>
        </div>
        {children}
      </div>
    </div>
  )
}
