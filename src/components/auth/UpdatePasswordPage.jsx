import { useState } from 'react'
import { KeyRound } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { getAuthErrorMessage } from '@/lib/authErrors'
import AuthLayout from './AuthLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

// Affiché après un clic sur le lien « mot de passe oublié » reçu par email.
export default function UpdatePasswordPage({ onDone }) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (password.length < 6) { setError('Au moins 6 caractères.'); return }
    if (password !== confirm) { setError('Les mots de passe ne correspondent pas.'); return }
    setLoading(true)
    const { error: err } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (err) setError(getAuthErrorMessage(err))
    else onDone()
  }

  return (
    <AuthLayout>
      <h1 className="mb-2 text-center text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Nouveau mot de passe</h1>
      <p className="mb-6 text-center text-sm" style={{ color: 'var(--text-tertiary)' }}>Choisis le mot de passe de ton compte Cockpit.</p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="new-password">Nouveau mot de passe</Label>
          <Input id="new-password" type="password" required autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="new-password-confirm">Confirmer</Label>
          <Input id="new-password-confirm" type="password" required autoComplete="new-password" value={confirm} onChange={e => setConfirm(e.target.value)} />
        </div>
        {error && <p className="rounded-lg px-3 py-2 text-xs" style={{ background: 'var(--red-bg)', color: 'var(--red-deep)' }}>{error}</p>}
        <Button type="submit" size="lg" loading={loading} className="w-full">
          {!loading && <KeyRound size={15} />} Enregistrer
        </Button>
      </form>
    </AuthLayout>
  )
}
