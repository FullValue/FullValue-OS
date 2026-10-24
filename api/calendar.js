// Flux d'abonnement Apple Calendar : GET /api/calendar?token=…
// Le jeton est généré dans Intégrations et stocké dans l'état synchronisé (settings.calendarFeedToken).
import { serviceClient } from '../server/mcp/auth.js'
import { buildIcs } from '../server/calendar/ics.js'

export default async function handler(req, res) {
  const token = String(req.query?.token || '')
  if (!/^[A-Za-z0-9_-]{24,}$/.test(token)) return res.status(400).send('Jeton manquant ou invalide.')
  let db
  try { db = serviceClient() } catch (err) { return res.status(500).send(err.message) }
  const { data, error } = await db.from('user_state').select('state').eq('state->settings->>calendarFeedToken', token).maybeSingle()
  if (error) return res.status(500).send(error.message)
  if (!data) return res.status(404).send('Calendrier introuvable (jeton révoqué ?).')
  res.setHeader('Content-Type', 'text/calendar; charset=utf-8')
  res.setHeader('Cache-Control', 'private, max-age=300')
  return res.status(200).send(buildIcs(data.state))
}
