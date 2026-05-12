import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import AuthLayout from './AuthLayout'

export default function LoginPage({ onNavigate }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error: err } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (err) setError(err.message)
    // on success, AuthContext fires onAuthStateChange → App rerenders automatically
  }

  return (
    <AuthLayout>
      <h1 className="text-xl font-semibold mb-6 text-center" style={{ color: 'var(--text-primary)' }}>
        Connexion
      </h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
            Email
          </label>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full rounded-lg px-3 py-2 text-sm outline-none"
            style={{
              background: 'var(--bg-input)',
              border: '1px solid var(--border-medium)',
              color: 'var(--text-primary)',
            }}
          />
        </div>

        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
            Mot de passe
          </label>
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full rounded-lg px-3 py-2 text-sm outline-none"
            style={{
              background: 'var(--bg-input)',
              border: '1px solid var(--border-medium)',
              color: 'var(--text-primary)',
            }}
          />
        </div>

        {error && (
          <p className="text-xs rounded-lg px-3 py-2" style={{ background: 'var(--red-bg)', color: 'var(--red-deep)' }}>
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg py-2.5 text-sm font-medium transition-opacity"
          style={{ background: 'var(--active-bg)', color: 'var(--active-text)', opacity: loading ? 0.6 : 1 }}
        >
          {loading ? 'Connexion…' : 'Se connecter'}
        </button>
      </form>

      <div className="mt-6 space-y-2 text-center text-sm" style={{ color: 'var(--text-tertiary)' }}>
        <button onClick={() => onNavigate('forgot')} className="hover:underline block w-full">
          Mot de passe oublié ?
        </button>
        <button onClick={() => onNavigate('signup')} className="hover:underline block w-full">
          Pas encore de compte ? Créer un compte
        </button>
      </div>
    </AuthLayout>
  )
}
