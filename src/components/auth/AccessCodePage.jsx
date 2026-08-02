import { useState } from 'react'
import { ArrowRight, KeyRound } from 'lucide-react'
import AuthLayout from './AuthLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function AccessCodePage({ onUnlock }) {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')

  function handleSubmit(event) {
    event.preventDefault()
    if (!/^\d{4}$/.test(code)) {
      setError('Entre un code composé de 4 chiffres.')
      return
    }
    if (!onUnlock(code)) {
      setError('Code incorrect.')
      setCode('')
    }
  }

  return (
    <AuthLayout>
      <div className="mb-6 text-center">
        <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--violet-bg)] text-[var(--violet-deep)]">
          <KeyRound size={19} />
        </div>
        <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
          Accès privé
        </h1>
        <p className="mt-2 text-sm" style={{ color: 'var(--text-tertiary)' }}>
          Entre ton code à 4 chiffres pour ouvrir Le Cockpit.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="access-code">Code d’accès</Label>
          <Input
            id="access-code"
            type="password"
            inputMode="numeric"
            pattern="[0-9]{4}"
            maxLength={4}
            autoComplete="one-time-code"
            autoFocus
            value={code}
            onChange={(event) => {
              setCode(event.target.value.replace(/\D/g, '').slice(0, 4))
              setError('')
            }}
            className="text-center font-mono text-lg tracking-[0.45em]"
            aria-describedby={error ? 'access-code-error' : undefined}
          />
        </div>

        {error && (
          <p id="access-code-error" className="rounded-lg px-3 py-2 text-xs" style={{ background: 'var(--red-bg)', color: 'var(--red-deep)' }}>
            {error}
          </p>
        )}

        <Button type="submit" variant="default" size="lg" className="w-full">
          Ouvrir le Cockpit
          <ArrowRight size={15} />
        </Button>
      </form>
    </AuthLayout>
  )
}
