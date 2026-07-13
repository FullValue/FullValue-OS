import AuthLayout from './AuthLayout'
import { Button } from '@/components/ui/button'

export default function CheckEmailPage({ onNavigate }) {
  return (
    <AuthLayout>
      <div className="space-y-4 text-center">
        <div className="text-4xl">📬</div>
        <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
          Vérifie ta boîte mail
        </h1>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          On t'a envoyé un lien de confirmation. Clique dessus pour activer ton compte et te connecter.
        </p>
        <Button variant="ghost" size="sm" className="mt-2" onClick={() => onNavigate('login')}>
          ← Retour à la connexion
        </Button>
      </div>
    </AuthLayout>
  )
}
