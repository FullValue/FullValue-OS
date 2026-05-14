import { useState, useEffect } from 'react'
import { X, Check } from 'lucide-react'
import { useStore } from '@/store/useStore'

const PRAYER_FIELDS = [
  { key: 'fajr',    label: 'Fajr' },
  { key: 'shuruq',  label: 'Shuruq' },
  { key: 'dhuhr',   label: 'Dhuhr' },
  { key: 'asr',     label: 'Asr' },
  { key: 'maghrib', label: 'Maghrib' },
  { key: 'isha',    label: 'Isha' },
]

export default function PrayerTimesEditor({ isOpen, onClose }) {
  const { state, dispatch } = useStore()
  const [draft, setDraft] = useState(state.settings?.prayerTimes || {})

  useEffect(() => {
    if (isOpen) setDraft(state.settings?.prayerTimes || {})
  }, [isOpen, state.settings])

  useEffect(() => {
    if (!isOpen) return
    const handler = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  if (!isOpen) return null

  function handleSave() {
    dispatch({
      type: 'UPDATE_SETTINGS',
      payload: {
        prayerTimes: draft,
        prayerTimesUpdatedAt: new Date().toISOString(),
      },
    })
    onClose()
  }

  const lastUpdated = state.settings?.prayerTimesUpdatedAt
    ? new Date(state.settings.prayerTimesUpdatedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
    : null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}>

      <div className="rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--c-border)' }}
        onClick={e => e.stopPropagation()}>

        <div className="px-6 pt-6 pb-4 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
              Horaires de prière
            </h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
              Mosquée d'Eragny
              {lastUpdated && <> · MAJ le {lastUpdated}</>}
            </p>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white/60 transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="px-6 pb-6">
          <div className="flex flex-col gap-2">
            {PRAYER_FIELDS.map(f => (
              <div key={f.key} className="flex items-center gap-3 rounded-xl px-3 py-2"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--c-border)' }}>
                <span className="flex-1 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                  {f.label}
                </span>
                <input type="time"
                  value={draft[f.key] || ''}
                  onChange={e => setDraft(d => ({ ...d, [f.key]: e.target.value }))}
                  className="bg-transparent font-mono text-sm focus:outline-none text-right"
                  style={{ color: 'var(--text-primary)' }} />
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 mt-5">
            <button onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-sm transition-colors"
              style={{ color: 'var(--text-tertiary)' }}>
              Annuler
            </button>
            <button onClick={handleSave}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90"
              style={{ background: 'var(--violet-deep)', color: '#fff' }}>
              <Check size={14} /> Enregistrer
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
