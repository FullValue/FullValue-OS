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

  if (normalized.includes('user already registered')) {
    return 'Un compte existe déjà avec cette adresse email.'
  }

  if (normalized.includes('password should be at least')) {
    return 'Le mot de passe doit contenir au moins 6 caractères.'
  }

  return message || fallback
}

