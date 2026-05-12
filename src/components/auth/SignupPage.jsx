import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import AuthLayout from './AuthLayout'

export default function SignupPage({ onNavigate }) {
  const [fullName, setFullName] = useState('')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (password !== confirm) { setError('Les mots de passe ne correspondent pas.'); return }
    if (password.length < 6)  { setError('Le mot de passe doit contenir au moins 6 caractères.'); return }
    setLoading(true)
    const { error: err } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    })
    setLoading(false)
    if (err) { setError(err.message); return }
    onNavigate('check-email')
  }

  return (
    <AuthLayout>
      <h1 className="text-xl font-semibold mb-6 text-center" style={{ color: 'var(--text-primary)' }}>
        Créer un compte
      </h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
            Nom complet
          </label>
          <input
            type="text"
            required
            autoComplete="name"
            value={fullName}
            onChange={e => setFullName(e.target.value)}
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
            autoComplete="new-password"
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

        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
            Confirmer le mot de passe
          </label>
          <input
            type="password"
            required
            autoComplete="new-password"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
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
          {loading ? 'Création…' : 'Créer mon compte'}
        </button>
      </form>

      <div className="mt-6 text-center text-sm" style={{ color: 'var(--text-tertiary)' }}>
        <button onClick={() => onNavigate('login')} className="hover:underline">
          Déjà un compte ? Se connecter
        </button>
      </div>
    </AuthLayout>
  )
}
