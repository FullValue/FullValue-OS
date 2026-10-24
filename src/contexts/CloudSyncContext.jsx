/* eslint-disable react-refresh/only-export-components */
// Synchro du store avec Supabase (table user_state) pour un utilisateur connecté.
// Le localStorage reste la copie de travail : hors ligne, rien n'est perdu, l'envoi reprend au retour.
import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useStore } from '@/store/useStore'
import { useAuth } from '@/contexts/AuthContext'
import { mergeStates, planInitialSync } from '@/lib/cloudSync'
import { toast } from '@/lib/toast'

const PUSH_DELAY = 1200
const BEFORE_SYNC_KEY = 'cockpit_state_before_sync'
const CLIENT_ID = Math.random().toString(36).slice(2, 10)

const CloudSyncContext = createContext({ status: 'local', lastSyncedAt: null, error: null })

function metaKey(userId) {
  return `cockpit:sync-meta:${userId}`
}
function readMeta(userId) {
  try { return { linked: false, dirty: false, lastRemoteAt: null, ...JSON.parse(localStorage.getItem(metaKey(userId)) || '{}') } } catch { return { linked: false, dirty: false, lastRemoteAt: null } }
}
function writeMeta(userId, meta) {
  try { localStorage.setItem(metaKey(userId), JSON.stringify(meta)) } catch { /* ignore */ }
}

export function CloudSyncProvider({ children }) {
  const { session } = useAuth()
  const { state, dispatch } = useStore()
  const userId = session?.user?.id
  const [status, setStatus] = useState(userId ? 'connecting' : 'local')
  const [lastSyncedAt, setLastSyncedAt] = useState(null)
  const [error, setError] = useState(null)

  const readyRef = useRef(false)       // la synchro initiale est faite : on peut envoyer
  const skipNextRef = useRef(false)    // le prochain changement de state vient du serveur
  const stateRef = useRef(state)
  const timerRef = useRef(null)
  useEffect(() => { stateRef.current = state })

  async function push(uid, snapshot = stateRef.current) {
    if (!uid) return
    setStatus('syncing')
    const { data, error: err } = await supabase
      .from('user_state')
      .upsert({ user_id: uid, state: snapshot, client_id: CLIENT_ID, updated_at: new Date().toISOString() })
      .select('updated_at')
      .single()
    if (err) {
      setStatus('offline')
      setError(err.message)
      return
    }
    writeMeta(uid, { linked: true, dirty: false, lastRemoteAt: data.updated_at })
    setError(null)
    setStatus('synced')
    setLastSyncedAt(new Date())
  }

  function adopt(remote, uid) {
    skipNextRef.current = true
    dispatch({ type: 'HYDRATE_STATE', payload: remote.state })
    writeMeta(uid, { linked: true, dirty: false, lastRemoteAt: remote.updated_at })
    setStatus('synced')
    setLastSyncedAt(new Date())
  }

  // Synchro initiale à la connexion
  useEffect(() => {
    readyRef.current = false
    if (!userId) return
    let cancelled = false
    ;(async () => {
      const { data: remote, error: err } = await supabase.from('user_state').select('state, updated_at, client_id').eq('user_id', userId).maybeSingle()
      if (cancelled) return
      if (err) {
        setStatus('offline')
        setError(err.message.includes('user_state') ? "La table user_state n'existe pas : exécute la migration 006." : err.message)
        return
      }
      const meta = readMeta(userId)
      const local = stateRef.current
      const { action } = planInitialSync({ local, remote, meta })
      if (action === 'merge' || action === 'adopt') {
        try { localStorage.setItem(BEFORE_SYNC_KEY, JSON.stringify(local)) } catch { /* ignore */ }
      }
      readyRef.current = true
      if (action === 'push') await push(userId)
      else if (action === 'adopt') adopt(remote, userId)
      else if (action === 'merge') {
        const merged = mergeStates(local, remote.state)
        skipNextRef.current = true
        dispatch({ type: 'HYDRATE_STATE', payload: merged })
        writeMeta(userId, { ...meta, linked: true, dirty: true })
        await push(userId, merged)
        toast.success('Données fusionnées avec ton compte', { description: 'Rien n’a été perdu : une copie de l’état local est gardée dans Données.' })
      } else {
        writeMeta(userId, { ...meta, linked: true })
        setStatus('synced')
        setLastSyncedAt(new Date())
      }
    })()
    return () => { cancelled = true }
  }, [userId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Envoi (différé) de chaque changement local
  useEffect(() => {
    if (!userId || !readyRef.current) return
    if (skipNextRef.current) { skipNextRef.current = false; return }
    writeMeta(userId, { ...readMeta(userId), dirty: true })
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => push(userId), PUSH_DELAY)
    return () => clearTimeout(timerRef.current)
  }, [state, userId])

  // Changements venus d'un autre appareil, en temps réel
  useEffect(() => {
    if (!userId) return
    const channel = supabase
      .channel(`user_state:${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_state', filter: `user_id=eq.${userId}` }, payload => {
        const row = payload.new
        if (!row?.state || row.client_id === CLIENT_ID) return
        if (row.updated_at === readMeta(userId).lastRemoteAt) return
        if (readMeta(userId).dirty) {
          // Des modifs locales pas encore envoyées : on fusionne pour n'en perdre aucune.
          const merged = mergeStates(stateRef.current, row.state)
          skipNextRef.current = true
          dispatch({ type: 'HYDRATE_STATE', payload: merged })
          push(userId, merged)
        } else {
          adopt(row, userId)
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [userId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Retour en ligne : renvoyer ce qui est en attente
  useEffect(() => {
    if (!userId) return
    const onOnline = () => { if (readMeta(userId).dirty) push(userId) }
    window.addEventListener('online', onOnline)
    return () => window.removeEventListener('online', onOnline)
  }, [userId])

  return (
    <CloudSyncContext.Provider value={{ status: userId ? status : 'local', lastSyncedAt, error, syncNow: () => push(userId) }}>
      {children}
    </CloudSyncContext.Provider>
  )
}

export function useCloudSync() {
  return useContext(CloudSyncContext)
}
