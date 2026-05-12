import AuthLayout from './AuthLayout'

export default function CheckEmailPage({ onNavigate }) {
  return (
    <AuthLayout>
      <div className="text-center space-y-4">
        <div className="text-4xl">📬</div>
        <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
          Vérifie ta boîte mail
        </h1>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          On t'a envoyé un lien de confirmation. Clique dessus pour activer ton compte et te connecter.
        </p>
        <button
          onClick={() => onNavigate('login')}
          className="mt-4 text-sm hover:underline"
          style={{ color: 'var(--text-tertiary)' }}
        >
          ← Retour à la connexion
        </button>
      </div>
    </AuthLayout>
  )
}
