// Envoi d'un message WhatsApp depuis le Cockpit : POST { to, text } avec le jeton de session Supabase.
import { serviceClient } from '../../server/mcp/auth.js'
import { resolveOwnerId, sendText } from '../../server/whatsapp/core.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const token = /^Bearer\s+(\S+)$/i.exec(req.headers.authorization || '')?.[1]
  if (!token) return res.status(401).json({ error: 'Connexion requise.' })
  try {
    const db = serviceClient()
    const { data: { user } = {}, error } = await db.auth.getUser(token)
    if (error || !user) return res.status(401).json({ error: 'Session invalide : reconnecte-toi.' })
    if (user.id !== await resolveOwnerId(db)) return res.status(403).json({ error: "Ce compte n'est pas relié au numéro WhatsApp." })
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {}
    const message = await sendText({ db, userId: user.id, to: body.to, text: body.text })
    return res.status(200).json({ message })
  } catch (err) {
    return res.status(400).json({ error: err.message })
  }
}
