// Rappels de rendez-vous : un toast, un son et une notification système avant l'heure (voir reminderMin).
// Chaque rappel n'est donné qu'une fois par créneau, même après un rechargement (cockpit:rdv-reminded).
import { useEffect, useRef } from 'react'
import { useStore } from '@/store/useStore'
import { dueReminders, reminderKey, startOf } from '@/lib/appointments'
import { playSound, notify } from '@/lib/sound'
import { toast } from '@/lib/toast'

const KEY = 'cockpit:rdv-reminded'

function readDone() {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}') } catch { return {} }
}

export default function AppointmentReminders({ onNavigate }) {
  const { state } = useStore()
  const ref = useRef({ state, onNavigate })
  useEffect(() => { ref.current = { state, onNavigate } })

  useEffect(() => {
    function check() {
      const { state: s, onNavigate: go } = ref.current
      const now = new Date()
      const done = readDone()
      const due = dueReminders(s.appointments, now).filter(a => !done[reminderKey(a)])
      if (!due.length) return
      for (const a of due) {
        done[reminderKey(a)] = now.getTime()
        const min = Math.round((startOf(a) - now) / 60000)
        const when = min <= 0 ? 'maintenant' : min < 60 ? `dans ${min} min` : min < 1440 ? `dans ${Math.round(min / 60)} h` : 'demain'
        const body = `${a.time || ''}${a.location ? ` · ${a.location}` : ''}`.trim()
        toast(`Rendez-vous ${when} : ${a.title}`, {
          description: body || undefined,
          duration: 20000,
          action: a.link
            ? { label: 'Rejoindre', onClick: () => window.open(a.link, '_blank', 'noopener') }
            : { label: 'Voir', onClick: () => go('rendez-vous') },
        })
        notify(`Rendez-vous ${when}`, `${a.title}${body ? ` — ${body}` : ''}`)
      }
      playSound('bell', s.settings?.sounds !== false)
      // On oublie les rappels de plus de 3 jours pour ne pas grossir indéfiniment.
      const limit = now.getTime() - 3 * 86400000
      const kept = Object.fromEntries(Object.entries(done).filter(([, at]) => at >= limit))
      try { localStorage.setItem(KEY, JSON.stringify(kept)) } catch { /* ignore */ }
    }
    check()
    const id = setInterval(check, 30000)
    return () => clearInterval(id)
  }, [])

  return null
}
