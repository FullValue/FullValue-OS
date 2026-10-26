import { useEffect, useState } from 'react'
import { Mail } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { getAuthErrorMessage } from '@/lib/authErrors'
import AuthLayout from './AuthLayout'
import { Button } from '@/components/ui/button'

const RESEND_DELAY = 60

export default function CheckEmailPage({ email, onNavigate }) {
  const [cooldown, setCooldown] = useState(RESEND_DELAY)
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState(null)

  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  async function resend() {
    if (!email) return
    setSending(true)
    setMessage(null)
    try {
      const { error } = await supabase.auth.resend({ type: 'signup', email, options: { emailRedirectTo: window.location.origin } })
      setMessage(error ? { tone: 'error', text: getAuthErrorMessage(error) } : { tone: 'ok', text: 'Email renvoyé.' })
      if (!error) setCooldown(RESEND_DELAY)
    } catch (err) {
      setMessage({ tone: 'error', text: getAuthErrorMessage(err, 'Connexion au serveur impossible.') })
    } finally {
      setSending(false)
    }
  }

  return (
    <AuthLayout>
      <div className="space-y-4 text-center">
        <div className="text-4xl">📬</div>
        <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
          Vérifie ta boîte mail
        </h1>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          On a envoyé un lien de confirmation{email ? <> à <strong>{email}</strong></> : ''}. Clique dessus pour activer ton compte.
        </p>
        <ul className="space-y-1.5 rounded-xl px-4 py-3 text-left text-xs" style={{ background: 'var(--bg-card-soft)', color: 'var(--text-secondary)' }}>
          <li>• Regarde aussi dans <strong>Spam</strong> et <strong>Promotions</strong> (expéditeur Supabase Auth).</li>
          <li>• Ouvre le lien <strong>sur cet appareil, dans ce navigateur</strong> : tes données de l’accès invité y sont, elles seront envoyées dans ton compte à la première connexion.</li>
        </ul>
        {email && (
          <Button variant="outline" className="w-full" onClick={resend} loading={sending} disabled={cooldown > 0 || sending}>
            <Mail size={14} /> {cooldown > 0 ? `Renvoyer l’email (${cooldown} s)` : 'Renvoyer l’email'}
          </Button>
        )}
        {message && (
          <p className="rounded-lg px-3 py-2 text-xs" style={message.tone === 'ok' ? { background: 'var(--green-bg)', color: 'var(--green-deep)' } : { background: 'var(--red-bg)', color: 'var(--red-deep)' }}>
            {message.text}
          </p>
        )}
        <div className="flex justify-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => onNavigate('login')}>← Connexion</Button>
          <Button variant="ghost" size="sm" onClick={() => onNavigate('local')}>Continuer en local</Button>
        </div>
      </div>
    </AuthLayout>
  )
}
