import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import AuthLayout from './AuthLayout'

export default function ForgotPasswordPage({ onNavigate }) {
  const [email, setEmail]   = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent]     = useState(false)
  const [error, setError]   = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    setLoading(false)
    if (err) { setError(err.message); return }
    setSent(true)
  }

  return (
    <AuthLayout>
      <h1 className="text-xl font-semibold mb-2 text-center" style={{ color: 'var(--text-primary)' }}>
        Mot de passe oublié
      </h1>
      <p className="text-sm text-center mb-6" style={{ color: 'var(--text-tertiary)' }}>
        Saisis ton email et on t'envoie un lien de réinitialisation.
      </p>

      {sent ? (
        <div className="rounded-lg px-4 py-3 text-sm text-center" style={{ background: 'var(--green-bg)', color: 'var(--green-deep)' }}>
          Email envoyé ! Vérifie ta boîte de réception.
        </div>
      ) : (
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
            {loading ? 'Envoi…' : 'Envoyer le lien'}
          </button>
        </form>
      )}

      <div className="mt-6 text-center text-sm" style={{ color: 'var(--text-tertiary)' }}>
        <button onClick={() => onNavigate('login')} className="hover:underline">
          ← Retour à la connexion
        </button>
      </div>
    </AuthLayout>
  )
}
