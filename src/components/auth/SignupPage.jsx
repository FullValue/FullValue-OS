import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import AuthLayout from './AuthLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

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
    try {
      const { error: err } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      })
      if (err) { setError(err.message); return }
      onNavigate('check-email')
    } catch {
      setError('Connexion au serveur impossible. Réessaie plus tard.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout>
      <h1 className="mb-6 text-center text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
        Créer un compte
      </h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="signup-name">Nom complet</Label>
          <Input id="signup-name" type="text" required autoComplete="name" value={fullName} onChange={e => setFullName(e.target.value)} />
        </div>

        <div>
          <Label htmlFor="signup-email">Email</Label>
          <Input id="signup-email" type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} />
        </div>

        <div>
          <Label htmlFor="signup-password">Mot de passe</Label>
          <Input id="signup-password" type="password" required autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} />
        </div>

        <div>
          <Label htmlFor="signup-confirm">Confirmer le mot de passe</Label>
          <Input id="signup-confirm" type="password" required autoComplete="new-password" value={confirm} onChange={e => setConfirm(e.target.value)} />
        </div>

        {error && (
          <p className="rounded-lg px-3 py-2 text-xs" style={{ background: 'var(--red-bg)', color: 'var(--red-deep)' }}>
            {error}
          </p>
        )}

        <Button type="submit" variant="secondary" size="lg" loading={loading} className="w-full">
          {loading ? 'Création…' : 'Créer mon compte'}
        </Button>
      </form>

      <div className="mt-6 text-center text-sm" style={{ color: 'var(--text-tertiary)' }}>
        <Button type="button" variant="ghost" size="sm" onClick={() => onNavigate('login')} className="h-auto p-0 text-[var(--text-tertiary)] hover:bg-transparent hover:text-[var(--text-secondary)]">
          Déjà un compte ? Se connecter
        </Button>
      </div>
    </AuthLayout>
  )
}
