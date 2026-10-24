// Calendriers externes importés (lien public iCloud / Google) : lus via /api/ics,
// mis en cache dans ce navigateur et rafraîchis toutes les 15 minutes.
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useStore } from '@/store/useStore'
import { parseIcs } from '@/lib/ics'

const CACHE_KEY = 'cockpit:ics-cache'
const REFRESH_MS = 15 * 60 * 1000

function readCache() {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}') } catch { return {} }
}

export function useExternalCalendars() {
  const { state } = useStore()
  const sources = useMemo(() => state.settings?.icsImports || [], [state.settings?.icsImports])
  const [cache, setCache] = useState(readCache)

  const refresh = useCallback(async () => {
    const next = { ...readCache() }
    await Promise.all(sources.map(async src => {
      try {
        const res = await fetch(`/api/ics?url=${encodeURIComponent(src.url)}`)
        const text = await res.text()
        if (!res.ok) throw new Error(text || `Erreur ${res.status}`)
        next[src.id] = { fetchedAt: Date.now(), events: parseIcs(text).map(e => ({ ...e, start: e.start.toISOString(), end: e.end.toISOString() })) }
      } catch (err) {
        next[src.id] = { ...(next[src.id] || {}), error: err.message.slice(0, 160) }
      }
    }))
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(next)) } catch { /* ignore */ }
    setCache(next)
  }, [sources])

  const key = sources.map(s => s.url).join('|')
  useEffect(() => {
    if (!key) return
    const first = setTimeout(refresh, 0)
    const t = setInterval(refresh, REFRESH_MS)
    return () => { clearTimeout(first); clearInterval(t) }
  }, [key]) // eslint-disable-line react-hooks/exhaustive-deps

  const events = sources.flatMap(src => (cache[src.id]?.events || []).map(e => ({
    ...e, start: new Date(e.start), end: new Date(e.end), calendar: src.name, color: src.color || '#5BA8E0', sourceId: src.id,
  })))
  return { sources, events, status: cache, refresh }
}
