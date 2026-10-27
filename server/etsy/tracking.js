// Suivi quotidien : relève les compteurs publics des boutiques et fiches suivies dans etsy_snapshots.
// Un relevé par entité et par jour (upsert), conservation 90 jours. Sans relevé, aucune tendance n'est inventée.
const RETENTION_DAYS = 90
const MIN_QUOTA_LEFT = 300 // marge laissée pour l'usage interactif de la journée

const num = v => (typeof v === 'number' && Number.isFinite(v) ? v : null)
const today = () => new Date().toISOString().slice(0, 10)

export function shopRow(userId, raw, at = new Date().toISOString()) {
  return {
    user_id: userId, kind: 'shop', entity_id: raw.shop_id, shop_id: raw.shop_id, day: at.slice(0, 10), at,
    vals: { soldCount: num(raw.transaction_sold_count), favorites: num(raw.num_favorers), reviewCount: num(raw.review_count), activeListings: num(raw.listing_active_count) },
  }
}

export function listingRow(userId, raw, at = new Date().toISOString()) {
  return {
    user_id: userId, kind: 'listing', entity_id: raw.listing_id, shop_id: raw.shop_id ?? null, day: at.slice(0, 10), at,
    vals: { views: num(raw.views), favorites: num(raw.num_favorers), quantity: num(raw.quantity), price: raw.price?.divisor ? raw.price.amount / raw.price.divisor : null, title: raw.title?.slice(0, 140) || null },
  }
}

export async function saveRows(db, rows) {
  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await db.from('etsy_snapshots').upsert(rows.slice(i, i + 500), { onConflict: 'user_id,kind,entity_id,day' })
    if (error) throw new Error(error.message)
  }
}

// Ce que suit un utilisateur : boutiques réelles ajoutées + fiches en favori (même hors de ces boutiques).
export function trackedOf(state) {
  const ws = state?.etsy || {}
  return {
    shopIds: [...new Set((ws.shops || []).filter(s => s.source === 'etsy').map(s => Number(s.id)).filter(Boolean))],
    favoriteIds: [...new Set((ws.favorites || []).map(Number).filter(n => Number.isInteger(n) && n > 100000))],
  }
}

// Relevé d'un utilisateur. Coût : 1 + ⌈fiches/100⌉ appels par boutique, ⌈favoris/100⌉ pour les favoris restants.
export async function snapshotUser(db, client, userId, state) {
  const { shopIds, favoriteIds } = trackedOf(state)
  const rows = []
  const seen = new Set()
  const at = new Date().toISOString()
  let stopped = null
  for (const id of shopIds) {
    const q = client.quota()
    if (q?.remainingToday != null && q.remainingToday < MIN_QUOTA_LEFT) { stopped = 'quota'; break }
    try {
      rows.push(shopRow(userId, await client.getShop(id), at))
      const active = await client.getActiveListings(id, { maxItems: 300 })
      for (const l of active.results) { rows.push(listingRow(userId, l, at)); seen.add(l.listing_id) }
    } catch (err) {
      if (err.code === 'rate_limited') { stopped = 'quota'; break }
    }
  }
  const rest = favoriteIds.filter(id => !seen.has(id))
  if (rest.length && !stopped) {
    try {
      for (const l of await client.getListingsWithImages(rest, '')) if (l.state === 'active' || !l.state) rows.push(listingRow(userId, l, at))
    } catch { /* favoris : relevé partiel */ }
  }
  await saveRows(db, rows)
  return { shops: shopIds.length, listings: rows.filter(r => r.kind === 'listing').length, stopped }
}

export async function purgeOld(db) {
  const limit = new Date(Date.now() - RETENTION_DAYS * 86400e3).toISOString().slice(0, 10)
  await db.from('etsy_snapshots').delete().lt('day', limit)
}

export { today }
