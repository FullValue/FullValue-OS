// Webhook WhatsApp Business : GET = vérification par Meta, POST = messages et statuts.
import { serviceClient } from '../../server/mcp/auth.js'
import { ingestWebhook, resolveOwnerId, verifySignature } from '../../server/whatsapp/core.js'

async function readRaw(req) {
  const chunks = []
  for await (const chunk of req) chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
  return Buffer.concat(chunks)
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const q = req.query || {}
    if (q['hub.mode'] === 'subscribe' && q['hub.verify_token'] && q['hub.verify_token'] === process.env.WHATSAPP_VERIFY_TOKEN) {
      return res.status(200).send(String(q['hub.challenge'] || ''))
    }
    return res.status(403).send('Jeton de vérification invalide.')
  }
  if (req.method !== 'POST') return res.status(405).end()

  const raw = await readRaw(req)
  if (!verifySignature(raw, req.headers['x-hub-signature-256'], process.env.WHATSAPP_APP_SECRET)) {
    return res.status(401).send('Signature invalide.')
  }
  try {
    const db = serviceClient()
    const ownerId = await resolveOwnerId(db)
    await ingestWebhook(JSON.parse(raw.toString('utf8')), db, ownerId)
    return res.status(200).json({ ok: true })
  } catch (err) {
    // 500 : Meta renverra l'événement plus tard, rien n'est perdu.
    return res.status(500).json({ error: err.message })
  }
}
