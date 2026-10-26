// Appels du navigateur vers le connecteur serveur /api/etsy (jamais vers Etsy directement).
import { supabase } from '@/lib/supabase'

async function call(params) {
  const { data } = await supabase.auth.getSession()
  const token = data?.session?.access_token
  const res = await fetch(`/api/etsy?${new URLSearchParams(params)}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
  const body = await res.json().catch(() => ({}))
  if (res.status === 404 && !body.error) throw Object.assign(new Error('Connecteur Etsy indisponible en local (fonctions Vercel).'), { disabled: true })
  if (!res.ok) throw Object.assign(new Error(body.error || `Erreur ${res.status}`), body)
  return body
}

// État du connecteur ; en local ou en cas d'erreur : désactivé.
export async function connectorStatus() {
  try {
    return await call({ action: 'status' })
  } catch {
    return { live: false, configured: false, trackingAllowed: false, unreachable: true }
  }
}

export const loadLiveShop = q => call({ action: 'shop', q })
export const searchLiveShops = q => call({ action: 'search', q })
