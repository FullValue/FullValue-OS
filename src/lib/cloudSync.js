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

export function mergeStates(local, remote) {
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
  if (!remote) return { action: 'push' }
  const remoteChanged = remote.updated_at !== meta.lastRemoteAt
  if (!meta.linked) return { action: isDemoState(local) ? 'adopt' : 'merge' }
  if (meta.dirty) return { action: remoteChanged ? 'merge' : 'push' }
  return { action: remoteChanged ? 'adopt' : 'none' }
}
