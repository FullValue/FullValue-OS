// WhatsApp Business (API Cloud de Meta) : réception, statuts et envoi de messages.
// Partagé par le webhook, l'envoi depuis le Cockpit et les outils MCP.
import { createHmac, timingSafeEqual } from 'node:crypto'
import { normalizePhone, WINDOW_MS } from '../../src/lib/whatsapp.js'

export { normalizePhone }

const GRAPH = 'https://graph.facebook.com/v21.0'


// Meta signe chaque appel du webhook avec le secret de l'app (en-tête X-Hub-Signature-256).
export function verifySignature(rawBody, header, secret) {
  if (!secret || !header?.startsWith('sha256=')) return false
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex')
  const given = header.slice('sha256='.length)
  return given.length === expected.length && timingSafeEqual(Buffer.from(given), Buffer.from(expected))
}

// Compte Cockpit qui reçoit les messages : celui dont l'email est WHATSAPP_OWNER_EMAIL.
let ownerCache = null
export async function resolveOwnerId(db, email = process.env.WHATSAPP_OWNER_EMAIL) {
  if (ownerCache?.email === email) return ownerCache.id
  if (!email) throw new Error('WHATSAPP_OWNER_EMAIL doit être défini.')
  const { data, error } = await db.auth.admin.listUsers({ perPage: 1000 })
  if (error) throw error
  const user = data.users.find(u => u.email?.toLowerCase() === email.toLowerCase())
  if (!user) throw new Error(`Aucun compte Cockpit pour ${email}.`)
  ownerCache = { email, id: user.id }
  return user.id
}

export function messageBody(m) {
  switch (m.type) {
    case 'text': return m.text?.body || ''
    case 'image': case 'video': case 'document':
      return m[m.type]?.caption || `[${m.type === 'image' ? 'Photo' : m.type === 'video' ? 'Vidéo' : `Document${m.document?.filename ? ` : ${m.document.filename}` : ''}`}]`
    case 'audio': return '[Message vocal]'
    case 'sticker': return '[Sticker]'
    case 'location': return `[Position${m.location?.name ? ` : ${m.location.name}` : ''}]`
    case 'contacts': return '[Contact partagé]'
    case 'button': return m.button?.text || ''
    case 'interactive': return m.interactive?.button_reply?.title || m.interactive?.list_reply?.title || '[Réponse interactive]'
    case 'reaction': return m.reaction?.emoji ? `Réaction ${m.reaction.emoji}` : '[Réaction]'
    default: return `[${m.type}]`
  }
}

// Enregistre les messages entrants et met à jour les statuts des messages sortants.
export async function ingestWebhook(payload, db, ownerId) {
  let received = 0
  for (const entry of payload?.entry || []) {
    for (const change of entry.changes || []) {
      const value = change.value || {}
      const names = Object.fromEntries((value.contacts || []).map(c => [normalizePhone(c.wa_id), c.profile?.name]))
      for (const m of value.messages || []) {
        const phone = normalizePhone(m.from)
        const { error } = await db.from('wa_messages').upsert({
          user_id: ownerId,
          wa_message_id: m.id,
          contact_phone: phone,
          contact_name: names[phone] || null,
          direction: 'in',
          type: m.type,
          body: messageBody(m),
          created_at: new Date(Number(m.timestamp) * 1000).toISOString(),
        }, { onConflict: 'wa_message_id', ignoreDuplicates: true })
        if (error) throw error
        received++
      }
      for (const s of value.statuses || []) {
        await db.from('wa_messages')
          .update({ status: s.status, error: s.errors?.[0]?.title || null })
          .eq('wa_message_id', s.id)
      }
    }
  }
  return received
}

// WhatsApp n'autorise un message libre que dans les 24 h qui suivent le dernier message du client.
export async function lastInboundAt(db, userId, phone) {
  const { data } = await db.from('wa_messages').select('created_at')
    .eq('user_id', userId).eq('contact_phone', phone).eq('direction', 'in')
    .order('created_at', { ascending: false }).limit(1).maybeSingle()
  return data ? new Date(data.created_at) : null
}

export async function sendText({ db, userId, to, text, via = 'app', fetchImpl = fetch, env = process.env, now = new Date() }) {
  const phone = normalizePhone(to)
  if (!phone || !text?.trim()) throw new Error('Destinataire et message requis.')
  if (!env.WHATSAPP_TOKEN || !env.WHATSAPP_PHONE_NUMBER_ID) throw new Error('WHATSAPP_TOKEN et WHATSAPP_PHONE_NUMBER_ID doivent être définis.')
  const last = await lastInboundAt(db, userId, phone)
  if (!last || now - last > WINDOW_MS) {
    throw new Error("Hors de la fenêtre de 24 h : WhatsApp n'autorise qu'un modèle de message validé par Meta tant que le client n'a pas réécrit.")
  }
  const res = await fetchImpl(`${GRAPH}/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.WHATSAPP_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', recipient_type: 'individual', to: phone, type: 'text', text: { body: text.trim(), preview_url: true } }),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error?.message || `WhatsApp a répondu ${res.status}.`)
  const row = {
    user_id: userId, wa_message_id: json.messages?.[0]?.id || null, contact_phone: phone,
    direction: 'out', type: 'text', body: text.trim(), status: 'sent', sent_via: via, created_at: now.toISOString(),
  }
  const { data, error } = await db.from('wa_messages').insert(row).select().single()
  if (error) throw error
  return data
}
