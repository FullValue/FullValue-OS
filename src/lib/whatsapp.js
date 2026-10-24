// Logique WhatsApp partagée entre le navigateur et le serveur (sans dépendance Node).

// WhatsApp n'autorise un message libre que dans les 24 h qui suivent le dernier message du client.
export const WINDOW_MS = 24 * 3600 * 1000

export function normalizePhone(phone) {
  return String(phone || '').replace(/[^\d]/g, '').replace(/^00/, '')
}

// Conversations : dernier message, nombre de non lus et ouverture de la fenêtre de 24 h.
export function summarizeConversations(rows, now = new Date()) {
  const byPhone = new Map()
  for (const m of [...rows].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))) {
    const c = byPhone.get(m.contact_phone) || { contact_phone: m.contact_phone, contact_name: null, last: m, unread: 0, lastInboundAt: null }
    if (!c.contact_name && m.contact_name) c.contact_name = m.contact_name
    if (m.direction === 'in') {
      if (!m.read_at) c.unread++
      if (!c.lastInboundAt) c.lastInboundAt = m.created_at
    }
    byPhone.set(m.contact_phone, c)
  }
  return [...byPhone.values()].map(c => ({
    ...c,
    windowOpen: !!c.lastInboundAt && now - new Date(c.lastInboundAt) < WINDOW_MS,
  }))
}
