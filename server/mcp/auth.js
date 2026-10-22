import { createHash, randomBytes } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

export function hashToken(token) {
  return createHash('sha256').update(token).digest('hex')
}

export function generateToken() {
  return `ckpt_${randomBytes(32).toString('base64url')}`
}

export function serviceClient() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY doivent être définis')
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

// Résout l'en-tête Authorization en contexte d'outil, ou null si le jeton est invalide/révoqué.
export async function resolveContext(authorization, db) {
  const match = /^Bearer\s+(\S+)$/i.exec(authorization || '')
  if (!match) return null
  const { data: token } = await db.from('mcp_tokens')
    .select('id, user_id, label')
    .eq('token_hash', hashToken(match[1]))
    .is('revoked_at', null)
    .maybeSingle()
  if (!token) return null
  // Pas d'await : la date de dernière utilisation n'est pas bloquante.
  db.from('mcp_tokens').update({ last_used_at: new Date().toISOString() }).eq('id', token.id).then(() => {}, () => {})
  return { db, userId: token.user_id, actorLabel: token.label }
}
