// Logique pure de la synchro Supabase : fusion sans perte et choix de la stratégie au chargement.
// Le state complet du store est stocké tel quel dans user_state.state (JSONB).

const DEMO_TASKS = new Set(['t1', 't2', 't3', 't4'])
const DEMO_SESSIONS = new Set(['s1', 's2', 's3'])

// Un navigateur qui n'a jamais servi n'a que les données de démo : inutile de les fusionner.
export function isDemoState(state) {
  return !!state
    && state.tasks.every(t => DEMO_TASKS.has(t.id))
    && state.sessions.every(s => DEMO_SESSIONS.has(s.id))
    && !(state.clients || []).length
    && !(state.inbox || []).length
    && !(state.dailyReviews || []).length
}

function isEntityList(v) {
  return Array.isArray(v) && v.every(x => x && typeof x === 'object' && 'id' in x)
}

function stamp(item) {
  return item.updatedAt || item.completedAt || item.createdAt || ''
}

// Union par id : rien n'est perdu. Pour un même id, l'élément le plus récemment daté gagne,
// et à égalité c'est la version locale (celle que tu avais sous les yeux).
function mergeList(local, remote) {
  const byId = new Map(remote.map(x => [x.id, x]))
  for (const item of local) {
    const other = byId.get(item.id)
    byId.set(item.id, !other || stamp(item) >= stamp(other) ? item : other)
  }
  return [...byId.values()]
}

const TOMBSTONE_DAYS = 90
const NO_DELETIONS = {}

// Appelé après chaque action du store : date les éléments modifiés (updatedAt) et garde une trace
// des suppressions (_deleted : { id: date }), pour qu'une fusion ne ressuscite pas un élément supprimé
// et qu'en cas de conflit la version la plus récente gagne.
export function trackChanges(prev, next, now = new Date().toISOString()) {
  let out = next
  const base = next._deleted || NO_DELETIONS
  let deleted = base
  for (const key of Object.keys(next)) {
    const before = prev[key]
    const after = next[key]
    if (before === after || !isEntityList(before) || !isEntityList(after)) continue
    const beforeById = new Map(before.map(x => [x.id, x]))
    const afterIds = new Set(after.map(x => x.id))
    let touched = false
    const list = after.map(item => {
      const old = beforeById.get(item.id)
      const restored = !old && deleted[item.id]
      if (restored) {
        if (deleted === base) deleted = { ...deleted }
        delete deleted[item.id]
      }
      if ((old && old !== item) || restored) { touched = true; return { ...item, updatedAt: now } }
      return item
    })
    for (const old of before) {
      if (afterIds.has(old.id)) continue
      if (deleted === base) deleted = { ...deleted }
      deleted[old.id] = now
    }
    if (touched) out = { ...out, [key]: list }
  }
  if (deleted !== base) out = { ...out, _deleted: deleted }
  return out
}

// Retire des listes les éléments supprimés depuis leur dernière modification, et oublie les vieilles traces.
function applyDeletions(state, now = new Date()) {
  const limit = new Date(now.getTime() - TOMBSTONE_DAYS * 86400000).toISOString()
  const deleted = Object.fromEntries(Object.entries(state._deleted || {}).filter(([, at]) => at >= limit))
  const out = { ...state, _deleted: deleted }
  for (const [key, value] of Object.entries(state)) {
    if (!isEntityList(value)) continue
    const kept = value.filter(x => !(deleted[x.id] && deleted[x.id] >= stamp(x)))
    if (kept.length !== value.length) out[key] = kept
  }
  // Un élément plus récent que sa trace de suppression a été recréé : la trace n'a plus lieu d'être.
  for (const value of Object.values(out)) {
    if (isEntityList(value)) for (const x of value) delete deleted[x.id]
  }
  return out
}

export function mergeStates(local, remote) {
  return applyDeletions(mergeRaw(local, remote))
}

function mergeRaw(local, remote) {
  const out = { ...remote }
  for (const key of new Set([...Object.keys(local), ...Object.keys(remote)])) {
    const l = local[key]
    const r = remote[key]
    if (r === undefined) out[key] = l
    else if (l === undefined) out[key] = r
    else if (isEntityList(l) && isEntityList(r)) out[key] = mergeList(l, r)
    else if (key === 'prayerLogs') {
      const days = { ...r }
      for (const [date, log] of Object.entries(l || {})) days[date] = { ...(r[date] || {}), ...log }
      out[key] = days
    } else if (key === 'habitLogs') {
      // Union par jour : une habitude cochée sur un appareil reste cochée.
      const days = { ...r }
      for (const [date, ids] of Object.entries(l || {})) days[date] = [...new Set([...(r[date] || []), ...ids])]
      out[key] = days
    } else if (key === 'game') {
      const claims = { ...(r.questClaims || {}) }
      for (const [date, list] of Object.entries(l.questClaims || {})) {
        const ids = new Set((claims[date] || []).map(c => c.id))
        claims[date] = [...(claims[date] || []), ...list.filter(c => !ids.has(c.id))]
      }
      out[key] = { ...r, ...l, questClaims: claims, achievements: { ...(r.achievements || {}), ...(l.achievements || {}) }, bossClaims: { ...(r.bossClaims || {}), ...(l.bossClaims || {}) } }
    } else if (l && r && typeof l === 'object' && !Array.isArray(l)) out[key] = { ...r, ...l }
    else out[key] = l
  }
  return out
}

/**
 * Décide quoi faire au démarrage d'une session connectée.
 *   remote : ligne user_state ou null
 *   meta   : { linked, dirty, lastRemoteAt } mémorisé pour cet utilisateur dans ce navigateur
 * Renvoie { action: 'push' | 'adopt' | 'merge' | 'none' }
 */
export function planInitialSync({ local, remote, meta }) {
  if (!remote) return { action: isDemoState(local) ? 'none' : 'push' }
  const remoteChanged = remote.updated_at !== meta.lastRemoteAt
  if (!meta.linked) return { action: isDemoState(local) ? 'adopt' : 'merge' }
  if (meta.dirty) return { action: remoteChanged ? 'merge' : 'push' }
  return { action: remoteChanged ? 'adopt' : 'none' }
}
