const NETWORK_ERRORS = [
  'load failed',
  'failed to fetch',
  'fetch failed',
  'networkerror',
  'network request failed',
]

export function getAuthErrorMessage(error, fallback = 'Une erreur est survenue. Réessaie plus tard.') {
  const message = String(error?.message || error || '').trim()
  const normalized = message.toLowerCase()

  if (!message || NETWORK_ERRORS.some((value) => normalized.includes(value))) {
    return 'Le service de connexion est indisponible. Vérifie VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY dans .env.local, puis redémarre l’application.'
  }

  if (normalized.includes('invalid login credentials')) {
    return 'Email ou mot de passe incorrect.'
  }

  if (normalized.includes('email not confirmed')) {
    return 'Confirme ton adresse email avant de te connecter.'
  }

  if (normalized.includes('rate limit') || normalized.includes('over_email_send_rate_limit') || normalized.includes('security purposes')) {
    return 'Trop d’emails envoyés en peu de temps (limite du service d’envoi). Réessaie dans quelques minutes.'
  }

  if (normalized.includes('error sending') || normalized.includes('sending confirmation') || normalized.includes('sending magic link')) {
    return 'L’email n’a pas pu être envoyé par le service de connexion. Réessaie plus tard ou continue en local.'
  }

  if (normalized.includes('user already registered')) {
    return 'Un compte existe déjà avec cette adresse email.'
  }

  if (normalized.includes('password should be at least')) {
    return 'Le mot de passe doit contenir au moins 6 caractères.'
  }

  return message || fallback
}

