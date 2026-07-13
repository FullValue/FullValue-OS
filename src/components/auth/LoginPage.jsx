import { useState } from 'react'
import { LogIn, UserRound } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import AuthLayout from './AuthLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function LoginPage({ onNavigate }) {
  const { signInAsGuest } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { error: err } = await supabase.auth.signInWithPassword({ email, password })
      if (err) setError(err.message)
    } catch {
      setError('Connexion au serveur impossible. Utilise l’accès invité ci-dessous.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout>
      <h1 className="mb-6 text-center text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
        Connexion
      </h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="login-email">Email</Label>
          <Input
            id="login-email"
            type="email"
            required
            autoComplete="email"
            placeholder="toi@exemple.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
        </div>

        <div>
          <Label htmlFor="login-password">Mot de passe</Label>
          <Input
            id="login-password"
            type="password"
            required
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
        </div>

        {error && (
          <p className="rounded-lg px-3 py-2 text-xs" style={{ background: 'var(--red-bg)', color: 'var(--red-deep)' }}>
            {error}
          </p>
        )}

        <Button type="submit" variant="secondary" size="lg" loading={loading} className="w-full">
          {!loading && <LogIn size={15} />}
          {loading ? 'Connexion…' : 'Se connecter'}
        </Button>
      </form>

      <div className="my-5 flex items-center gap-3">
        <div className="h-px flex-1" style={{ background: 'var(--border-soft)' }} />
        <span className="text-[10px] uppercase tracking-[0.1em]" style={{ color: 'var(--text-tertiary)' }}>ou</span>
        <div className="h-px flex-1" style={{ background: 'var(--border-soft)' }} />
      </div>

      <Button type="button" variant="outline" size="lg" className="w-full" onClick={signInAsGuest}>
        <UserRound size={15} />
        Accéder en invité
      </Button>

      <div className="mt-6 flex items-center justify-between text-sm" style={{ color: 'var(--text-tertiary)' }}>
        <button type="button" onClick={() => onNavigate('forgot')} className="transition-colors hover:text-[var(--text-secondary)]">
          Mot de passe oublié
        </button>
        <button type="button" onClick={() => onNavigate('signup')} className="font-medium transition-colors hover:text-[var(--text-secondary)]">
          Créer un compte
        </button>
      </div>
    </AuthLayout>
  )
}
