// Met à jour les horaires de prière une fois par jour (et à chaque changement de réglage) quand le mode
// automatique est actif. En cas d'échec (hors ligne…), les derniers horaires restent et on réessaie plus tard.
import { useEffect, useRef } from 'react'
import { useStore } from '@/store/useStore'
import { localDateStr } from '@/lib/backup'
import { fetchPrayerTimes, prayerConfig, prayerFetchKey } from '@/lib/prayerTimes'
import { toast } from '@/lib/toast'

const RETRY_MS = 10 * 60000

export function usePrayerTimesSync() {
  const { state, dispatch } = useStore()
  const settingsRef = useRef(state.settings)
  const busyRef = useRef(false)
  const warnedRef = useRef(null)
  useEffect(() => { settingsRef.current = state.settings })

  const cfg = prayerConfig(state.settings)
  const trigger = `${cfg.enabled}|${prayerFetchKey(cfg, '')}`

  useEffect(() => {
    async function check() {
      const settings = settingsRef.current
      const config = prayerConfig(settings)
      if (!config.enabled || busyRef.current) return
      const now = new Date()
      const key = prayerFetchKey(config, localDateStr(now))
      if (settings?.prayerTimesKey === key) return
      busyRef.current = true
      try {
        const prayerTimes = await fetchPrayerTimes(config, now)
        dispatch({ type: 'UPDATE_SETTINGS', payload: { prayerTimes, prayerTimesKey: key, prayerTimesUpdatedAt: now.toISOString() } })
      } catch (err) {
        // Un seul message par réglage : inutile de le répéter à chaque nouvelle tentative.
        if (warnedRef.current !== key && navigator.onLine !== false) {
          warnedRef.current = key
          toast.error('Horaires de prière non mis à jour', { description: `${err.message} Les derniers horaires connus restent affichés.` })
        }
      } finally {
        busyRef.current = false
      }
    }
    check()
    const id = setInterval(check, RETRY_MS)
    window.addEventListener('online', check)
    return () => { clearInterval(id); window.removeEventListener('online', check) }
  }, [trigger, dispatch])
}
