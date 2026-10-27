// Cron Vercel quotidien (vercel.json) : relevé des boutiques et fiches Etsy suivies de chaque utilisateur.
// Protégé par CRON_SECRET (Vercel envoie « Authorization: Bearer <CRON_SECRET> »). Actif si ETSY_TRACKING_ALLOWED=true.
import { serviceClient } from '../server/mcp/auth.js'
import { etsyStatus, liveClient } from '../server/etsy/service.js'
import { snapshotUser, purgeOld, trackedOf } from '../server/etsy/tracking.js'

export const config = { maxDuration: 300 }

export default async function handler(req, res) {
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers.authorization !== `Bearer ${secret}`) return res.status(401).json({ error: 'Non autorisé.' })
  const st = etsyStatus()
  if (!st.live || !st.configured || !st.trackingAllowed) return res.status(200).json({ skipped: 'Suivi Etsy désactivé.' })
  const db = serviceClient()
  const client = liveClient()
  const { data: users, error } = await db.from('user_state').select('user_id, state')
  if (error) return res.status(500).json({ error: error.message })
  const report = []
  for (const u of users || []) {
    const t = trackedOf(u.state)
    if (!t.shopIds.length && !t.favoriteIds.length) continue
    try {
      const r = await snapshotUser(db, client, u.user_id, u.state)
      report.push(r)
      if (r.stopped) break
    } catch (err) {
      report.push({ error: err.message })
    }
  }
  await purgeOld(db).catch(() => {})
  return res.status(200).json({ ok: true, report, quota: client.quota() })
}
