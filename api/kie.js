// Proxy Kie.ai pour le Studio Créatif. La clé KIE_API_KEY reste côté serveur.
//   POST /api/kie            { model, input }  → crée une génération, renvoie { taskId }
//   GET  /api/kie?taskId=…                      → état de la génération (state, resultUrls, failMsg)
// Accès : session Supabase valide ET email présent dans KIE_ALLOWED_EMAILS (les crédits sont payants).
import { createClient } from '@supabase/supabase-js'

const KIE = 'https://api.kie.ai/api/v1/jobs'

// Modèles autorisés (évite qu'un appel détourné lance un modèle coûteux non prévu).
const MODELS = new Set([
  'google/nano-banana',
  'google/nano-banana-edit',
  'seedream/4.5-text-to-image',
  'kling-2.6/text-to-video',
  'kling-2.6/image-to-video',
  'elevenlabs/text-to-speech-multilingual-v2',
])

async function authorize(req) {
  const token = /^Bearer\s+(\S+)$/i.exec(req.headers.authorization || '')?.[1]
  if (!token) return { status: 401, error: 'Connexion requise.' }
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const anon = process.env.VITE_SUPABASE_ANON_KEY
  if (!url || !anon) return { status: 500, error: 'Supabase non configuré sur le serveur.' }
  const { data: { user } = {}, error } = await createClient(url, anon, { auth: { persistSession: false } }).auth.getUser(token)
  if (error || !user) return { status: 401, error: 'Session invalide : reconnecte-toi.' }
  const allowed = (process.env.KIE_ALLOWED_EMAILS || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
  if (!allowed.includes((user.email || '').toLowerCase())) return { status: 403, error: 'Ce compte n’est pas autorisé à utiliser Kie.ai (KIE_ALLOWED_EMAILS).' }
  return { user }
}

async function kie(path, init = {}) {
  const res = await fetch(`${KIE}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${process.env.KIE_API_KEY}`, 'Content-Type': 'application/json', ...(init.headers || {}) },
  })
  const body = await res.json().catch(() => ({}))
  // Kie répond souvent en HTTP 200 avec un code d'erreur dans le corps.
  if (!res.ok || (body.code && body.code !== 200)) {
    const msg = body.msg || body.message || `Erreur Kie.ai (${res.status})`
    throw Object.assign(new Error(res.status === 402 || body.code === 402 ? 'Crédits Kie.ai insuffisants.' : msg), { status: res.status === 429 || body.code === 429 ? 429 : 400 })
  }
  return body.data
}

export default async function handler(req, res) {
  if (!process.env.KIE_API_KEY) return res.status(500).json({ error: 'KIE_API_KEY manquante sur Vercel.' })
  const auth = await authorize(req)
  if (auth.error) return res.status(auth.status).json({ error: auth.error })
  try {
    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {}
      if (!MODELS.has(body.model)) return res.status(400).json({ error: 'Modèle non autorisé.' })
      if (!body.input || typeof body.input !== 'object') return res.status(400).json({ error: 'Paramètres manquants.' })
      const data = await kie('/createTask', { method: 'POST', body: JSON.stringify({ model: body.model, input: body.input }) })
      return res.status(200).json({ taskId: data?.taskId })
    }
    if (req.method === 'GET') {
      const taskId = String(req.query.taskId || '')
      if (!/^[\w-]{4,120}$/.test(taskId)) return res.status(400).json({ error: 'taskId invalide.' })
      const data = await kie(`/recordInfo?taskId=${encodeURIComponent(taskId)}`)
      let resultUrls = []
      try { resultUrls = JSON.parse(data?.resultJson || '{}').resultUrls || [] } catch { /* pas encore de résultat */ }
      return res.status(200).json({
        state: data?.state, resultUrls, failMsg: data?.failMsg || null,
        progress: data?.progress ?? null, credits: data?.creditsConsumed ?? null,
      })
    }
    return res.status(405).end()
  } catch (err) {
    return res.status(err.status || 400).json({ error: err.message })
  }
}
