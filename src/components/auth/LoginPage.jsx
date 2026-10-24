import { useState } from 'react'
import { LogIn, UserRound, Mail } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { getAuthErrorMessage } from '@/lib/authErrors'
import AuthLayout from './AuthLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function LoginPage({ onNavigate }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [linkSent, setLinkSent] = useState(false)

  // Connexion sans mot de passe : un lien envoyé par email (crée le compte s'il n'existe pas).
  async function sendMagicLink() {
    setError('')
    if (!/^\S+@\S+\.\S+$/.test(email)) { setError('Saisis ton email d’abord.'); return }
    setLoading(true)
    try {
      const { error: err } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin } })
      if (err) setError(getAuthErrorMessage(err))
      else setLinkSent(true)
    } catch (err) {
      setError(getAuthErrorMessage(err, 'Connexion au serveur impossible.'))
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { error: err } = await supabase.auth.signInWithPassword({ email, password })
      if (err) setError(getAuthErrorMessage(err))
    } catch (err) {
      setError(getAuthErrorMessage(err, 'Connexion au serveur impossible.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout>
      <h1 className="mb-1 text-center text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
        Connexion
      </h1>
      <p className="mb-6 text-center text-sm" style={{ color: 'var(--text-tertiary)' }}>
        Connecte-toi pour synchroniser ton Cockpit sur tous tes appareils. Tes données locales sont conservées et envoyées dans ton compte.
      </p>

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

        <Button type="submit" size="lg" loading={loading} className="w-full">
          {!loading && <LogIn size={15} />}
          {loading ? 'Connexion…' : 'Se connecter'}
        </Button>
        {linkSent ? (
          <p className="rounded-lg px-3 py-2 text-center text-xs" style={{ background: 'var(--green-bg)', color: 'var(--green-deep)' }}>
            Lien envoyé à {email}. Ouvre-le sur cet appareil pour te connecter.
          </p>
        ) : (
          <Button type="button" variant="ghost" size="sm" className="w-full" onClick={sendMagicLink} disabled={loading}>
            <Mail size={14} /> Mot de passe oublié ? Recevoir un lien de connexion
          </Button>
        )}
      </form>

      <div className="my-5 flex items-center gap-3">
        <div className="h-px flex-1" style={{ background: 'var(--border-soft)' }} />
        <span className="text-[10px] uppercase tracking-[0.1em]" style={{ color: 'var(--text-tertiary)' }}>ou</span>
        <div className="h-px flex-1" style={{ background: 'var(--border-soft)' }} />
      </div>

      <Button type="button" variant="outline" size="lg" className="w-full" onClick={() => onNavigate('local')}>
        <UserRound size={15} />
        Continuer en local (sans synchro)
      </Button>

      <div className="mt-6 flex items-center justify-between text-sm" style={{ color: 'var(--text-tertiary)' }}>
        <Button type="button" variant="ghost" size="sm" onClick={() => onNavigate('forgot')} className="h-auto p-0 text-[var(--text-tertiary)] hover:bg-transparent hover:text-[var(--text-secondary)]">
          Mot de passe oublié
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => onNavigate('signup')} className="h-auto p-0 font-medium text-[var(--text-tertiary)] hover:bg-transparent hover:text-[var(--text-secondary)]">
          Créer un compte
        </Button>
      </div>
    </AuthLayout>
  )
}
