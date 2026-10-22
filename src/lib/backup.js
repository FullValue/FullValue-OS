// Sauvegardes locales du store : instantané quotidien (3 derniers jours),
// copie de secours si le state stocké est illisible, export / import JSON.

const SNAPSHOT_PREFIX = 'cockpit_backup_'
const CORRUPT_KEY = 'cockpit_state_corrupt'
const KEEP_SNAPSHOTS = 3

export function localDateStr(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function snapshotKeys() {
  const keys = []
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (k?.startsWith(SNAPSHOT_PREFIX)) keys.push(k)
  }
  return keys.sort().reverse()
}

// Garde une copie du state brut illisible avant qu'il soit écrasé par les valeurs par défaut.
export function keepCorruptCopy(raw) {
  try { localStorage.setItem(CORRUPT_KEY, raw) } catch { /* ignore */ }
}

// Un instantané par jour, au premier enregistrement de la journée.
export function snapshotDaily(state) {
  try {
    const key = SNAPSHOT_PREFIX + localDateStr()
    if (localStorage.getItem(key)) return
    for (const old of snapshotKeys().slice(KEEP_SNAPSHOTS - 1)) localStorage.removeItem(old)
    localStorage.setItem(key, JSON.stringify(state))
  } catch { /* stockage plein : l'instantané est facultatif */ }
}

export function listBackups() {
  try {
    const items = snapshotKeys().map(key => ({ key, label: `Instantané du ${key.slice(SNAPSHOT_PREFIX.length)}`, size: localStorage.getItem(key)?.length || 0 }))
    const corrupt = localStorage.getItem(CORRUPT_KEY)
    if (corrupt) items.push({ key: CORRUPT_KEY, label: 'Données illisibles mises de côté', size: corrupt.length, corrupt: true })
    return items
  } catch {
    return []
  }
}

export function readBackup(key) {
  return parseBackup(localStorage.getItem(key) || '')
}

// Renvoie le state si le texte ressemble à une sauvegarde du Cockpit, sinon lève une erreur lisible.
export function parseBackup(text) {
  let data
  try { data = JSON.parse(text) } catch { throw new Error("Ce fichier n'est pas du JSON valide.") }
  if (!data || !Array.isArray(data.tasks) || !Array.isArray(data.projects)) {
    throw new Error("Ce JSON n'est pas une sauvegarde du Cockpit (tâches ou projets manquants).")
  }
  return data
}

export function downloadBackup(state) {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `cockpit-sauvegarde-${localDateStr()}.json`
  a.click()
  URL.revokeObjectURL(url)
}
