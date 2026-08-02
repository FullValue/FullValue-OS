import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { getAuthErrorMessage } from '@/lib/authErrors'
import AuthLayout from './AuthLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function ForgotPasswordPage({ onNavigate }) {
  const [email, setEmail]   = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent]     = useState(false)
  const [error, setError]   = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      if (err) { setError(getAuthErrorMessage(err)); return }
      setSent(true)
    } catch (err) {
      setError(getAuthErrorMessage(err, 'Connexion au serveur impossible.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout>
      <h1 className="mb-2 text-center text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
        Mot de passe oublié
      </h1>
      <p className="mb-6 text-center text-sm" style={{ color: 'var(--text-tertiary)' }}>
        Saisis ton email et on t'envoie un lien de réinitialisation.
      </p>

      {sent ? (
        <div className="rounded-lg px-4 py-3 text-center text-sm" style={{ background: 'var(--green-bg)', color: 'var(--green-deep)' }}>
          Email envoyé. Vérifie ta boîte de réception.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="forgot-email">Email</Label>
            <Input id="forgot-email" type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} />
          </div>

          {error && (
            <p className="rounded-lg px-3 py-2 text-xs" style={{ background: 'var(--red-bg)', color: 'var(--red-deep)' }}>
              {error}
            </p>
          )}

          <Button type="submit" variant="secondary" size="lg" loading={loading} className="w-full">
            {loading ? 'Envoi…' : 'Envoyer le lien'}
          </Button>
        </form>
      )}

      <div className="mt-6 text-center text-sm" style={{ color: 'var(--text-tertiary)' }}>
        <Button type="button" variant="ghost" size="sm" onClick={() => onNavigate('login')} className="h-auto p-0 text-[var(--text-tertiary)] hover:bg-transparent hover:text-[var(--text-secondary)]">
          ← Retour à la connexion
        </Button>
      </div>
    </AuthLayout>
  )
}
