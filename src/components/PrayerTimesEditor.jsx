import { useState, useEffect } from 'react'
import { Check } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogBody, DialogFooter } from '@/components/ui/dialog'
import { toast } from '@/lib/toast'

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
    if (isOpen) {
      // Draft state must reset when the dialog opens or settings migrate.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDraft(state.settings?.prayerTimes || {})
    }
  }, [isOpen, state.settings])

  function handleSave() {
    dispatch({
      type: 'UPDATE_SETTINGS',
      payload: {
        prayerTimes: draft,
        prayerTimesUpdatedAt: new Date().toISOString(),
      },
    })
    toast.success('Horaires enregistrés')
    onClose()
  }

  const lastUpdated = state.settings?.prayerTimesUpdatedAt
    ? new Date(state.settings.prayerTimesUpdatedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
    : null

  return (
    <Dialog open={isOpen} onOpenChange={open => { if (!open) onClose() }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Horaires de prière</DialogTitle>
          <DialogDescription>
            Mosquée d'Eragny{lastUpdated && <> · MAJ le {lastUpdated}</>}
          </DialogDescription>
        </DialogHeader>

        <DialogBody>
          <div className="flex flex-col gap-2">
            {PRAYER_FIELDS.map(f => (
              <div key={f.key} className="flex items-center gap-3 rounded-xl px-3 py-2"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--c-border)' }}>
                <span className="flex-1 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                  {f.label}
                </span>
                <Input type="time"
                  value={draft[f.key] || ''}
                  onChange={e => setDraft(d => ({ ...d, [f.key]: e.target.value }))}
                  className="h-8 w-28 font-mono text-right" />
              </div>
            ))}
          </div>

        </DialogBody>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Annuler</Button>
            <Button onClick={handleSave} className="flex-1">
              <Check size={14} /> Enregistrer
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
