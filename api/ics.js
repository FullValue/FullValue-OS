// Proxy de lecture pour importer un calendrier public (iCloud, Google, Outlook) : GET /api/ics?url=…
// Le navigateur ne peut pas lire ces flux directement (CORS). Liste blanche d'hôtes pour éviter un proxy ouvert.
const ALLOWED = [/\.icloud\.com$/, /^calendar\.google\.com$/, /^outlook\.(office365|live)\.com$/]
const MAX_BYTES = 3 * 1024 * 1024

export default async function handler(req, res) {
  let url
  try { url = new URL(String(req.query?.url || '').replace(/^webcal:/i, 'https:')) } catch { return res.status(400).send('URL invalide.') }
  if (url.protocol !== 'https:' || !ALLOWED.some(rx => rx.test(url.hostname))) {
    return res.status(400).send('Seuls les calendriers publics iCloud, Google ou Outlook sont acceptés.')
  }
  try {
    const upstream = await fetch(url, { signal: AbortSignal.timeout(10000), redirect: 'follow' })
    if (!upstream.ok) return res.status(502).send(`Le calendrier a répondu ${upstream.status}.`)
    const text = await upstream.text()
    if (text.length > MAX_BYTES) return res.status(413).send('Calendrier trop volumineux.')
    if (!text.includes('BEGIN:VCALENDAR')) return res.status(502).send("Ce lien ne renvoie pas un calendrier.")
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8')
    res.setHeader('Cache-Control', 'private, max-age=300')
    return res.status(200).send(text)
  } catch (err) {
    return res.status(502).send(`Lecture du calendrier impossible : ${err.message}`)
  }
}
